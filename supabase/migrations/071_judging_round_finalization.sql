-- =============================================================================
-- 071_judging_round_finalization.sql
--
-- Teach finalize_voting_round() to handle rounds with judge_weight > 0.
--
-- When a round's end_date passes and judge_weight > 0:
--   judge_avg(c)   = AVG across submitted judges of SUM(score × criterion.weight)
--   norm_judges(c) = judge_avg(c) / MAX(judge_avg)
--   norm_votes(c)  = votes(c) / MAX(votes)
--   final(c)       = (jw/100) · norm_judges(c) + ((100-jw)/100) · norm_votes(c)
--
-- Top `contestants_advance` by final → advanced (current_round bumped);
-- bottom → eliminated. Same idempotency / vote-reset / finale handling as
-- before. Pure-vote rounds (judge_weight = 0) keep exactly today's behavior.
--
-- Reuses ensure_round_state() unchanged — the pull-based entry point that
-- runs on public page load and vote submit. So when the Top 10 judging round
-- ends, the very next visitor triggers automatic advance/elimination of the
-- top 5 / bottom 5.
-- =============================================================================

CREATE OR REPLACE FUNCTION finalize_voting_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round            voting_rounds%ROWTYPE;
  v_next_round       voting_rounds%ROWTYPE;
  v_advance_count    INTEGER;
  v_total_active     INTEGER;
  v_snapshot         JSONB;
  v_winner_ids       UUID[];
  v_advanced_ids     UUID[];
  v_eliminated_ids   UUID[];
  v_jw               INTEGER;
  v_max_judge        NUMERIC;
  v_max_votes        BIGINT;
BEGIN
  SELECT * INTO v_round FROM voting_rounds WHERE id = p_round_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'voting_round % not found', p_round_id;
  END IF;

  IF v_round.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already_finalized');
  END IF;

  IF v_round.end_date IS NULL OR v_round.end_date > NOW() THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_yet_ended');
  END IF;

  v_jw            := COALESCE(v_round.judge_weight, 0);
  v_advance_count := COALESCE(v_round.contestants_advance, 0);

  -- Per-contestant judge average (only counts SUBMITTED scores so drafts
  -- never influence the outcome). Weighted by per-criterion weight.
  WITH per_judge AS (
    SELECT
      js.contestant_id,
      js.judge_id,
      SUM(js.score * COALESCE(jc.weight, 1)) AS judge_total
    FROM judge_scores js
    JOIN judging_criteria jc ON jc.id = js.criterion_id
    WHERE js.voting_round_id = p_round_id
      AND js.submitted_at IS NOT NULL
    GROUP BY js.contestant_id, js.judge_id
  ),
  judge_avg AS (
    SELECT contestant_id, AVG(judge_total)::NUMERIC AS avg_total
    FROM per_judge
    GROUP BY contestant_id
  )
  SELECT COALESCE(MAX(avg_total), 0) INTO v_max_judge FROM judge_avg;

  SELECT COALESCE(MAX(votes), 0) INTO v_max_votes
  FROM contestants
  WHERE competition_id = v_round.competition_id
    AND status = 'active';

  -- Single ranked snapshot. Tiebreakers: raw votes desc, then created_at asc.
  WITH per_judge AS (
    SELECT
      js.contestant_id,
      js.judge_id,
      SUM(js.score * COALESCE(jc.weight, 1)) AS judge_total
    FROM judge_scores js
    JOIN judging_criteria jc ON jc.id = js.criterion_id
    WHERE js.voting_round_id = p_round_id
      AND js.submitted_at IS NOT NULL
    GROUP BY js.contestant_id, js.judge_id
  ),
  judge_avg AS (
    SELECT contestant_id, AVG(judge_total)::NUMERIC AS avg_total
    FROM per_judge
    GROUP BY contestant_id
  ),
  scored AS (
    SELECT
      c.id,
      c.votes,
      c.created_at,
      COALESCE(ja.avg_total, 0) AS judge_avg,
      CASE
        WHEN v_jw > 0 THEN
          (v_jw::NUMERIC / 100.0) *
            (CASE WHEN v_max_judge > 0 THEN COALESCE(ja.avg_total, 0) / v_max_judge ELSE 0 END)
          + ((100 - v_jw)::NUMERIC / 100.0) *
            (CASE WHEN v_max_votes > 0 THEN c.votes::NUMERIC / v_max_votes ELSE 0 END)
        ELSE c.votes::NUMERIC
      END AS final_score
    FROM contestants c
    LEFT JOIN judge_avg ja ON ja.contestant_id = c.id
    WHERE c.competition_id = v_round.competition_id
      AND c.status = 'active'
  ),
  ranked AS (
    SELECT
      id, votes, judge_avg, final_score,
      ROW_NUMBER() OVER (
        ORDER BY final_score DESC NULLS LAST, votes DESC NULLS LAST, created_at ASC
      ) AS rank
    FROM scored
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'contestant_id', id,
        'votes', votes,
        'judge_avg', judge_avg,
        'final_score', final_score,
        'judge_weight', v_jw,
        'rank', rank,
        'status', CASE
          WHEN v_round.round_type = 'finale' AND rank <= v_advance_count THEN 'winner'
          WHEN v_round.round_type = 'finale' THEN 'runner_up'
          WHEN rank <= v_advance_count THEN 'advanced'
          ELSE 'eliminated'
        END
      )
      ORDER BY rank
    ),
    COUNT(*)
  INTO v_snapshot, v_total_active
  FROM ranked;

  IF v_snapshot IS NULL THEN
    v_snapshot := '[]'::jsonb;
  END IF;

  IF v_round.round_type = 'finale' THEN
    -- Finale: top N become winners; the rest stay active (no mass elimination).
    SELECT array_agg((elem->>'contestant_id')::uuid)
    INTO v_winner_ids
    FROM jsonb_array_elements(v_snapshot) AS elem
    WHERE elem->>'status' = 'winner';

    IF v_winner_ids IS NOT NULL THEN
      UPDATE contestants
      SET status = 'winner',
          advancement_status = 'winner'
      WHERE id = ANY(v_winner_ids);

      UPDATE competitions
      SET winners = v_winner_ids,
          status = 'completed',
          updated_at = NOW()
      WHERE id = v_round.competition_id;
    END IF;
  ELSE
    -- Voting / judging / resurrection: top N advance, rest eliminated.
    SELECT array_agg((elem->>'contestant_id')::uuid)
    INTO v_advanced_ids
    FROM jsonb_array_elements(v_snapshot) AS elem
    WHERE elem->>'status' = 'advanced';

    SELECT array_agg((elem->>'contestant_id')::uuid)
    INTO v_eliminated_ids
    FROM jsonb_array_elements(v_snapshot) AS elem
    WHERE elem->>'status' = 'eliminated';

    IF v_advanced_ids IS NOT NULL THEN
      UPDATE contestants
      SET advancement_status = 'advanced',
          current_round = v_round.round_order + 1
      WHERE id = ANY(v_advanced_ids);
    END IF;

    IF v_eliminated_ids IS NOT NULL THEN
      UPDATE contestants
      SET status = 'eliminated',
          advancement_status = 'eliminated',
          eliminated_in_round = v_round.round_order
      WHERE id = ANY(v_eliminated_ids);
    END IF;

    -- Vote reset for next round (per-round opt-in). Same behavior as before:
    -- carry-over bonus votes, snapshot pre-reset total, reset paid votes.
    SELECT * INTO v_next_round
    FROM voting_rounds
    WHERE competition_id = v_round.competition_id
      AND round_order = v_round.round_order + 1;

    IF FOUND AND v_next_round.votes_reset_at_start AND v_advanced_ids IS NOT NULL THEN
      UPDATE contestants c
      SET votes_at_round_start = c.votes_at_round_start
            || jsonb_build_object(v_next_round.id::text, c.votes),
          votes = COALESCE((
            SELECT SUM(bvc.votes_awarded)
            FROM bonus_vote_completions bvc
            WHERE bvc.contestant_id = c.id
          ), 0)
      WHERE c.id = ANY(v_advanced_ids);
    END IF;
  END IF;

  UPDATE voting_rounds
  SET finalized_at = NOW(),
      finalized_snapshot = v_snapshot
  WHERE id = p_round_id;

  RETURN jsonb_build_object(
    'finalized', true,
    'round_id', p_round_id,
    'round_type', v_round.round_type,
    'judge_weight', v_jw,
    'total_active', v_total_active,
    'advanced_count', COALESCE(array_length(v_advanced_ids, 1), 0),
    'eliminated_count', COALESCE(array_length(v_eliminated_ids, 1), 0),
    'winner_count', COALESCE(array_length(v_winner_ids, 1), 0)
  );
END;
$$;

COMMENT ON FUNCTION finalize_voting_round(UUID) IS
  'Idempotently finalize a voting round. When judge_weight > 0, ranks by (jw/100)·normalized_judge_avg + ((100-jw)/100)·normalized_votes; otherwise by raw votes. Top contestants_advance get advanced; the rest are eliminated (or named winners for finale rounds). Pull-based via ensure_round_state().';

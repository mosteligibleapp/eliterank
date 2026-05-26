-- =============================================================================
-- 073_judging_hardening.sql
--
-- Three hardening fixes for the judging system:
--
-- 1. Consolidate the duplicate per_judge / judge_avg CTEs in
--    finalize_voting_round() — they were computed twice (once for v_max_judge,
--    once for the ranked snapshot). Single pass, identical semantics.
--
-- 2. Close the "submit and add more later" loophole. The previous INSERT
--    policy on judge_scores only checked ownership, so a submitted judge
--    could go back and INSERT new rows for contestants they "missed."
--    New policy refuses INSERT if any score for this judge+round is already
--    marked submitted.
--
-- 3. Switch judge_scores.criterion_id FK from CASCADE to RESTRICT. Deleting
--    a criterion mid-competition would silently wipe every score for it and
--    rewrite the rankings. With RESTRICT the host gets a clear error.
-- =============================================================================

-- ── 1. Single-pass finalize_voting_round() ──
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
  maxes AS (
    SELECT
      COALESCE((SELECT MAX(avg_total) FROM judge_avg), 0) AS max_judge,
      COALESCE((
        SELECT MAX(c.votes)
        FROM contestants c
        WHERE c.competition_id = v_round.competition_id
          AND c.status = 'active'
      ), 0) AS max_votes
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
            (CASE WHEN m.max_judge > 0 THEN COALESCE(ja.avg_total, 0) / m.max_judge ELSE 0 END)
          + ((100 - v_jw)::NUMERIC / 100.0) *
            (CASE WHEN m.max_votes > 0 THEN c.votes::NUMERIC / m.max_votes ELSE 0 END)
        ELSE c.votes::NUMERIC
      END AS final_score
    FROM contestants c
    LEFT JOIN judge_avg ja ON ja.contestant_id = c.id
    CROSS JOIN maxes m
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
          + COALESCE((
            SELECT SUM(mv.vote_count)
            FROM manual_votes mv
            WHERE mv.contestant_id = c.id
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

-- ── 2. Block INSERT after this judge has already submitted ──
DROP POLICY IF EXISTS "Judges can insert their own scores" ON public.judge_scores;

CREATE POLICY "Judges can insert their own scores" ON public.judge_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM judges j
    WHERE j.id = judge_scores.judge_id
      AND j.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM judge_scores js2
    WHERE js2.judge_id = judge_scores.judge_id
      AND js2.voting_round_id = judge_scores.voting_round_id
      AND js2.submitted_at IS NOT NULL
  )
);

-- ── 3. Switch criterion_id FK from CASCADE to RESTRICT ──
ALTER TABLE public.judge_scores
  DROP CONSTRAINT IF EXISTS judge_scores_criterion_id_fkey;

ALTER TABLE public.judge_scores
  ADD CONSTRAINT judge_scores_criterion_id_fkey
  FOREIGN KEY (criterion_id) REFERENCES public.judging_criteria(id)
  ON DELETE RESTRICT;

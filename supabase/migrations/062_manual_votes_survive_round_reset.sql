-- =============================================================================
-- Manual votes survive round resets (treated like bonus votes)
-- =============================================================================
-- finalize_voting_round() (migration 053) resets contestants.votes at a
-- round boundary to SUM(bonus_vote_completions.votes_awarded) — paid/free
-- votes start fresh, bonus votes carry over. Host-added manual votes should
-- carry over the same way: a manual vote is a host-granted award, not an
-- in-round paid/free vote.
--
-- This redefines finalize_voting_round() so the carry-over total also adds
-- SUM(manual_votes.vote_count). Only the vote-reset clause changes; the rest
-- of the function is identical to migration 053.

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

  -- Judging rounds don't reshape the contestant set via vote totals.
  IF v_round.round_type = 'judging' THEN
    UPDATE voting_rounds
    SET finalized_at = NOW(),
        finalized_snapshot = '[]'::jsonb
    WHERE id = p_round_id;
    RETURN jsonb_build_object('skipped', true, 'reason', 'judging_round');
  END IF;

  v_advance_count := COALESCE(v_round.contestants_advance, 0);

  WITH ranked AS (
    SELECT
      id,
      votes,
      ROW_NUMBER() OVER (ORDER BY votes DESC NULLS LAST, created_at ASC) AS rank
    FROM contestants
    WHERE competition_id = v_round.competition_id
      AND status = 'active'
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'contestant_id', id,
        'votes', votes,
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
    -- Voting / resurrection: top N advance, rest eliminated.
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

    -- Vote reset for next round (per-round opt-in).
    SELECT * INTO v_next_round
    FROM voting_rounds
    WHERE competition_id = v_round.competition_id
      AND round_order = v_round.round_order + 1;

    IF FOUND AND v_next_round.votes_reset_at_start AND v_advanced_ids IS NOT NULL THEN
      -- Snapshot pre-reset total and reset to the bonus-vote + manual-vote
      -- carry-over: paid/free votes start fresh, while bonus votes and
      -- host-added manual votes earned this season persist into the next round.
      UPDATE contestants c
      SET votes_at_round_start = c.votes_at_round_start
            || jsonb_build_object(v_next_round.id::text, c.votes),
          votes = COALESCE((
            SELECT SUM(bvc.votes_awarded)
            FROM bonus_vote_completions bvc
            WHERE bvc.contestant_id = c.id
          ), 0) + COALESCE((
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
    'total_active', v_total_active,
    'advanced_count', COALESCE(array_length(v_advanced_ids, 1), 0),
    'eliminated_count', COALESCE(array_length(v_eliminated_ids, 1), 0),
    'winner_count', COALESCE(array_length(v_winner_ids, 1), 0)
  );
END;
$$;

COMMENT ON FUNCTION finalize_voting_round(UUID) IS
  'Idempotently finalize a voting round: rank active contestants, mark advances/eliminations (or winners for finale), snapshot results, and apply per-round vote resets when configured. Vote resets carry over bonus votes and host-added manual votes.';

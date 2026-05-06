-- =============================================================================
-- Voting round finalization
-- =============================================================================
-- When a voting round's end_date passes, rank active contestants by vote count
-- and:
--   * mark the bottom (total - contestants_advance) as eliminated
--   * mark the top contestants_advance as advanced and bump current_round
--   * snapshot the standings into voting_rounds.finalized_snapshot
--   * if the next round opts in to votes_reset_at_start, store each surviving
--     contestant's pre-reset total in contestants.votes_at_round_start and
--     reset contestants.votes to that contestant's bonus-vote carry-over
--     (sum of bonus_vote_completions.votes_awarded), so paid votes start
--     fresh while earned bonus votes persist into the next round.
--
-- Finale rounds (round_type = 'finale') skip elimination; the top N are marked
-- as winners and written to competitions.winners.
--
-- Transitions are pull-based: ensure_round_state(competition_id) is called by
-- the vote submit and public page load paths. It finalizes any due rounds for
-- the competition and returns the currently active voting round. No cron is
-- required — the same pattern the double-vote-day system uses.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

ALTER TABLE voting_rounds
  DROP CONSTRAINT IF EXISTS voting_rounds_round_type_check;

ALTER TABLE voting_rounds
  ADD CONSTRAINT voting_rounds_round_type_check
    CHECK (round_type IN ('voting', 'judging', 'resurrection', 'finale'));

ALTER TABLE voting_rounds
  ADD COLUMN IF NOT EXISTS tier_label TEXT,
  ADD COLUMN IF NOT EXISTS votes_reset_at_start BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_snapshot JSONB;

ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS votes_at_round_start JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN voting_rounds.tier_label IS
  'Display name shown publicly during this round (e.g. "Top 50", "Quarterfinals"). Falls back to title.';
COMMENT ON COLUMN voting_rounds.votes_reset_at_start IS
  'When true, advancing contestants start the round with votes = 0; pre-reset totals stored in contestants.votes_at_round_start.';
COMMENT ON COLUMN voting_rounds.finalized_at IS
  'Set by finalize_voting_round() once eliminations + snapshot are persisted. Idempotency guard.';
COMMENT ON COLUMN voting_rounds.finalized_snapshot IS
  'JSON array of {contestant_id, votes, rank, status} captured at finalization time.';
COMMENT ON COLUMN contestants.votes_at_round_start IS
  'Map of voting_round_id -> votes carried into that round (populated when votes_reset_at_start = true).';

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Critical: mark every already-ended round as finalized with an empty snapshot
-- so the new cron job does not retroactively eliminate contestants from rounds
-- that ended before this migration ran.

UPDATE voting_rounds
SET tier_label = title
WHERE tier_label IS NULL;

UPDATE voting_rounds
SET finalized_at = COALESCE(end_date, NOW()),
    finalized_snapshot = '[]'::jsonb
WHERE end_date IS NOT NULL
  AND end_date < NOW()
  AND finalized_at IS NULL;

-- ---------------------------------------------------------------------------
-- finalize_voting_round(p_round_id)
-- ---------------------------------------------------------------------------

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
      -- Snapshot pre-reset total and reset to bonus-vote carry-over so paid
      -- votes start fresh while bonus votes earned this season persist.
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
    'total_active', v_total_active,
    'advanced_count', COALESCE(array_length(v_advanced_ids, 1), 0),
    'eliminated_count', COALESCE(array_length(v_eliminated_ids, 1), 0),
    'winner_count', COALESCE(array_length(v_winner_ids, 1), 0)
  );
END;
$$;

COMMENT ON FUNCTION finalize_voting_round(UUID) IS
  'Idempotently finalize a voting round: rank active contestants, mark advances/eliminations (or winners for finale), snapshot results, and apply per-round vote resets when configured.';

-- ---------------------------------------------------------------------------
-- ensure_round_state(p_competition_id)
-- ---------------------------------------------------------------------------
-- Pull-based entry point. Finalizes any due rounds for the competition (so
-- eliminations / advancements / vote resets land lazily on the next user
-- interaction), then returns the currently active voting round. Called by
-- checkActiveVotingRound() at vote submit time and by the public competition
-- page on load.

CREATE OR REPLACE FUNCTION ensure_round_state(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id     UUID;
  v_active       voting_rounds%ROWTYPE;
BEGIN
  IF p_competition_id IS NULL THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  -- Finalize any rounds in this competition whose end_date has passed.
  -- Each call is idempotent and FOR-UPDATE-protected, so concurrent invokers
  -- (e.g. two voters hitting the boundary at once) are safe.
  FOR v_round_id IN
    SELECT id
    FROM voting_rounds
    WHERE competition_id = p_competition_id
      AND end_date < NOW()
      AND finalized_at IS NULL
    ORDER BY end_date ASC
  LOOP
    BEGIN
      PERFORM finalize_voting_round(v_round_id);
    EXCEPTION WHEN OTHERS THEN
      -- Don't let a single bad round wedge the active-round lookup.
      RAISE WARNING 'finalize_voting_round(%) failed: %', v_round_id, SQLERRM;
    END;
  END LOOP;

  -- Return the active voting round, if any.
  SELECT * INTO v_active
  FROM voting_rounds
  WHERE competition_id = p_competition_id
    AND round_type = 'voting'
    AND start_date <= NOW()
    AND end_date > NOW()
  ORDER BY round_order ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', false);
  END IF;

  RETURN jsonb_build_object('active', true, 'round', to_jsonb(v_active));
END;
$$;

COMMENT ON FUNCTION ensure_round_state(UUID) IS
  'Lazy round-transition entry point. Finalizes any due voting rounds for the competition and returns the currently active round. Safe to call from anonymous and authenticated users.';

GRANT EXECUTE ON FUNCTION finalize_voting_round(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_round_state(UUID) TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 079: Make finale rounds votable in ensure_round_state()
-- ─────────────────────────────────────────────────────────────────────────
--
-- Background: ensure_round_state() is the pull-based entry point every vote
-- path hits to (a) finalize any due rounds and (b) return the currently
-- active round so the client knows voting is open. Its active-round lookup
-- (added in migration 053) filtered to `round_type = 'voting'`, which meant
-- that once a competition entered its Final Round (`round_type = 'finale'`)
-- the RPC reported NO active round — so submitFreeVote() and the public page
-- showed "Voting is not currently active" even though the finale window was
-- open and finalize_voting_round() ranks the finale by votes to pick the
-- winner. In other words, voting silently disappeared during the single most
-- important round.
--
-- Fix: treat finale rounds as votable alongside regular voting rounds. Only
-- the active-round SELECT changes; finalization logic is untouched. Judging
-- and resurrection rounds remain non-votable.
-- ─────────────────────────────────────────────────────────────────────────

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

  -- Return the active votable round, if any. Finale rounds collect public
  -- votes too (the winner is ranked by votes), so they count as active for
  -- voting purposes. Judging / resurrection rounds are excluded.
  SELECT * INTO v_active
  FROM voting_rounds
  WHERE competition_id = p_competition_id
    AND round_type IN ('voting', 'finale')
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
  'Lazy round-transition entry point. Finalizes any due rounds for the competition and returns the currently active votable round (voting or finale). Safe to call from anonymous and authenticated users.';

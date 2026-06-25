-- =============================================================================
-- Migration 088: allow 'judges' (judges-only) winner selection
-- =============================================================================
-- selection_criteria previously allowed only 'votes' | 'hybrid'. The create
-- wizard's "How they win" offers judges-only too, so extend the check.
--
-- NOTE: downstream round finalization (finalize_voting_round) should treat
-- 'judges' as 100% judge-weighted (no public-vote contribution). Verify the
-- finalization path handles judges-only before launching such a competition.
-- =============================================================================

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'competitions'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%selection_criteria%';
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE competitions DROP CONSTRAINT ' || quote_ident(c);
  END IF;
END $$;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_selection_criteria_check
  CHECK (selection_criteria IN ('votes', 'hybrid', 'judges'));

-- =============================================================================
-- Migration 091: enforce 18+ on all competitions
-- =============================================================================
-- Every competition is 18+. The flexible eligibility minimum age can never be
-- below 18 (existing NULLs are unaffected). The wizard also blocks < 18.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitions_eligibility_age_min_18_check') THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_eligibility_age_min_18_check
      CHECK (eligibility_age_min IS NULL OR eligibility_age_min >= 18);
  END IF;
END $$;

-- =============================================================================
-- Migration 090: charity percentage
-- =============================================================================
-- The create wizard asks "donating to charity?" and, if yes, what percentage of
-- proceeds. The specific charity name/details are chosen later in the dashboard.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS charity_percentage NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitions_charity_percentage_check') THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_charity_percentage_check
      CHECK (charity_percentage IS NULL OR (charity_percentage >= 0 AND charity_percentage <= 100));
  END IF;
END $$;

COMMENT ON COLUMN competitions.charity_percentage IS
  'Percentage of proceeds the host designates to charity (0-100); charity name/details are set later in the dashboard.';

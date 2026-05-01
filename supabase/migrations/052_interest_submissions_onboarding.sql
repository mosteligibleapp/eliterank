-- =============================================================================
-- Migration 052: Interest submission onboarding fields
-- Adds structured onboarding data captured from prospective hosts and sponsors
-- so the team knows what type of competition they want to launch.
-- All columns are nullable to preserve historical rows.
-- =============================================================================

ALTER TABLE interest_submissions
  ADD COLUMN IF NOT EXISTS competition_type        TEXT,
  ADD COLUMN IF NOT EXISTS target_demographic      TEXT,
  ADD COLUMN IF NOT EXISTS target_city             TEXT,
  ADD COLUMN IF NOT EXISTS target_state            VARCHAR(2),
  ADD COLUMN IF NOT EXISTS expected_contestants    TEXT,
  ADD COLUMN IF NOT EXISTS target_launch_timeframe TEXT,
  ADD COLUMN IF NOT EXISTS budget_range            TEXT,
  ADD COLUMN IF NOT EXISTS has_venue               BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_audience            BOOLEAN,
  ADD COLUMN IF NOT EXISTS goals                   TEXT;

-- Allow 'fan' interest type (already used by the client) and keep existing values.
ALTER TABLE interest_submissions DROP CONSTRAINT IF EXISTS interest_submissions_interest_type_check;
ALTER TABLE interest_submissions
  ADD CONSTRAINT interest_submissions_interest_type_check
  CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging', 'fan'));

COMMENT ON COLUMN interest_submissions.competition_type        IS 'Self-reported category: pageant, talent, athletic, business-awards, fitness, other';
COMMENT ON COLUMN interest_submissions.target_demographic      IS 'Slug from INTEREST_TYPE demographic options (e.g., women-21-39, open)';
COMMENT ON COLUMN interest_submissions.expected_contestants    IS 'Range bucket: under-25, 25-50, 50-100, 100-plus';
COMMENT ON COLUMN interest_submissions.target_launch_timeframe IS 'Range bucket: 1-3-months, 3-6-months, 6-12-months, 12-plus-months';
COMMENT ON COLUMN interest_submissions.budget_range            IS 'Range bucket: under-5k, 5k-25k, 25k-100k, 100k-plus';

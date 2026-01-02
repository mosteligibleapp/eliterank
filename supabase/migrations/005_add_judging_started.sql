-- Add judging_started flag for manual judging phase control
-- When true, the competition enters judging phase regardless of voting_end date
-- This allows hosts/admins to manually start the judging period

ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS judging_started BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN competitions.judging_started IS 'When true, manually starts the judging phase regardless of voting_end date';

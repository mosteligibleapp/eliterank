-- Allow 'fan' interest type (used by the "Get Updates" modal) and
-- store the city captured from the competition context.

ALTER TABLE interest_submissions
  DROP CONSTRAINT IF EXISTS interest_submissions_interest_type_check;

ALTER TABLE interest_submissions
  ADD CONSTRAINT interest_submissions_interest_type_check
  CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging', 'fan'));

ALTER TABLE interest_submissions
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

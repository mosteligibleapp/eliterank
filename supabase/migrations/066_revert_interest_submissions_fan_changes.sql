-- Revert 065_interest_submissions_fan_type_and_city.sql.
-- The "Get Updates" form will be reworked to require account creation
-- so opt-in for nomination notifications lives on the user profile,
-- not as an interest_submissions row.

ALTER TABLE interest_submissions
  DROP CONSTRAINT IF EXISTS interest_submissions_interest_type_check;

ALTER TABLE interest_submissions
  ADD CONSTRAINT interest_submissions_interest_type_check
  CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging'));

ALTER TABLE interest_submissions
  DROP COLUMN IF EXISTS city;

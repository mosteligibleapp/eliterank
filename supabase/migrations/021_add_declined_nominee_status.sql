-- Add 'declined' to the nominees status check constraint
-- so nominees can decline their nomination from the claim flow.
ALTER TABLE nominees DROP CONSTRAINT IF EXISTS nominees_status_check;
ALTER TABLE nominees ADD CONSTRAINT nominees_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'declined'));

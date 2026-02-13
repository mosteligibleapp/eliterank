-- Unified "Build Your Card" flow migration
-- Adds flow_stage tracking so hosts can distinguish formally declined vs abandoned

ALTER TABLE nominees
  ADD COLUMN IF NOT EXISTS flow_stage TEXT DEFAULT NULL;

ALTER TABLE nominees
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL;

COMMENT ON COLUMN nominees.flow_stage IS
  'Tracks progress through Build Your Card flow: photo, details, pitch, password, card. NULL = not started. Used to distinguish abandoned (has flow_stage but no claimed_at) from declined (status=rejected).';

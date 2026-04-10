-- =============================================================================
-- MIGRATION 035: Allow 'admin' in nominees.nominated_by
-- =============================================================================
-- The check constraint only allowed ('self', 'third_party'), but the host
-- dashboard uses 'admin' when adding nominees. This caused all host-added
-- nominee inserts to fail silently.
-- =============================================================================

ALTER TABLE nominees DROP CONSTRAINT IF EXISTS nominees_nominated_by_check;
ALTER TABLE nominees ADD CONSTRAINT nominees_nominated_by_check
  CHECK (nominated_by IN ('self', 'third_party', 'admin'));

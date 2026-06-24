-- =============================================================================
-- Migration 098: public-facing host toggle
-- =============================================================================
-- The competition creator is the host. Whether they're shown publicly as the
-- host is optional (on by default) and controlled on the host Setup page.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS show_public_host BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN competitions.show_public_host IS
  'Whether the competition creator (host) is shown publicly as the host. Optional, on by default; controlled on the host Setup page.';

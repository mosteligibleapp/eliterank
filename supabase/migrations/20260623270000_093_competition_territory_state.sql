-- =============================================================================
-- Migration 093: state-wide territory
-- =============================================================================
-- For state-wide competitions the host picks a US state directly (no anchor
-- city). Stored as the state abbreviation.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS territory_state TEXT;

COMMENT ON COLUMN competitions.territory_state IS
  'For state-wide territory: the US state (abbreviation) the competition covers.';

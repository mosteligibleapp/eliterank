-- =============================================================================
-- MIGRATION 036: Case-insensitive unique constraint on nominees
-- =============================================================================
-- The unique index on (competition_id, email) was case-sensitive, allowing
-- duplicate nominations with different email casing (e.g. "user@gmail.com"
-- and "User@gmail.com"). This caused duplicate nominees showing up in the
-- dashboard for the same person.
-- =============================================================================

DROP INDEX IF EXISTS idx_nominees_unique_per_competition;
CREATE UNIQUE INDEX idx_nominees_unique_per_competition
  ON nominees(competition_id, LOWER(COALESCE(email, phone || name)));

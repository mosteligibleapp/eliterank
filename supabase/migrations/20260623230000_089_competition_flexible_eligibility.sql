-- =============================================================================
-- Migration 089: flexible eligibility (gender + free age range)
-- =============================================================================
-- Hosts set who can enter as gender + an arbitrary age range instead of being
-- limited to the fixed `demographics` buckets. demographic_id still maps to a
-- bucket when one matches exactly; otherwise these columns are the source of
-- truth.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS eligibility_gender TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS eligibility_age_min INTEGER;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS eligibility_age_max INTEGER;

COMMENT ON COLUMN competitions.eligibility_gender IS
  'Free-form eligibility gender (all | male | female | LGBTQ+ | custom); flexible alternative to demographic_id.';

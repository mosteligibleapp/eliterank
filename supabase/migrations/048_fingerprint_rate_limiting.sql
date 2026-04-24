-- =============================================================================
-- Migration: Add browser fingerprint to anonymous vote rate limiting
-- 
-- Prevents same device from voting multiple times with different emails.
-- More effective than IP limiting for shared networks (cafes, offices).
-- =============================================================================

-- Add fingerprint column
ALTER TABLE anonymous_vote_rate_limits 
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Add competition_id to track per-competition limits
ALTER TABLE anonymous_vote_rate_limits 
ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE;

-- Index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_anon_rate_fingerprint 
ON anonymous_vote_rate_limits(fingerprint, created_at DESC)
WHERE fingerprint IS NOT NULL;

-- Index for fingerprint + competition lookups
CREATE INDEX IF NOT EXISTS idx_anon_rate_fingerprint_competition 
ON anonymous_vote_rate_limits(fingerprint, competition_id, created_at DESC)
WHERE fingerprint IS NOT NULL;

COMMENT ON COLUMN anonymous_vote_rate_limits.fingerprint IS 'Browser fingerprint hash from FingerprintJS - blocks same device voting with multiple emails';
COMMENT ON COLUMN anonymous_vote_rate_limits.competition_id IS 'Competition ID - allows 1 free vote per device per competition per day';

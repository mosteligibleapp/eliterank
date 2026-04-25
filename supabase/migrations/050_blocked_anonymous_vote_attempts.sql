-- =============================================================================
-- Migration: Log blocked anonymous vote attempts for diagnostics
--
-- The success path (anonymous_vote_rate_limits) only records votes that
-- went through. When the fingerprint check, IP cap, or voter-id dedup
-- blocks an attempt, we currently leave no trace — which makes it hard
-- to tell whether legitimate voters are being false-positived (the
-- "11 voters said they couldn't vote" question).
--
-- This table is fire-and-forget by the API: rows are inserted from
-- /api/cast-anonymous-vote at every blocking branch using the service
-- role. Failures to log are non-fatal (the user is already getting
-- blocked anyway).
-- =============================================================================

CREATE TABLE IF NOT EXISTS anonymous_vote_blocked_attempts (
  id BIGSERIAL PRIMARY KEY,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  competition_id UUID,
  contestant_id UUID,
  fingerprint TEXT,
  ip_hash TEXT,
  email TEXT
);

-- Recent-activity scans
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_blocked_at
  ON anonymous_vote_blocked_attempts (blocked_at DESC);

-- Reason-bucket counts (the diagnostic query you'll run most often)
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_reason_blocked_at
  ON anonymous_vote_blocked_attempts (reason, blocked_at DESC);

-- Cross-reference a specific fingerprint's block history
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_fingerprint
  ON anonymous_vote_blocked_attempts (fingerprint, blocked_at DESC)
  WHERE fingerprint IS NOT NULL;

-- Lock the table down so it's not auto-exposed via the Supabase REST API.
-- The service role bypasses RLS (so the API can INSERT) and the postgres
-- role bypasses RLS (so the SQL editor can SELECT for diagnostics). No
-- policies = no other role can read or write.
ALTER TABLE anonymous_vote_blocked_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE anonymous_vote_blocked_attempts IS
  'Diagnostic log of anonymous-vote attempts blocked by the API (fingerprint cap, IP cap, voter-id dedup, unique-constraint dedup, round inactive). Successful votes go in anonymous_vote_rate_limits.';
COMMENT ON COLUMN anonymous_vote_blocked_attempts.reason IS
  'Categorical block reason: fingerprint_limit, ip_limit, voter_dedup, unique_constraint, round_inactive';

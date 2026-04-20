-- =============================================================================
-- Migration: Anonymous vote per-IP rate limiting
--
-- Replaces the in-memory Map used by /api/cast-anonymous-vote.js so the limit
-- holds across Vercel serverless instances. Service role key (used by the
-- Vercel route) bypasses RLS; we enable RLS with no policies so the table is
-- inaccessible to anon/authenticated clients.
-- =============================================================================

CREATE TABLE IF NOT EXISTS anonymous_vote_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_rate_ip_time
  ON anonymous_vote_rate_limits(ip_hash, created_at DESC);

ALTER TABLE anonymous_vote_rate_limits ENABLE ROW LEVEL SECURITY;

-- Housekeeping: delete rows older than 48h (double the 24h window). Call
-- from a scheduled edge function or pg_cron if/when enabled. Safe to run
-- manually anytime.
CREATE OR REPLACE FUNCTION cleanup_anonymous_vote_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM anonymous_vote_rate_limits
  WHERE created_at < NOW() - INTERVAL '48 hours';
END;
$$;

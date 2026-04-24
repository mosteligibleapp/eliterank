-- =============================================================================
-- Migration 049: Disk IO optimization indexes
--
-- Adds three indexes that eliminate sequential scans on hot edge-function and
-- vote-throttling paths:
--
--   1. GIN trigram index on profiles.email   -> used by ILIKE lookups in
--      set-nominee-password, repair-nominee-accounts, notify-nominator,
--      send-nomination-invite
--   2. GIN trigram index on nominees.email   -> used by ILIKE lookups in
--      set-nominee-password
--   3. Composite partial index on votes(voter_id, competition_id, created_at)
--      -> used by hasUsedFreeVoteToday / getTodaysVote in src/lib/votes.js
--
-- IMPORTANT: this migration uses CREATE INDEX CONCURRENTLY, which CANNOT run
-- inside a transaction. Apply via Supabase Dashboard -> SQL Editor, NOT via
-- `supabase db push` (which wraps each file in BEGIN/COMMIT). Each CREATE
-- INDEX CONCURRENTLY must be executed as its own statement.
--
-- CONCURRENTLY takes no write locks, so this is safe to run during a live
-- competition. Each GIN trigram index build scans the table once; expect
-- it to take a few seconds to a few minutes depending on row count.
-- =============================================================================

-- Required extension for trigram indexes (already available on Supabase).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. profiles.email trigram index
-- -----------------------------------------------------------------------------
-- Edge functions call `.ilike('email', userInput)` against profiles for
-- auth-recovery and nominee-linking flows. Without this index the planner
-- does a Seq Scan on profiles per call.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_trgm
  ON profiles USING gin (email gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 2. nominees.email trigram index
-- -----------------------------------------------------------------------------
-- set-nominee-password does `.ilike('email', clientEmail)` when the nominee
-- cannot be located by token or id. Seq scans on nominees are growing as the
-- table grows.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nominees_email_trgm
  ON nominees USING gin (email gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3. votes (voter_id, competition_id, created_at DESC) partial
-- -----------------------------------------------------------------------------
-- src/lib/votes.js::hasUsedFreeVoteToday and ::getTodaysVote filter by
-- (voter_id, competition_id) AND created_at within today. The existing
-- idx_votes_voter_competition does not cover the date range, so the planner
-- must fetch all matching rows and filter. This composite covers it end to
-- end.
--
-- Partial on voter_id IS NOT NULL — anonymous votes have no voter_id and are
-- not relevant to the free-vote-per-day check.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_voter_competition_created
  ON votes (voter_id, competition_id, created_at DESC)
  WHERE voter_id IS NOT NULL;

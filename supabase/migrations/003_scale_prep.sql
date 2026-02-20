-- =============================================================================
-- MIGRATION: Scale Preparation
-- Date: 2026-02-20
-- Description: Prepares database for massive scale (100k+ users, millions of votes)
-- =============================================================================

-- =============================================================================
-- 1. ENABLE QUERY MONITORING
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =============================================================================
-- 2. VOTES TABLE - PARTITIONING PREP
-- =============================================================================
-- For now, add indexes. When volume justifies it, migrate to partitioned table.
-- Partition strategy: by month (votes_2026_01, votes_2026_02, etc.)

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_votes_contestant_created 
  ON votes(contestant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_votes_competition_created 
  ON votes(competition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_votes_voter_competition 
  ON votes(voter_id, competition_id) 
  WHERE voter_id IS NOT NULL;

-- Covering index for leaderboard queries (avoids table lookup)
CREATE INDEX IF NOT EXISTS idx_votes_leaderboard 
  ON votes(competition_id, contestant_id, vote_count);

-- =============================================================================
-- 3. LEADERBOARD MATERIALIZED VIEW
-- =============================================================================
-- Refresh this every 30-60 seconds instead of computing live
-- Dramatically reduces load on votes table during high traffic

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard AS
SELECT 
  c.id AS contestant_id,
  c.competition_id,
  c.name,
  c.avatar_url,
  c.slug,
  c.status,
  COALESCE(c.votes, 0) AS votes,
  RANK() OVER (PARTITION BY c.competition_id ORDER BY COALESCE(c.votes, 0) DESC) AS rank,
  LAG(c.votes) OVER (PARTITION BY c.competition_id ORDER BY c.updated_at) AS prev_votes
FROM contestants c
WHERE c.status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_pk 
  ON mv_leaderboard(contestant_id);

CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_competition 
  ON mv_leaderboard(competition_id, rank);

-- Function to refresh leaderboard (call via cron or after vote batches)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. VOTE AGGREGATION TABLE (for real-time counters)
-- =============================================================================
-- Instead of COUNT(*) on votes, maintain pre-aggregated counts
-- Updated via trigger on votes insert

CREATE TABLE IF NOT EXISTS vote_aggregates (
  contestant_id UUID PRIMARY KEY REFERENCES contestants(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  total_votes INTEGER DEFAULT 0,
  votes_today INTEGER DEFAULT 0,
  votes_this_hour INTEGER DEFAULT 0,
  last_vote_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_aggregates_competition 
  ON vote_aggregates(competition_id);

CREATE INDEX IF NOT EXISTS idx_vote_aggregates_today 
  ON vote_aggregates(competition_id, votes_today DESC);

-- Trigger to update aggregates on vote insert
CREATE OR REPLACE FUNCTION update_vote_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vote_aggregates (contestant_id, competition_id, total_votes, votes_today, votes_this_hour, last_vote_at)
  VALUES (NEW.contestant_id, NEW.competition_id, NEW.vote_count, NEW.vote_count, NEW.vote_count, NOW())
  ON CONFLICT (contestant_id) DO UPDATE SET
    total_votes = vote_aggregates.total_votes + NEW.vote_count,
    votes_today = CASE 
      WHEN vote_aggregates.last_vote_at::date = CURRENT_DATE 
      THEN vote_aggregates.votes_today + NEW.vote_count 
      ELSE NEW.vote_count 
    END,
    votes_this_hour = CASE 
      WHEN vote_aggregates.last_vote_at >= NOW() - INTERVAL '1 hour'
      THEN vote_aggregates.votes_this_hour + NEW.vote_count 
      ELSE NEW.vote_count 
    END,
    last_vote_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vote_aggregates ON votes;
CREATE TRIGGER trigger_vote_aggregates
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_aggregates();

-- Reset daily/hourly counters (run via cron)
CREATE OR REPLACE FUNCTION reset_vote_counters()
RETURNS VOID AS $$
BEGIN
  -- Reset hourly counters older than 1 hour
  UPDATE vote_aggregates 
  SET votes_this_hour = 0 
  WHERE last_vote_at < NOW() - INTERVAL '1 hour';
  
  -- Reset daily counters from previous days
  UPDATE vote_aggregates 
  SET votes_today = 0 
  WHERE last_vote_at::date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. COMPETITION ACTIVITY - PARTITIONING PREP
-- =============================================================================
-- Activity logs grow fast, add index for cleanup queries

CREATE INDEX IF NOT EXISTS idx_activity_created 
  ON competition_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_competition_created 
  ON competition_activity(competition_id, created_at DESC);

-- Function to archive old activity (keep last 30 days per competition)
CREATE OR REPLACE FUNCTION archive_old_activity()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM competition_activity 
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. NOTIFICATIONS - CLEANUP & INDEXES
-- =============================================================================
-- Note: notifications table uses read_at (timestamptz) not read (boolean)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON notifications(created_at DESC);

-- Function to cleanup old read notifications (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE read_at IS NOT NULL AND created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. CONTESTANTS - OPTIMIZED INDEXES
-- =============================================================================
-- Covering index for profile cards
CREATE INDEX IF NOT EXISTS idx_contestants_profile_card 
  ON contestants(competition_id, status, votes DESC) 
  INCLUDE (name, avatar_url, slug, rank);

-- =============================================================================
-- 8. NOMINEES - CLAIM FLOW OPTIMIZATION
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nominees_token_status 
  ON nominees(invite_token, status) 
  WHERE status = 'pending';

-- =============================================================================
-- 9. ARCHIVE TABLE FOR COMPLETED COMPETITIONS
-- =============================================================================
-- When competitions complete, move votes here to keep main table small

CREATE TABLE IF NOT EXISTS archived_votes (
  id UUID PRIMARY KEY,
  competition_id UUID NOT NULL,
  contestant_id UUID NOT NULL,
  voter_id UUID,
  voter_email TEXT,
  vote_count INTEGER DEFAULT 1,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_votes_competition 
  ON archived_votes(competition_id);

-- Function to archive completed competition votes
CREATE OR REPLACE FUNCTION archive_competition_votes(p_competition_id UUID)
RETURNS INTEGER AS $$
DECLARE
  moved_count INTEGER;
BEGIN
  -- Only archive if competition is completed
  IF NOT EXISTS (SELECT 1 FROM competitions WHERE id = p_competition_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Competition must be completed before archiving';
  END IF;
  
  -- Move votes to archive
  WITH moved AS (
    DELETE FROM votes 
    WHERE competition_id = p_competition_id
    RETURNING *
  )
  INSERT INTO archived_votes (id, competition_id, contestant_id, voter_id, voter_email, vote_count, amount_paid, payment_intent_id, created_at)
  SELECT id, competition_id, contestant_id, voter_id, voter_email, vote_count, amount_paid, payment_intent_id, created_at
  FROM moved;
  
  GET DIAGNOSTICS moved_count = ROW_COUNT;
  RETURN moved_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. DATABASE STATISTICS
-- =============================================================================
-- View for monitoring database health

CREATE OR REPLACE VIEW db_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM competitions WHERE status = 'live') AS live_competitions,
  (SELECT COUNT(*) FROM contestants WHERE status = 'active') AS active_contestants,
  (SELECT COUNT(*) FROM nominees WHERE status = 'pending') AS pending_nominees,
  (SELECT COUNT(*) FROM votes) AS total_votes,
  (SELECT COUNT(*) FROM votes WHERE created_at >= CURRENT_DATE) AS votes_today,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) AS database_size;

-- =============================================================================
-- 11. RLS FOR NEW TABLES
-- =============================================================================
ALTER TABLE vote_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_votes ENABLE ROW LEVEL SECURITY;

-- Vote aggregates: public read
CREATE POLICY "Vote aggregates are viewable by everyone" 
  ON vote_aggregates FOR SELECT USING (true);

-- Archived votes: admin only
CREATE POLICY "Archived votes admin only" 
  ON archived_votes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 12. CRON JOB SCHEDULING (requires pg_cron extension)
-- =============================================================================
-- Uncomment these after enabling pg_cron in Supabase dashboard

-- SELECT cron.schedule('refresh-leaderboard', '*/1 * * * *', 'SELECT refresh_leaderboard()');
-- SELECT cron.schedule('reset-vote-counters', '0 * * * *', 'SELECT reset_vote_counters()');
-- SELECT cron.schedule('cleanup-activity', '0 3 * * *', 'SELECT archive_old_activity()');
-- SELECT cron.schedule('cleanup-notifications', '0 4 * * *', 'SELECT cleanup_old_notifications()');

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== SCALE PREP MIGRATION COMPLETE ===';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Leaderboard materialized view (mv_leaderboard)';
  RAISE NOTICE '  - Vote aggregates table for real-time counters';
  RAISE NOTICE '  - Archived votes table for completed competitions';
  RAISE NOTICE '  - Optimized indexes for high-volume queries';
  RAISE NOTICE '  - Cleanup functions for activity and notifications';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Enable pg_cron in Supabase Dashboard > Database > Extensions';
  RAISE NOTICE '  2. Uncomment cron schedules at bottom of this migration';
  RAISE NOTICE '  3. Consider read replica for public leaderboards at 10k+ concurrent users';
END $$;

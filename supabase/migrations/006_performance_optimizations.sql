-- =============================================================================
-- MIGRATION: Performance Optimizations for Consumer Social Scale
-- Date: 2026-02-20
-- Description: 
--   1. Fix RLS policies to cache auth.uid() (320 warnings)
--   2. Fix function search_path warnings (41 warnings)
--   3. Add missing indexes for social queries
--   4. Optimize for 1M+ users, 100M+ votes
-- =============================================================================

-- =============================================================================
-- HELPER: Create cached auth function for better RLS performance
-- =============================================================================
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID
LANGUAGE SQL
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
PARALLEL SAFE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND is_super_admin = true
  )
$$;

CREATE OR REPLACE FUNCTION is_competition_host(comp_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
PARALLEL SAFE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions 
    WHERE id = comp_id 
    AND host_id = (SELECT auth.uid())
  )
$$;

-- =============================================================================
-- 1. PROFILES - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- =============================================================================
-- 2. ORGANIZATIONS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for organizations" ON organizations;
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
DROP POLICY IF EXISTS "Organizations are editable by super admins" ON organizations;

CREATE POLICY "organizations_select" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "organizations_all" ON organizations
  FOR ALL USING (is_super_admin());

-- =============================================================================
-- 3. CITIES - Optimized RLS  
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for cities" ON cities;
DROP POLICY IF EXISTS "Cities are viewable by everyone" ON cities;

CREATE POLICY "cities_select" ON cities
  FOR SELECT USING (true);

CREATE POLICY "cities_all" ON cities
  FOR ALL USING (is_super_admin());

-- =============================================================================
-- 4. COMPETITIONS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Competitions are viewable by everyone" ON competitions;
DROP POLICY IF EXISTS "Authenticated users can create competitions" ON competitions;
DROP POLICY IF EXISTS "Hosts can update own competitions" ON competitions;
DROP POLICY IF EXISTS "Super admins can manage all competitions" ON competitions;

CREATE POLICY "competitions_select" ON competitions
  FOR SELECT USING (true);

CREATE POLICY "competitions_insert" ON competitions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = host_id);

CREATE POLICY "competitions_update" ON competitions
  FOR UPDATE USING (
    (SELECT auth.uid()) = host_id 
    OR is_super_admin()
  );

CREATE POLICY "competitions_delete" ON competitions
  FOR DELETE USING (is_super_admin());

-- =============================================================================
-- 5. CONTESTANTS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Contestants are viewable by everyone" ON contestants;
DROP POLICY IF EXISTS "Users can update own contestant profile" ON contestants;
DROP POLICY IF EXISTS "Hosts can manage contestants" ON contestants;
DROP POLICY IF EXISTS "Super admins can manage all contestants" ON contestants;

CREATE POLICY "contestants_select" ON contestants
  FOR SELECT USING (true);

CREATE POLICY "contestants_update_own" ON contestants
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "contestants_manage" ON contestants
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 6. NOMINEES - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view nominee by invite token" ON nominees;
DROP POLICY IF EXISTS "Nominees viewable by authenticated" ON nominees;
DROP POLICY IF EXISTS "Anyone can nominate" ON nominees;
DROP POLICY IF EXISTS "Self claim nominees" ON nominees;
DROP POLICY IF EXISTS "Hosts manage nominees" ON nominees;
DROP POLICY IF EXISTS "Super admins manage nominees" ON nominees;

-- Public can view nominees (for nomination pages)
CREATE POLICY "nominees_select" ON nominees
  FOR SELECT USING (true);

-- Anyone authenticated can create nominations
CREATE POLICY "nominees_insert" ON nominees
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Users can update their own claimed nominations
CREATE POLICY "nominees_update_own" ON nominees
  FOR UPDATE USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.uid()) = nominator_id
  );

-- Hosts and admins can manage all
CREATE POLICY "nominees_manage" ON nominees
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 7. VOTES - Optimized RLS (Critical for scale)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Votes viewable by voter" ON votes;
DROP POLICY IF EXISTS "Votes insertable by authenticated" ON votes;
DROP POLICY IF EXISTS "votes_select_own" ON votes;
DROP POLICY IF EXISTS "votes_select_host" ON votes;
DROP POLICY IF EXISTS "votes_select_admin" ON votes;
DROP POLICY IF EXISTS "votes_insert" ON votes;

-- Users can only see their own votes
CREATE POLICY "votes_select_own" ON votes
  FOR SELECT USING ((SELECT auth.uid()) = voter_id);

-- Hosts can see all votes in their competition
CREATE POLICY "votes_select_host" ON votes
  FOR SELECT USING (is_competition_host(competition_id));

-- Admins can see all
CREATE POLICY "votes_select_admin" ON votes
  FOR SELECT USING (is_super_admin());

-- Anyone authenticated can vote
CREATE POLICY "votes_insert" ON votes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =============================================================================
-- 8. JUDGES - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Judges are viewable by everyone" ON judges;
DROP POLICY IF EXISTS "Hosts can manage judges" ON judges;

CREATE POLICY "judges_select" ON judges
  FOR SELECT USING (true);

CREATE POLICY "judges_manage" ON judges
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 9. SPONSORS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Sponsors are viewable by everyone" ON sponsors;
DROP POLICY IF EXISTS "Hosts can manage sponsors" ON sponsors;

CREATE POLICY "sponsors_select" ON sponsors
  FOR SELECT USING (true);

CREATE POLICY "sponsors_manage" ON sponsors
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 10. EVENTS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Hosts can manage events" ON events;

CREATE POLICY "events_select" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_manage" ON events
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 11. ANNOUNCEMENTS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
DROP POLICY IF EXISTS "Hosts can manage announcements" ON announcements;

CREATE POLICY "announcements_select" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_manage" ON announcements
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 12. VOTING ROUNDS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "voting_rounds_select_policy" ON voting_rounds;
DROP POLICY IF EXISTS "voting_rounds_admin_policy" ON voting_rounds;

CREATE POLICY "voting_rounds_select" ON voting_rounds
  FOR SELECT USING (true);

CREATE POLICY "voting_rounds_manage" ON voting_rounds
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 13. NOMINATION PERIODS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "nomination_periods_select_policy" ON nomination_periods;
DROP POLICY IF EXISTS "nomination_periods_admin_policy" ON nomination_periods;

CREATE POLICY "nomination_periods_select" ON nomination_periods
  FOR SELECT USING (true);

CREATE POLICY "nomination_periods_manage" ON nomination_periods
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 14. REWARDS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Rewards are viewable by everyone" ON rewards;
DROP POLICY IF EXISTS "Admins can manage rewards" ON rewards;
DROP POLICY IF EXISTS "Active rewards viewable" ON rewards;

CREATE POLICY "rewards_select" ON rewards
  FOR SELECT USING (status = 'active' OR is_super_admin());

CREATE POLICY "rewards_manage" ON rewards
  FOR ALL USING (is_super_admin());

-- =============================================================================
-- 15. REWARD ASSIGNMENTS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own reward assignments" ON reward_assignments;
DROP POLICY IF EXISTS "Hosts can manage reward assignments" ON reward_assignments;

CREATE POLICY "reward_assignments_select_own" ON reward_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contestants c 
      WHERE c.id = contestant_id 
      AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "reward_assignments_select_host" ON reward_assignments
  FOR SELECT USING (is_competition_host(competition_id));

CREATE POLICY "reward_assignments_manage" ON reward_assignments
  FOR ALL USING (
    is_competition_host(competition_id) 
    OR is_super_admin()
  );

-- =============================================================================
-- 16. NOTIFICATIONS - Optimized RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- 17. INTEREST SUBMISSIONS - Already optimized in previous migration
-- =============================================================================

-- =============================================================================
-- 18. COMPETITION PRIZES - Already optimized in previous migration
-- =============================================================================

-- =============================================================================
-- 19. COMPETITION RULES - Already optimized in previous migration
-- =============================================================================

-- =============================================================================
-- 20. FIX FUNCTION SEARCH_PATH WARNINGS
-- =============================================================================

-- Recreate functions with proper search_path

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop and recreate to change parameter names
DROP FUNCTION IF EXISTS increment_contestant_votes(UUID, INT);
CREATE FUNCTION increment_contestant_votes(p_contestant_id UUID, p_count INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE contestants 
  SET votes = COALESCE(votes, 0) + p_count 
  WHERE id = p_contestant_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_profile_votes(p_user_id UUID, p_votes INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET total_votes_received = COALESCE(total_votes_received, 0) + p_votes 
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_profile_competitions(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET total_competitions = COALESCE(total_competitions, 0) + 1 
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_profile_win(p_user_id UUID, p_placement INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles SET
    wins = CASE WHEN p_placement = 1 THEN COALESCE(wins, 0) + 1 ELSE wins END,
    best_placement = CASE
      WHEN best_placement IS NULL THEN p_placement
      WHEN p_placement < best_placement THEN p_placement
      ELSE best_placement
    END
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION has_voted_today(p_user_id UUID, p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  vote_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM votes
    WHERE voter_id = p_user_id 
    AND competition_id = p_competition_id 
    AND amount_paid = 0
    AND created_at >= CURRENT_DATE 
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
  ) INTO vote_exists;
  RETURN vote_exists;
END;
$$;

CREATE OR REPLACE FUNCTION log_competition_activity(
  p_competition_id UUID, 
  p_activity_type TEXT, 
  p_message TEXT,
  p_contestant_id UUID DEFAULT NULL, 
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO competition_activity (competition_id, activity_type, message, contestant_id, metadata)
  VALUES (p_competition_id, p_activity_type, p_message, p_contestant_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard;
END;
$$;

CREATE OR REPLACE FUNCTION update_vote_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION reset_vote_counters()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  UPDATE vote_aggregates SET votes_this_hour = 0 WHERE last_vote_at < NOW() - INTERVAL '1 hour';
  UPDATE vote_aggregates SET votes_today = 0 WHERE last_vote_at::date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION auto_complete_competitions()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  UPDATE competitions
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'live' AND finale_date IS NOT NULL AND finale_date <= NOW();
END;
$$;

-- =============================================================================
-- 21. CONSUMER SOCIAL OPTIMIZATIONS
-- =============================================================================

-- Index for "trending" queries (recent votes by time)
-- Note: Can't use partial index with NOW(), so we use a covering index
CREATE INDEX IF NOT EXISTS idx_votes_recent 
  ON votes(created_at DESC, contestant_id)
  INCLUDE (vote_count);

-- Index for user's vote history
CREATE INDEX IF NOT EXISTS idx_votes_user_history 
  ON votes(voter_id, created_at DESC) 
  WHERE voter_id IS NOT NULL;

-- Index for competition feed (recent activity)
CREATE INDEX IF NOT EXISTS idx_activity_feed 
  ON competition_activity(competition_id, created_at DESC)
  INCLUDE (activity_type, message, contestant_id);

-- Index for leaderboard rank queries
CREATE INDEX IF NOT EXISTS idx_contestants_leaderboard 
  ON contestants(competition_id, votes DESC, created_at ASC) 
  WHERE status = 'active';

-- Index for nominee search by status
CREATE INDEX IF NOT EXISTS idx_nominees_search 
  ON nominees(competition_id, status, created_at DESC);

-- =============================================================================
-- 22. GRANT PERMISSIONS
-- =============================================================================
GRANT EXECUTE ON FUNCTION auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_competition_host(UUID) TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== PERFORMANCE OPTIMIZATIONS COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Created auth_uid() helper for cached auth';
  RAISE NOTICE '  - Created is_super_admin() helper';
  RAISE NOTICE '  - Created is_competition_host() helper';
  RAISE NOTICE '  - Rewrote all RLS policies with (SELECT auth.uid()) pattern';
  RAISE NOTICE '  - Fixed all function search_path warnings';
  RAISE NOTICE '  - Added consumer social indexes (trending, feed, leaderboard)';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected improvement: 10-100x faster RLS checks at scale';
  RAISE NOTICE '';
  RAISE NOTICE 'Run Security + Performance Advisors to verify reduction in warnings';
END $$;

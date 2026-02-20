-- =============================================================================
-- MIGRATION: Security Fixes
-- Date: 2026-02-20
-- Description: Fix security advisor errors (RLS + Security Definer views)
-- =============================================================================

-- =============================================================================
-- 1. ENABLE RLS ON TABLES MISSING IT
-- =============================================================================

-- interest_submissions
ALTER TABLE interest_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interest submissions are viewable by admins" ON interest_submissions;
DROP POLICY IF EXISTS "Anyone can submit interest" ON interest_submissions;

CREATE POLICY "Interest submissions are viewable by admins" ON interest_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.id = interest_submissions.competition_id AND c.host_id = auth.uid())
  );

CREATE POLICY "Anyone can submit interest" ON interest_submissions
  FOR INSERT WITH CHECK (true);

-- competition_prizes
ALTER TABLE competition_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prizes are viewable by everyone" ON competition_prizes;
DROP POLICY IF EXISTS "Hosts can manage prizes" ON competition_prizes;

CREATE POLICY "Prizes are viewable by everyone" ON competition_prizes
  FOR SELECT USING (true);

CREATE POLICY "Hosts and admins can manage prizes" ON competition_prizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.id = competition_prizes.competition_id AND c.host_id = auth.uid())
  );

-- competition_rules
ALTER TABLE competition_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rules are viewable by everyone" ON competition_rules;
DROP POLICY IF EXISTS "Hosts can manage rules" ON competition_rules;

CREATE POLICY "Rules are viewable by everyone" ON competition_rules
  FOR SELECT USING (true);

CREATE POLICY "Hosts and admins can manage rules" ON competition_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.id = competition_rules.competition_id AND c.host_id = auth.uid())
  );

-- manual_votes
ALTER TABLE manual_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manual votes viewable by admins" ON manual_votes;
DROP POLICY IF EXISTS "Admins can manage manual votes" ON manual_votes;

CREATE POLICY "Manual votes viewable by admins and hosts" ON manual_votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.id = manual_votes.competition_id AND c.host_id = auth.uid())
  );

CREATE POLICY "Admins and hosts can manage manual votes" ON manual_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.id = manual_votes.competition_id AND c.host_id = auth.uid())
  );

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Super admins can manage categories" ON categories;

CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- demographics
ALTER TABLE demographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demographics are viewable by everyone" ON demographics;
DROP POLICY IF EXISTS "Super admins can manage demographics" ON demographics;

CREATE POLICY "Demographics are viewable by everyone" ON demographics
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage demographics" ON demographics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- =============================================================================
-- 2. FIX SECURITY DEFINER VIEWS
-- =============================================================================
-- Recreate views with SECURITY INVOKER (respects RLS of querying user)

-- competition_with_timing
DROP VIEW IF EXISTS competition_with_timing;
CREATE VIEW competition_with_timing 
WITH (security_invoker = true)
AS
SELECT
    c.*,
    (SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id) as first_nomination_start,
    (SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id) as last_nomination_end,
    (SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as first_voting_start,
    (SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as last_voting_end,
    COALESCE(
        (SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id),
        c.nomination_start
    ) as effective_nomination_start,
    COALESCE(
        (SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id),
        c.nomination_end
    ) as effective_nomination_end,
    COALESCE(
        (SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'),
        c.voting_start
    ) as effective_voting_start,
    COALESCE(
        (SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'),
        c.voting_end
    ) as effective_voting_end
FROM competitions c;

-- db_stats (admin only view - recreate with security invoker)
DROP VIEW IF EXISTS db_stats;
CREATE VIEW db_stats
WITH (security_invoker = true)
AS
SELECT 
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM competitions WHERE status = 'live') AS live_competitions,
  (SELECT COUNT(*) FROM contestants WHERE status = 'active') AS active_contestants,
  (SELECT COUNT(*) FROM nominees WHERE status = 'pending') AS pending_nominees,
  (SELECT COUNT(*) FROM votes) AS total_votes,
  (SELECT COUNT(*) FROM votes WHERE created_at >= CURRENT_DATE) AS votes_today,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) AS database_size;

-- judges_with_profiles
DROP VIEW IF EXISTS judges_with_profiles;
CREATE VIEW judges_with_profiles
WITH (security_invoker = true)
AS
SELECT 
  j.*,
  p.first_name as profile_first_name,
  p.last_name as profile_last_name,
  p.avatar_url as profile_avatar_url,
  p.bio as profile_bio
FROM judges j
LEFT JOIN profiles p ON j.user_id = p.id;

-- contestants_with_profiles  
DROP VIEW IF EXISTS contestants_with_profiles;
CREATE VIEW contestants_with_profiles
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  p.first_name as profile_first_name,
  p.last_name as profile_last_name,
  p.avatar_url as profile_avatar_url,
  p.bio as profile_bio,
  p.instagram as profile_instagram,
  p.total_votes_received as lifetime_votes,
  p.total_competitions as lifetime_competitions,
  p.wins as lifetime_wins
FROM contestants c
LEFT JOIN profiles p ON c.user_id = p.id;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  rls_disabled_count INTEGER;
BEGIN
  -- Count tables without RLS in public schema
  SELECT COUNT(*) INTO rls_disabled_count
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = false
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'mv_%';  -- Exclude materialized views
  
  RAISE NOTICE '=== SECURITY FIXES COMPLETE ===';
  RAISE NOTICE 'Tables without RLS remaining: %', rls_disabled_count;
  RAISE NOTICE 'Views recreated with SECURITY INVOKER: 4';
  RAISE NOTICE '';
  RAISE NOTICE 'Rerun the Security Advisor in Supabase Dashboard to verify';
END $$;

-- =============================================================================
-- MIGRATION: Cleanup Duplicate & Unused Indexes
-- Date: 2026-02-20
-- Description: Remove duplicate indexes, keep the most useful ones
-- =============================================================================

-- =============================================================================
-- 1. REMOVE DUPLICATE INDEXES
-- =============================================================================

-- contestants: keep idx_contestants_user, drop idx_contestants_user_id
DROP INDEX IF EXISTS idx_contestants_user_id;

-- contestants: keep idx_contestants_competition_id, drop idx_contestants_competition
DROP INDEX IF EXISTS idx_contestants_competition;

-- competitions: keep idx_competitions_host, drop idx_competitions_host_id
DROP INDEX IF EXISTS idx_competitions_host_id;

-- nominees: keep idx_nominees_competition_id, drop idx_nominees_competition
DROP INDEX IF EXISTS idx_nominees_competition;

-- voting_rounds: keep idx_voting_rounds_competition, drop duplicates
DROP INDEX IF EXISTS idx_voting_rounds_competition_id;
DROP INDEX IF EXISTS idx_voting_rounds_comp;

-- organizations: keep organizations_slug_key (unique), drop idx_organizations_slug
DROP INDEX IF EXISTS idx_organizations_slug;

-- =============================================================================
-- 2. REMOVE INDEXES FOR UNUSED FEATURES (can recreate later if needed)
-- =============================================================================

-- These are for features not yet in use - safe to drop and recreate when needed
DROP INDEX IF EXISTS idx_nominees_token_status;  -- claim flow not active
DROP INDEX IF EXISTS idx_nominees_pending;       -- covered by idx_nominees_status
DROP INDEX IF EXISTS idx_nominees_claimed_at;    -- no claims yet
DROP INDEX IF EXISTS idx_nominees_invite_token;  -- covered by unique index

DROP INDEX IF EXISTS idx_rewards_status;         -- 1 reward, not needed
DROP INDEX IF EXISTS idx_reward_assignments_status;  -- 2 assignments, not needed
DROP INDEX IF EXISTS idx_reward_competition_assignments_reward_id;  -- low volume

DROP INDEX IF EXISTS idx_activity_type;          -- 0 rows
DROP INDEX IF EXISTS idx_activity_created;       -- 0 rows, covered by competition_created

DROP INDEX IF EXISTS idx_notifications_competition;  -- 1 notification
DROP INDEX IF EXISTS idx_notifications_created;      -- covered by user_created

DROP INDEX IF EXISTS idx_categories_active;      -- 4 categories, full scan faster
DROP INDEX IF EXISTS idx_demographics_active;    -- 7 demographics, full scan faster

DROP INDEX IF EXISTS idx_cities_state;           -- 2 cities, not useful yet
-- Note: cities_slug_key is tied to unique constraint, cannot drop

DROP INDEX IF EXISTS idx_interest_submissions_type;  -- 0 rows

-- =============================================================================
-- 3. NOTE: Unique constraint indexes cannot be dropped
-- =============================================================================
-- competitions_org_slug_unique and idx_competitions_slug are tied to constraints

-- =============================================================================
-- 4. VACUUM ANALYZE (reclaim space and update statistics)
-- =============================================================================
-- Note: This runs automatically but we can hint the planner

ANALYZE competitions;
ANALYZE contestants;
ANALYZE nominees;
ANALYZE profiles;
ANALYZE votes;
ANALYZE voting_rounds;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE schemaname = 'public';
  
  RAISE NOTICE '=== INDEX CLEANUP COMPLETE ===';
  RAISE NOTICE 'Remaining indexes in public schema: %', idx_count;
  RAISE NOTICE 'Dropped ~20 duplicate/unused indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Run "supabase inspect db index-stats" to verify';
END $$;

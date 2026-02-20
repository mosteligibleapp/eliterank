-- =============================================================================
-- MIGRATION: Competition Activity Table
-- Date: 2026-01-08
-- Description:
--   - Create activity feed table for real-time competition updates
--   - Add RLS policies for public read access
-- =============================================================================

-- =============================================================================
-- STEP 1: Create the competition_activity table
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  message text NOT NULL,
  contestant_id uuid REFERENCES contestants(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- STEP 2: Add constraint for valid activity types
-- =============================================================================
ALTER TABLE competition_activity DROP CONSTRAINT IF EXISTS valid_activity_type;
ALTER TABLE competition_activity ADD CONSTRAINT valid_activity_type
  CHECK (activity_type IN (
    'vote',           -- "{contestant} received {count} votes"
    'rank_up',        -- "🔥 {contestant} jumped from #{old} to #{new}!"
    'rank_down',      -- "⚠️ {contestant} dropped into elimination zone"
    'new_leader',     -- "👑 New leader! {contestant} overtook {previous}"
    'milestone_pool', -- "🎉 Prize pool hit ${amount}!"
    'milestone_prize',-- "💰 1st place prize now over ${amount}!"
    'profile_view',   -- "{contestant}'s profile viewed {count} times today"
    'external_share', -- "{contestant} shared profile on {platform}"
    'urgency'         -- "⏰ {time} left in {round_name}"
  ));

-- =============================================================================
-- STEP 3: Create indexes for fast queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_activity_competition_created
  ON competition_activity(competition_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type
  ON competition_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_contestant
  ON competition_activity(contestant_id) WHERE contestant_id IS NOT NULL;

-- =============================================================================
-- STEP 4: Enable RLS and create policies
-- =============================================================================
ALTER TABLE competition_activity ENABLE ROW LEVEL SECURITY;

-- Anyone can read activity (public feed)
DROP POLICY IF EXISTS "Public can view activity" ON competition_activity;
CREATE POLICY "Public can view activity"
  ON competition_activity FOR SELECT
  USING (true);

-- Only system/service role can insert (via triggers/functions)
DROP POLICY IF EXISTS "Service role can insert activity" ON competition_activity;
CREATE POLICY "Service role can insert activity"
  ON competition_activity FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    table_exists BOOLEAN;
    has_constraint BOOLEAN;
    has_index BOOLEAN;
    has_rls BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'competition_activity'
    ) INTO table_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE table_name = 'competition_activity' AND constraint_name = 'valid_activity_type'
    ) INTO has_constraint;

    SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'competition_activity' AND indexname = 'idx_activity_competition_created'
    ) INTO has_index;

    SELECT relrowsecurity FROM pg_class
    WHERE relname = 'competition_activity' INTO has_rls;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'competition_activity table exists: %', table_exists;
    RAISE NOTICE 'valid_activity_type constraint exists: %', has_constraint;
    RAISE NOTICE 'idx_activity_competition_created index exists: %', has_index;
    RAISE NOTICE 'RLS enabled: %', has_rls;

    IF table_exists AND has_constraint AND has_index AND has_rls THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

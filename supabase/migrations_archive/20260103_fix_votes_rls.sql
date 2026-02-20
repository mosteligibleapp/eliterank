-- =============================================================================
-- Fix votes table RLS policies
-- Date: 2026-01-03
-- Description: Ensure votes table has proper RLS policies for:
--   - Users can insert votes (with their voter_id)
--   - Users can view their own votes
--   - Super admins and hosts can view all votes for their competitions
--
-- TO APPLY: Run this migration in your Supabase SQL Editor or via CLI:
--   supabase db push
-- =============================================================================

-- Enable RLS on votes table (idempotent)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh (comprehensive list)
DROP POLICY IF EXISTS "Anyone can cast votes" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Public can view vote counts" ON votes;
DROP POLICY IF EXISTS "Hosts can view votes for their competitions" ON votes;
DROP POLICY IF EXISTS "Super admins can view all votes" ON votes;
DROP POLICY IF EXISTS "votes_insert_own" ON votes;
DROP POLICY IF EXISTS "votes_select_own" ON votes;
DROP POLICY IF EXISTS "votes_super_admin_all" ON votes;
DROP POLICY IF EXISTS "votes_host_select" ON votes;
DROP POLICY IF EXISTS "votes_public_aggregate" ON votes;

-- 1. Authenticated users can insert votes with their own voter_id
CREATE POLICY "votes_insert_authenticated" ON votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

-- 2. Users can view their own votes (for checking daily vote status)
CREATE POLICY "votes_select_own" ON votes
  FOR SELECT TO authenticated
  USING (auth.uid() = voter_id);

-- 3. Super admins can do anything with votes
CREATE POLICY "votes_super_admin_all" ON votes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- 4. Hosts can view votes for their competitions
CREATE POLICY "votes_host_select" ON votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = votes.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- =============================================================================
-- HELPER FUNCTION: Check if user voted today (bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION has_voted_today(
  p_user_id UUID,
  p_competition_id UUID
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_voted_today(UUID, UUID) TO authenticated;

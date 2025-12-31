-- ============================================================================
-- Fix Votes Table RLS Policies
-- The 406 error occurs when RLS blocks SELECT queries
-- ============================================================================

-- Drop existing potentially conflicting policies
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Public can view vote counts" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;

-- Enable RLS (should already be enabled but ensure it is)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all votes (needed for leaderboards and vote checking)
-- This is safe because votes don't contain sensitive data
CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own votes
-- The voter_id must match the authenticated user's ID
CREATE POLICY "Authenticated users can insert own votes" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = voter_id
  );

-- Policy: Users can update their own votes (if needed)
CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

-- Policy: Users can delete their own votes (if needed)
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (auth.uid() = voter_id);

-- ============================================================================
-- Also ensure contestants table allows public read for vote counts
-- ============================================================================

-- Make sure contestants can be read publicly (for leaderboard)
DROP POLICY IF EXISTS "Public can view contestants" ON contestants;
CREATE POLICY "Public can view contestants" ON contestants
  FOR SELECT USING (true);

-- Ensure authenticated users can update contestant vote counts via RPC
-- The RPC function already has SECURITY DEFINER so this should work

-- ============================================================================
-- Fix ALL RLS Policies for Competition Management
-- Run this in Supabase SQL Editor to fix data loading issues
-- ============================================================================

-- ============================================================================
-- VOTING_ROUNDS TABLE - Missing RLS Policies
-- ============================================================================

-- Enable RLS on voting_rounds if not already
ALTER TABLE voting_rounds ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can view voting_rounds" ON voting_rounds;
DROP POLICY IF EXISTS "Hosts can manage voting_rounds" ON voting_rounds;
DROP POLICY IF EXISTS "Authenticated users can manage voting_rounds" ON voting_rounds;

-- Policy: Anyone can view voting rounds (needed for public competition pages)
CREATE POLICY "Anyone can view voting_rounds" ON voting_rounds
  FOR SELECT USING (true);

-- Policy: Hosts can manage voting rounds in their competitions
CREATE POLICY "Hosts can manage voting_rounds" ON voting_rounds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = voting_rounds.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Policy: Super admins can manage all voting rounds
CREATE POLICY "Super admins can manage voting_rounds" ON voting_rounds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- COMPETITION_SETTINGS TABLE - Ensure proper RLS
-- ============================================================================

-- Enable RLS
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for competition_settings" ON competition_settings;
DROP POLICY IF EXISTS "Anyone can view competition_settings" ON competition_settings;
DROP POLICY IF EXISTS "Hosts can manage competition_settings" ON competition_settings;

-- Policy: Anyone can view settings (needed for public pages)
CREATE POLICY "Anyone can view competition_settings" ON competition_settings
  FOR SELECT USING (true);

-- Policy: Hosts can manage settings for their competitions
CREATE POLICY "Hosts can manage competition_settings" ON competition_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = competition_settings.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Policy: Super admins can manage all settings
CREATE POLICY "Super admins can manage competition_settings" ON competition_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- VOTES TABLE - Fix for 406 errors (SELECT access)
-- ============================================================================

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view own votes" ON votes;
DROP POLICY IF EXISTS "Public can view vote counts" ON votes;
DROP POLICY IF EXISTS "Users can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;
DROP POLICY IF EXISTS "Authenticated users can insert own votes" ON votes;
DROP POLICY IF EXISTS "Users can update own votes" ON votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;
DROP POLICY IF EXISTS "Hosts can view votes for their competitions" ON votes;
DROP POLICY IF EXISTS "Anyone can cast votes" ON votes;

-- Policy: Anyone can view all votes (needed for leaderboards and vote checking)
CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can insert own votes" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = voter_id
  );

-- Policy: Users can update their own votes
CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

-- Policy: Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (auth.uid() = voter_id);

-- ============================================================================
-- CONTESTANTS TABLE - Ensure delete works
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Contestants are viewable by everyone" ON contestants;
DROP POLICY IF EXISTS "Public can view contestants" ON contestants;
DROP POLICY IF EXISTS "Hosts can manage contestants in their competitions" ON contestants;
DROP POLICY IF EXISTS "Users can update own contestant profile" ON contestants;
DROP POLICY IF EXISTS "Super admins can manage contestants" ON contestants;

-- Anyone can view contestants
CREATE POLICY "Public can view contestants" ON contestants
  FOR SELECT USING (true);

-- Hosts can manage contestants in their competitions
CREATE POLICY "Hosts can manage contestants" ON contestants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = contestants.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Users can update their own contestant profile
CREATE POLICY "Users can update own contestant" ON contestants
  FOR UPDATE USING (auth.uid() = user_id);

-- Super admins can manage all contestants
CREATE POLICY "Super admins can manage contestants" ON contestants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- COMPETITIONS TABLE - Ensure all operations work
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Competitions are viewable by everyone" ON competitions;
DROP POLICY IF EXISTS "Authenticated users can create competitions" ON competitions;
DROP POLICY IF EXISTS "Hosts can update own competitions" ON competitions;
DROP POLICY IF EXISTS "Super admins can manage all competitions" ON competitions;

-- Anyone can view competitions
CREATE POLICY "Anyone can view competitions" ON competitions
  FOR SELECT USING (true);

-- Authenticated users can create competitions
CREATE POLICY "Users can create competitions" ON competitions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own competitions
CREATE POLICY "Hosts can update own competitions" ON competitions
  FOR UPDATE USING (auth.uid() = host_id);

-- Hosts can delete their own competitions
CREATE POLICY "Hosts can delete own competitions" ON competitions
  FOR DELETE USING (auth.uid() = host_id);

-- Super admins can do anything
CREATE POLICY "Super admins full access to competitions" ON competitions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- Done! Your competition data should now load correctly.
-- ============================================================================

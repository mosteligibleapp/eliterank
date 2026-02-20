-- Row Level Security Policies for EliteRank
-- Run this after 001_initial_schema.sql

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Anyone can view public profile info
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================
-- Anyone can view organizations
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  USING (true);

-- Only super admins can manage organizations
CREATE POLICY "Super admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================
-- COMPETITIONS POLICIES
-- ============================================
-- Anyone can view competitions
CREATE POLICY "Competitions are viewable by everyone"
  ON competitions FOR SELECT
  USING (true);

-- Hosts can create competitions
CREATE POLICY "Authenticated users can create competitions"
  ON competitions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own competitions
CREATE POLICY "Hosts can update own competitions"
  ON competitions FOR UPDATE
  USING (auth.uid() = host_id);

-- Super admins can manage all competitions
CREATE POLICY "Super admins can manage all competitions"
  ON competitions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================
-- CONTESTANTS POLICIES
-- ============================================
-- Anyone can view contestants
CREATE POLICY "Contestants are viewable by everyone"
  ON contestants FOR SELECT
  USING (true);

-- Hosts can manage contestants in their competitions
CREATE POLICY "Hosts can manage contestants in their competitions"
  ON contestants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = contestants.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Users can update their own contestant profile
CREATE POLICY "Users can update own contestant profile"
  ON contestants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- NOMINEES POLICIES
-- ============================================
-- Hosts can view nominees in their competitions
CREATE POLICY "Hosts can view nominees in their competitions"
  ON nominees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = nominees.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Anyone can create a nomination (self or third party)
CREATE POLICY "Anyone can create nominations"
  ON nominees FOR INSERT
  WITH CHECK (true);

-- Hosts can update nominee status
CREATE POLICY "Hosts can update nominees in their competitions"
  ON nominees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = nominees.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- ============================================
-- VOTES POLICIES
-- ============================================
-- Hosts can view votes for their competitions
CREATE POLICY "Hosts can view votes for their competitions"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = votes.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Anyone can cast votes
CREATE POLICY "Anyone can cast votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- ============================================
-- JUDGES POLICIES
-- ============================================
-- Anyone can view judges
CREATE POLICY "Judges are viewable by everyone"
  ON judges FOR SELECT
  USING (true);

-- Hosts can manage judges in their competitions
CREATE POLICY "Hosts can manage judges in their competitions"
  ON judges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = judges.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- ============================================
-- SPONSORS POLICIES
-- ============================================
-- Anyone can view sponsors
CREATE POLICY "Sponsors are viewable by everyone"
  ON sponsors FOR SELECT
  USING (true);

-- Hosts can manage sponsors in their competitions
CREATE POLICY "Hosts can manage sponsors in their competitions"
  ON sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = sponsors.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- ============================================
-- EVENTS POLICIES
-- ============================================
-- Public events are viewable by everyone
CREATE POLICY "Public events are viewable by everyone"
  ON events FOR SELECT
  USING (public_visible = true);

-- Hosts can view all events in their competitions
CREATE POLICY "Hosts can view all events in their competitions"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = events.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- Hosts can manage events in their competitions
CREATE POLICY "Hosts can manage events in their competitions"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = events.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

-- ============================================
-- ANNOUNCEMENTS POLICIES
-- ============================================
-- Anyone can view announcements
CREATE POLICY "Announcements are viewable by everyone"
  ON announcements FOR SELECT
  USING (true);

-- Hosts can manage announcements in their competitions
CREATE POLICY "Hosts can manage announcements in their competitions"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = announcements.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

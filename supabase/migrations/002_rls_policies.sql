-- Row Level Security Policies v2
-- Flexible roles: user can be host, fan, contestant, nominee simultaneously

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);

-- ============================================
-- COMPETITIONS
-- ============================================
CREATE POLICY "Anyone can view competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create competitions" ON competitions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own competitions" ON competitions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete own competitions" ON competitions FOR DELETE USING (auth.uid() = host_id);

-- ============================================
-- CONTESTANTS
-- ============================================
CREATE POLICY "Anyone can view contestants" ON contestants FOR SELECT USING (true);

-- Hosts can manage contestants in their competitions
CREATE POLICY "Hosts can insert contestants" ON contestants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can update contestants" ON contestants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete contestants" ON contestants FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- Contestants can update their own profile
CREATE POLICY "Contestants can update own record" ON contestants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- NOMINEES
-- ============================================
-- Anyone can submit nominations
CREATE POLICY "Anyone can submit nominations" ON nominees FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view nominations" ON nominees FOR SELECT USING (true);

-- Hosts can manage nominees
CREATE POLICY "Hosts can update nominees" ON nominees FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete nominees" ON nominees FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- Nominees can update their own profile (via invite token or user_id)
CREATE POLICY "Nominees can update own record" ON nominees FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- VOTES
-- ============================================
-- Anyone can vote (logged in or guest)
CREATE POLICY "Anyone can vote" ON votes FOR INSERT WITH CHECK (true);

-- Users can view their own votes
CREATE POLICY "Users can view own votes" ON votes FOR SELECT USING (auth.uid() = voter_id);

-- Hosts can view all votes in their competitions
CREATE POLICY "Hosts can view competition votes" ON votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- ============================================
-- JUDGES
-- ============================================
CREATE POLICY "Anyone can view judges" ON judges FOR SELECT USING (true);
CREATE POLICY "Hosts can insert judges" ON judges FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can update judges" ON judges FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete judges" ON judges FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- ============================================
-- SPONSORS
-- ============================================
CREATE POLICY "Anyone can view sponsors" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Hosts can insert sponsors" ON sponsors FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can update sponsors" ON sponsors FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete sponsors" ON sponsors FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- ============================================
-- EVENTS
-- ============================================
CREATE POLICY "Anyone can view public events" ON events FOR SELECT USING (public_visible = true);
CREATE POLICY "Hosts can view all events" ON events FOR SELECT
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can insert events" ON events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can update events" ON events FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete events" ON events FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Hosts can insert announcements" ON announcements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can update announcements" ON announcements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can delete announcements" ON announcements FOR DELETE
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = competition_id AND host_id = auth.uid()));

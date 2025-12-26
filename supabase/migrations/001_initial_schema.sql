-- EliteRank Database Schema v2
-- Flexible user roles: host, fan, contestant, nominee (not mutually exclusive)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (base user - role determined by context)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  city TEXT,
  avatar_url TEXT,
  -- Social links
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  tiktok TEXT,
  -- Preferences
  hobbies TEXT[],
  interests TEXT[],
  -- Super admin flag
  is_super_admin BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  tagline TEXT,
  description TEXT,
  cover_image TEXT,
  -- Stats (auto-updated)
  total_competitions INTEGER DEFAULT 0,
  total_cities INTEGER DEFAULT 0,
  total_contestants INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPETITIONS (user becomes HOST by creating one)
-- ============================================
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  city TEXT NOT NULL,
  season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'nomination', 'voting', 'finals', 'completed')),
  phase TEXT DEFAULT 'setup' CHECK (phase IN ('setup', 'nomination', 'voting', 'finals', 'ended')),
  -- Stats
  total_contestants INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  -- Settings
  vote_price DECIMAL(6,2) DEFAULT 1.00,
  host_payout_percentage DECIMAL(5,2) DEFAULT 20.00,
  nomination_start TIMESTAMPTZ,
  nomination_end TIMESTAMPTZ,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  finals_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTESTANTS (user becomes CONTESTANT when approved)
-- ============================================
CREATE TABLE contestants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Links to user account (optional)
  -- Profile info (can exist without user account)
  name TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  occupation TEXT,
  bio TEXT,
  avatar_url TEXT,
  instagram TEXT,
  interests TEXT[],
  -- Competition data
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner', 'finalist')),
  votes INTEGER DEFAULT 0,
  rank INTEGER,
  trend TEXT DEFAULT 'same' CHECK (trend IN ('up', 'down', 'same')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- A user can only be contestant once per competition
  UNIQUE(competition_id, user_id)
);

-- ============================================
-- NOMINEES (user becomes NOMINEE when nominated)
-- ============================================
CREATE TABLE nominees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Links to user account (optional)
  -- Nominee info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  age INTEGER,
  occupation TEXT,
  bio TEXT,
  city TEXT,
  instagram TEXT,
  interests TEXT[],
  -- Nomination source
  nominated_by TEXT DEFAULT 'self' CHECK (nominated_by IN ('self', 'third_party')),
  nominator_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who nominated them
  nominator_name TEXT,
  nominator_email TEXT,
  -- Status flow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending-approval', 'awaiting-profile', 'profile-complete', 'approved', 'rejected')),
  profile_complete BOOLEAN DEFAULT FALSE,
  -- Invite tracking
  invite_token UUID DEFAULT uuid_generate_v4(),
  invite_sent_at TIMESTAMPTZ,
  converted_to_contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- A user can only be nominated once per competition
  UNIQUE(competition_id, email)
);

-- ============================================
-- VOTES (user becomes FAN by voting)
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Logged in voter (optional)
  voter_email TEXT, -- For anonymous/guest voting
  vote_count INTEGER DEFAULT 1,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_intent_id TEXT,
  is_double_vote BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JUDGES
-- ============================================
CREATE TABLE judges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Can link to user account
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPONSORS
-- ============================================
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'Gold' CHECK (tier IN ('Platinum', 'Gold', 'Silver')),
  amount DECIMAL(10,2) DEFAULT 0,
  logo_url TEXT,
  website_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  time TIME,
  location TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  public_visible BOOLEAN DEFAULT TRUE,
  is_double_vote_day BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'announcement' CHECK (type IN ('announcement', 'update', 'news')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_competitions_host ON competitions(host_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_city_season ON competitions(city, season);
CREATE INDEX idx_competitions_organization ON competitions(organization_id);

CREATE INDEX idx_contestants_competition ON contestants(competition_id);
CREATE INDEX idx_contestants_user ON contestants(user_id);
CREATE INDEX idx_contestants_votes ON contestants(competition_id, votes DESC);

CREATE INDEX idx_nominees_competition ON nominees(competition_id);
CREATE INDEX idx_nominees_user ON nominees(user_id);
CREATE INDEX idx_nominees_email ON nominees(email);

CREATE INDEX idx_votes_competition ON votes(competition_id);
CREATE INDEX idx_votes_contestant ON votes(contestant_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);

CREATE INDEX idx_judges_competition ON judges(competition_id);
CREATE INDEX idx_sponsors_competition ON sponsors(competition_id);
CREATE INDEX idx_events_competition ON events(competition_id);
CREATE INDEX idx_announcements_competition ON announcements(competition_id);

-- ============================================
-- HELPER VIEWS (get user roles)
-- ============================================
CREATE OR REPLACE VIEW user_roles AS
SELECT
  p.id as user_id,
  p.email,
  p.is_super_admin,
  EXISTS(SELECT 1 FROM competitions c WHERE c.host_id = p.id) as is_host,
  EXISTS(SELECT 1 FROM contestants ct WHERE ct.user_id = p.id AND ct.status = 'active') as is_contestant,
  EXISTS(SELECT 1 FROM nominees n WHERE n.user_id = p.id AND n.status NOT IN ('approved', 'rejected')) as is_nominee,
  EXISTS(SELECT 1 FROM votes v WHERE v.voter_id = p.id) as is_fan,
  (SELECT array_agg(DISTINCT c.city) FROM competitions c WHERE c.host_id = p.id) as hosting_cities,
  (SELECT array_agg(DISTINCT c.city) FROM contestants ct JOIN competitions c ON ct.competition_id = c.id WHERE ct.user_id = p.id) as competing_cities
FROM profiles p;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contestants_updated_at BEFORE UPDATE ON contestants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_nominees_updated_at BEFORE UPDATE ON nominees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update vote counts
CREATE OR REPLACE FUNCTION process_vote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contestants SET votes = votes + NEW.vote_count WHERE id = NEW.contestant_id;
  UPDATE competitions SET total_votes = total_votes + NEW.vote_count, total_revenue = total_revenue + NEW.amount_paid WHERE id = NEW.competition_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_insert AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION process_vote();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update organization stats when competitions change
CREATE OR REPLACE FUNCTION update_organization_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the organization stats
  UPDATE organizations o
  SET
    total_competitions = (SELECT COUNT(*) FROM competitions WHERE organization_id = o.id),
    total_cities = (SELECT COUNT(DISTINCT city) FROM competitions WHERE organization_id = o.id),
    total_contestants = (SELECT COALESCE(SUM(total_contestants), 0) FROM competitions WHERE organization_id = o.id),
    updated_at = NOW()
  WHERE o.id = COALESCE(NEW.organization_id, OLD.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_competition_change
  AFTER INSERT OR UPDATE OR DELETE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_organization_stats();

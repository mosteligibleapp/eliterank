-- =============================================================================
-- EliteRank Database Schema - Consolidated Baseline
-- Generated: 2026-02-19
-- 
-- This is the complete, consolidated schema combining 44 migrations into
-- a single baseline. Use this for fresh database setups.
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER FUNCTIONS (needed by tables)
-- =============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alias for compatibility
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: profiles
-- Base user identity + lifetime aggregate stats
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  city TEXT,
  phone TEXT,
  avatar_url TEXT,
  cover_image TEXT,
  
  -- Social links
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  tiktok TEXT,
  
  -- Demographics
  age INTEGER,
  occupation TEXT,
  interests TEXT[],
  gallery TEXT[],
  
  -- Lifetime stats (competition-agnostic)
  total_votes_received INTEGER DEFAULT 0,
  total_competitions INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  best_placement INTEGER,
  
  -- Admin flag
  is_super_admin BOOLEAN DEFAULT FALSE,
  
  -- Shipping address for reward claims
  shipping_address JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: organizations
-- Organizations that run competitions (e.g., Most Eligible)
-- =============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  tagline TEXT,
  cover_image TEXT,
  
  -- Default about content (templates for competitions)
  default_about_tagline TEXT,
  default_about_description TEXT,
  default_about_traits TEXT[] DEFAULT ARRAY['Ambitious professionals', 'Community leaders', 'Social innovators', 'Culture shapers'],
  default_age_range TEXT DEFAULT '21-45',
  default_requirement TEXT DEFAULT 'Single & city-based',
  
  -- Default theme colors
  default_theme_primary TEXT DEFAULT '#d4af37',
  default_theme_voting TEXT DEFAULT '#f472b6',
  default_theme_resurrection TEXT DEFAULT '#8b5cf6',
  
  -- Stats (auto-updated)
  total_competitions INTEGER DEFAULT 0,
  total_cities INTEGER DEFAULT 0,
  total_contestants INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: cities
-- US cities where competitions can be held
-- =============================================================================
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_city_state UNIQUE (name, state)
);

CREATE INDEX idx_cities_slug ON cities(slug);
CREATE INDEX idx_cities_state ON cities(state);
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: categories
-- Competition categories (Dating, Business, Talent, Fitness)
-- =============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_active ON categories(active) WHERE active = TRUE;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: demographics
-- Audience segmentation (Open, Women 21-39, Men 40+, etc.)
-- =============================================================================
CREATE TABLE demographics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  gender VARCHAR(20),  -- 'male', 'female', 'LGBTQ+', or NULL for open
  age_min INTEGER,
  age_max INTEGER,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_demographics_active ON demographics(active) WHERE active = TRUE;
CREATE TRIGGER update_demographics_updated_at BEFORE UPDATE ON demographics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: competitions
-- Individual competition instances
-- =============================================================================
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  demographic_id UUID REFERENCES demographics(id) ON DELETE SET NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT,
  slug TEXT NOT NULL,
  city TEXT,  -- Denormalized for backwards compatibility
  season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  description TEXT,
  rules_doc_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'publish', 'live', 'archive', 'completed', 'upcoming', 'nomination', 'voting', 'finals')),
  phase TEXT DEFAULT 'setup' CHECK (phase IN ('setup', 'nomination', 'voting', 'finals', 'ended')),
  
  -- Entry settings
  entry_type TEXT DEFAULT 'nominations' CHECK (entry_type IN ('nominations', 'applications', 'appointments')),
  has_events BOOLEAN DEFAULT FALSE,
  number_of_winners INTEGER DEFAULT 5,
  selection_criteria TEXT DEFAULT 'votes' CHECK (selection_criteria IN ('votes', 'hybrid')),
  
  -- Pricing
  price_per_vote DECIMAL(10,2) DEFAULT 1.00,
  vote_price DECIMAL(6,2) DEFAULT 1.00,
  use_price_bundler BOOLEAN DEFAULT FALSE,
  allow_manual_votes BOOLEAN DEFAULT FALSE,
  host_payout_percentage DECIMAL(5,2) DEFAULT 20.00,
  
  -- Prize settings
  prize_pool_minimum NUMERIC DEFAULT 1000,
  minimum_prize_cents INTEGER DEFAULT 100000,
  
  -- Contestant limits
  min_contestants INTEGER DEFAULT 40,
  max_contestants INTEGER,
  eligibility_radius_miles INTEGER DEFAULT 100,
  
  -- Stats
  total_contestants INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  winners UUID[] DEFAULT '{}',
  
  -- Schedule (legacy - use nomination_periods/voting_rounds instead)
  nomination_start TIMESTAMPTZ,
  nomination_end TIMESTAMPTZ,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  finals_date TIMESTAMPTZ,
  finale_date TIMESTAMPTZ,
  
  -- About content (overrides org defaults)
  about_tagline TEXT,
  about_description TEXT,
  about_traits TEXT[],
  about_age_range TEXT,
  about_requirement TEXT,
  
  -- Theme colors (overrides org defaults)
  theme_primary TEXT,
  theme_voting TEXT,
  theme_resurrection TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_minimum_prize CHECK (minimum_prize_cents >= 100000),
  CONSTRAINT chk_eligibility_radius CHECK (eligibility_radius_miles IN (0, 10, 25, 50, 100)),
  CONSTRAINT chk_min_contestants CHECK (min_contestants >= 10),
  CONSTRAINT chk_max_contestants CHECK (max_contestants IS NULL OR max_contestants > min_contestants)
);

-- Unique constraint for franchise model
CREATE UNIQUE INDEX unique_competition_slot ON competitions(organization_id, city_id, category_id, demographic_id, season)
  WHERE organization_id IS NOT NULL AND city_id IS NOT NULL AND category_id IS NOT NULL AND demographic_id IS NOT NULL;
CREATE UNIQUE INDEX idx_competitions_slug ON competitions(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_competitions_org_slug ON competitions(organization_id, slug);
CREATE INDEX idx_competitions_host ON competitions(host_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_season ON competitions(season);
CREATE INDEX idx_competitions_city_season ON competitions(city, season);
CREATE INDEX idx_competitions_organization ON competitions(organization_id);
CREATE INDEX idx_competitions_city ON competitions(city_id);
CREATE INDEX idx_competitions_category ON competitions(category_id);
CREATE INDEX idx_competitions_demographic ON competitions(demographic_id);
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: contestants
-- Users competing in a specific competition
-- =============================================================================
CREATE TABLE contestants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Profile info (can exist without user account)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  bio TEXT,
  city TEXT,
  avatar_url TEXT,
  instagram TEXT,
  slug TEXT,
  
  -- Competition data
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
  votes INTEGER DEFAULT 0,
  rank INTEGER,
  trend TEXT DEFAULT 'same' CHECK (trend IN ('up', 'down', 'same')),
  
  -- Round tracking
  eliminated_in_round INTEGER,
  advancement_status TEXT,
  current_round INTEGER,
  
  -- Engagement tracking
  profile_views INTEGER DEFAULT 0,
  external_shares INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- A user can only be contestant once per competition
  UNIQUE(competition_id, user_id)
);

CREATE INDEX idx_contestants_competition ON contestants(competition_id);
CREATE INDEX idx_contestants_competition_id ON contestants(competition_id);
CREATE INDEX idx_contestants_user ON contestants(user_id);
CREATE INDEX idx_contestants_user_id ON contestants(user_id);
CREATE INDEX idx_contestants_votes ON contestants(competition_id, votes DESC);
CREATE INDEX idx_contestants_slug ON contestants(slug);
CREATE TRIGGER update_contestants_updated_at BEFORE UPDATE ON contestants 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: nominees
-- Nominated users before approval (becomes contestant when approved)
-- =============================================================================
CREATE TABLE nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_to_contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  
  -- Nominee info
  name TEXT NOT NULL,
  email TEXT,  -- Nullable: contact can be email OR phone
  phone TEXT,
  age INTEGER,
  bio TEXT,
  city TEXT,
  avatar_url TEXT,
  instagram TEXT,
  
  -- Eligibility answers (JSON for custom questions)
  eligibility_answers JSONB,
  
  -- Nomination source
  nominated_by TEXT DEFAULT 'self' CHECK (nominated_by IN ('self', 'third_party', 'admin')),
  nominator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nominator_name TEXT,
  nominator_email TEXT,
  nominator_anonymous BOOLEAN DEFAULT FALSE,
  nominator_wants_updates BOOLEAN DEFAULT TRUE,
  nominator_notify BOOLEAN DEFAULT TRUE,
  nomination_reason TEXT,
  relationship TEXT,  -- friend, coworker, family, other
  
  -- Status flow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  converted_to_contestant BOOLEAN DEFAULT FALSE,
  
  -- Claim tracking
  invite_token UUID DEFAULT gen_random_uuid(),
  invite_sent_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  flow_stage TEXT,  -- photo, details, pitch, password, card
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_nominees_invite_token ON nominees(invite_token) WHERE invite_token IS NOT NULL;
CREATE UNIQUE INDEX idx_nominees_unique_per_competition ON nominees(competition_id, COALESCE(email, phone || name));
CREATE INDEX idx_nominees_competition ON nominees(competition_id);
CREATE INDEX idx_nominees_user ON nominees(user_id);
CREATE INDEX idx_nominees_user_id ON nominees(user_id);
CREATE INDEX idx_nominees_email ON nominees(email);
CREATE INDEX idx_nominees_status ON nominees(status);
CREATE INDEX idx_nominees_pending ON nominees(status) WHERE status = 'pending';
CREATE INDEX idx_nominees_claimed_at ON nominees(claimed_at) WHERE claimed_at IS NOT NULL;
CREATE TRIGGER update_nominees_updated_at BEFORE UPDATE ON nominees 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: votes
-- Voting records
-- =============================================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  voter_email TEXT,
  vote_count INTEGER DEFAULT 1,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_intent_id TEXT,
  is_double_vote BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_votes_competition ON votes(competition_id);
CREATE INDEX idx_votes_competition_id ON votes(competition_id);
CREATE INDEX idx_votes_contestant ON votes(contestant_id);
CREATE INDEX idx_votes_contestant_id ON votes(contestant_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);

-- =============================================================================
-- TABLE: judges
-- Competition judges
-- =============================================================================
CREATE TABLE judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_judges_competition ON judges(competition_id);
CREATE INDEX idx_judges_user_id ON judges(user_id);

-- =============================================================================
-- TABLE: sponsors
-- Competition sponsors
-- =============================================================================
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'Gold' CHECK (tier IN ('Platinum', 'Gold', 'Silver')),
  amount DECIMAL(10,2) DEFAULT 0,
  logo_url TEXT,
  website_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sponsors_competition ON sponsors(competition_id);

-- =============================================================================
-- TABLE: events
-- Competition events
-- =============================================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  end_date DATE,
  time TIME,
  location TEXT,
  image_url TEXT,
  ticket_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  public_visible BOOLEAN DEFAULT TRUE,
  is_double_vote_day BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_competition ON events(competition_id);

-- =============================================================================
-- TABLE: announcements
-- Competition announcements
-- =============================================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'announcement' CHECK (type IN ('announcement', 'update', 'news')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_competition ON announcements(competition_id);

-- =============================================================================
-- TABLE: voting_rounds
-- Multiple voting rounds per competition
-- =============================================================================
CREATE TABLE voting_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Round 1',
  round_order INTEGER NOT NULL DEFAULT 1,
  round_type VARCHAR(20) NOT NULL DEFAULT 'voting' CHECK (round_type IN ('voting', 'judging')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  contestants_advance INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_voting_round_order UNIQUE (competition_id, round_order)
);

CREATE INDEX idx_voting_rounds_comp ON voting_rounds(competition_id);
CREATE INDEX idx_voting_rounds_competition ON voting_rounds(competition_id);
CREATE INDEX idx_voting_rounds_competition_id ON voting_rounds(competition_id);
CREATE TRIGGER update_voting_rounds_updated_at BEFORE UPDATE ON voting_rounds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE voting_rounds IS 'Multiple voting rounds per competition';
COMMENT ON COLUMN voting_rounds.round_type IS 'Type of round: voting (public votes) or judging (judge scores)';

-- =============================================================================
-- TABLE: nomination_periods
-- Multiple contestant prospecting/nomination periods per competition
-- =============================================================================
CREATE TABLE nomination_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Open Nominations',
  period_order INTEGER NOT NULL DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  max_submissions INTEGER,  -- NULL means unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_nomination_period_order UNIQUE (competition_id, period_order)
);

CREATE INDEX idx_nomination_periods_competition ON nomination_periods(competition_id);
CREATE INDEX idx_nomination_periods_competition_id ON nomination_periods(competition_id);

CREATE OR REPLACE FUNCTION update_nomination_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nomination_periods_updated_at BEFORE UPDATE ON nomination_periods 
  FOR EACH ROW EXECUTE FUNCTION update_nomination_periods_updated_at();

COMMENT ON TABLE nomination_periods IS 'Multiple contestant prospecting/nomination periods per competition';

-- =============================================================================
-- TABLE: rewards
-- Affiliate rewards/products for contestants
-- =============================================================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  description TEXT,
  image_url TEXT,
  product_url TEXT,
  terms TEXT,
  commission_rate DECIMAL(5,2),
  cash_value DECIMAL(10,2),
  requires_promotion BOOLEAN DEFAULT TRUE,
  claim_deadline_days INTEGER DEFAULT 7,
  reward_type TEXT DEFAULT 'all_nominees' CHECK (reward_type IN ('all_nominees', 'winners_only')),
  is_affiliate BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_status ON rewards(status);

CREATE OR REPLACE FUNCTION update_reward_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rewards_updated_at BEFORE UPDATE ON rewards 
  FOR EACH ROW EXECUTE FUNCTION update_reward_updated_at();

COMMENT ON COLUMN rewards.cash_value IS 'The cash/monetary value of the reward in USD';

-- =============================================================================
-- TABLE: reward_assignments
-- Links rewards to specific contestants/nominees
-- =============================================================================
CREATE TABLE reward_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE CASCADE,
  nominee_id UUID REFERENCES nominees(id) ON DELETE CASCADE,
  
  -- Distribution info
  discount_code TEXT,
  tracking_link TEXT,
  
  -- Claim status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'shipped', 'active', 'completed', 'expired')),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Shipping info
  shipping_address JSONB,
  
  -- Compliance tracking
  content_posted BOOLEAN DEFAULT FALSE,
  content_links TEXT[],
  compliance_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique assignment per reward-contestant/nominee
  UNIQUE(reward_id, contestant_id),
  CONSTRAINT reward_assignments_reward_nominee_unique UNIQUE (reward_id, nominee_id),
  CONSTRAINT reward_assignments_has_recipient CHECK (contestant_id IS NOT NULL OR nominee_id IS NOT NULL)
);

CREATE INDEX idx_reward_assignments_reward_id ON reward_assignments(reward_id);
CREATE INDEX idx_reward_assignments_competition_id ON reward_assignments(competition_id);
CREATE INDEX idx_reward_assignments_contestant_id ON reward_assignments(contestant_id);
CREATE INDEX idx_reward_assignments_nominee_id ON reward_assignments(nominee_id);
CREATE INDEX idx_reward_assignments_status ON reward_assignments(status);

CREATE TRIGGER trigger_reward_assignments_updated_at BEFORE UPDATE ON reward_assignments 
  FOR EACH ROW EXECUTE FUNCTION update_reward_updated_at();

-- Set expires_at when assignment is created
CREATE OR REPLACE FUNCTION set_reward_assignment_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    SELECT NEW.created_at + (COALESCE(r.claim_deadline_days, 7) * INTERVAL '1 day')
    INTO NEW.expires_at
    FROM rewards r
    WHERE r.id = NEW.reward_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_reward_assignment_expiry BEFORE INSERT ON reward_assignments 
  FOR EACH ROW EXECUTE FUNCTION set_reward_assignment_expiry();

-- =============================================================================
-- TABLE: reward_competition_assignments
-- Links rewards to competitions for visibility
-- =============================================================================
CREATE TABLE reward_competition_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reward_id, competition_id)
);

CREATE INDEX idx_reward_competition_assignments_reward_id ON reward_competition_assignments(reward_id);
CREATE INDEX idx_reward_competition_assignments_competition_id ON reward_competition_assignments(competition_id);

-- =============================================================================
-- TABLE: notifications
-- In-app notification system
-- =============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (type IN (
    'nominated', 'nomination_approved', 'new_reward', 'prize_package',
    'rank_change', 'vote_received', 'event_posted', 'system_announcement'
  ))
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_competition ON notifications(competition_id) WHERE competition_id IS NOT NULL;

-- =============================================================================
-- TABLE: app_settings
-- Global app-wide settings
-- =============================================================================
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_settings_key ON app_settings(key);

CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON app_settings 
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();

-- =============================================================================
-- TABLE: competition_activity
-- Real-time activity feed for competitions
-- =============================================================================
CREATE TABLE competition_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'vote', 'rank_up', 'rank_down', 'new_leader', 
    'milestone_pool', 'milestone_prize', 'profile_view', 
    'external_share', 'urgency'
  ))
);

CREATE INDEX idx_activity_competition_created ON competition_activity(competition_id, created_at DESC);
CREATE INDEX idx_activity_type ON competition_activity(activity_type);
CREATE INDEX idx_activity_contestant ON competition_activity(contestant_id) WHERE contestant_id IS NOT NULL;

-- =============================================================================
-- TABLE: ai_post_events
-- Tracks which competition events triggered AI announcements
-- =============================================================================
CREATE TABLE ai_post_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'competition_launched', 'nominations_open', 'nominations_close',
    'voting_open', 'voting_close', 'results_announced'
  )),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL,
  UNIQUE(competition_id, event_type)
);

CREATE INDEX idx_ai_post_events_competition ON ai_post_events(competition_id);

-- =============================================================================
-- TABLE: interest_submissions
-- Interest form submissions for hosting/sponsoring/competing/judging
-- =============================================================================
CREATE TABLE interest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interest_submissions_comp ON interest_submissions(competition_id);
CREATE INDEX idx_interest_submissions_type ON interest_submissions(interest_type);
CREATE INDEX idx_interest_submissions_status ON interest_submissions(status);

-- =============================================================================
-- TABLE: competition_prizes
-- Prizes for competition winners
-- =============================================================================
CREATE TABLE competition_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  value VARCHAR(100),
  external_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competition_prizes_comp ON competition_prizes(competition_id);
CREATE TRIGGER update_competition_prizes_updated_at BEFORE UPDATE ON competition_prizes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: competition_rules
-- Competition rules organized by section
-- =============================================================================
CREATE TABLE competition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  section_title VARCHAR(255) NOT NULL,
  section_content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competition_rules_comp ON competition_rules(competition_id);
CREATE TRIGGER update_competition_rules_updated_at BEFORE UPDATE ON competition_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: manual_votes
-- Manually added votes (tracked separately from public votes)
-- =============================================================================
CREATE TABLE manual_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  vote_count INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_votes_comp ON manual_votes(competition_id);
CREATE INDEX idx_manual_votes_contestant ON manual_votes(contestant_id);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- User roles view
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

-- Admin dashboard stats view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM competitions) as total_competitions,
  (SELECT COUNT(*) FROM contestants) as total_contestants,
  (SELECT COUNT(*) FROM votes) as total_votes,
  (SELECT COALESCE(SUM(total_revenue), 0) FROM competitions) as total_revenue,
  (SELECT COUNT(*) FROM organizations) as total_organizations;

-- Contestants with merged profile data
CREATE OR REPLACE VIEW contestants_with_profiles AS
SELECT
  c.id, c.competition_id, c.user_id, c.status, c.votes, c.rank, c.trend,
  c.created_at, c.updated_at, c.eliminated_in_round, c.advancement_status, c.current_round,
  COALESCE(c.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
  COALESCE(c.age, p.age) as age,
  p.occupation,
  COALESCE(c.bio, p.bio) as bio,
  COALESCE(c.avatar_url, p.avatar_url) as avatar_url,
  COALESCE(c.instagram, p.instagram) as instagram,
  p.twitter, p.linkedin,
  COALESCE(c.city, p.city) as city,
  p.interests, p.gallery, p.cover_image, p.tiktok,
  COALESCE(c.email, p.email) as email,
  COALESCE(c.phone, p.phone) as phone,
  p.total_votes_received, p.total_competitions, p.wins, p.best_placement
FROM contestants c
LEFT JOIN profiles p ON c.user_id = p.id;

-- Judges with merged profile data
CREATE OR REPLACE VIEW judges_with_profiles AS
SELECT
  j.id, j.competition_id, j.user_id, j.title, j.sort_order, j.created_at,
  COALESCE(j.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
  COALESCE(j.bio, p.bio) as bio,
  COALESCE(j.avatar_url, p.avatar_url) as avatar_url,
  p.instagram, p.twitter, p.linkedin, p.city, p.interests,
  p.gallery, p.cover_image, p.occupation, p.email
FROM judges j
LEFT JOIN profiles p ON j.user_id = p.id;

-- Competition timing helper view
CREATE OR REPLACE VIEW competition_with_timing AS
SELECT
  c.*,
  (SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id) as first_nomination_start,
  (SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id) as last_nomination_end,
  (SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as first_voting_start,
  (SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as last_voting_end,
  COALESCE((SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id), c.nomination_start) as effective_nomination_start,
  COALESCE((SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id), c.nomination_end) as effective_nomination_end,
  COALESCE((SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'), c.voting_start) as effective_voting_start,
  COALESCE((SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'), c.voting_end) as effective_voting_end
FROM competitions c;

COMMENT ON VIEW competition_with_timing IS 'View that provides effective dates from periods/rounds with fallback to legacy columns';

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Set super admin
CREATE OR REPLACE FUNCTION set_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET is_super_admin = true WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove super admin
CREATE OR REPLACE FUNCTION remove_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET is_super_admin = false WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Process vote (update counts)
CREATE OR REPLACE FUNCTION process_vote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contestants SET votes = votes + NEW.vote_count WHERE id = NEW.contestant_id;
  UPDATE competitions SET total_votes = total_votes + NEW.vote_count, total_revenue = total_revenue + NEW.amount_paid WHERE id = NEW.competition_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_vote_insert ON votes;
CREATE TRIGGER on_vote_insert AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION process_vote();

-- Update organization stats
CREATE OR REPLACE FUNCTION update_organization_stats()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_competition_change ON competitions;
CREATE TRIGGER on_competition_change
  AFTER INSERT OR UPDATE OR DELETE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_organization_stats();

-- Increment contestant votes (atomic)
CREATE OR REPLACE FUNCTION increment_contestant_votes(p_contestant_id UUID, p_vote_count INT)
RETURNS VOID AS $$
BEGIN
  UPDATE contestants SET votes = COALESCE(votes, 0) + p_vote_count WHERE id = p_contestant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_contestant_votes(UUID, INT) TO authenticated;

-- Profile stat functions
CREATE OR REPLACE FUNCTION increment_profile_votes(p_user_id UUID, p_votes INT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET total_votes_received = COALESCE(total_votes_received, 0) + p_votes WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_profile_competitions(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET total_competitions = COALESCE(total_competitions, 0) + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_profile_win(p_user_id UUID, p_placement INT)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_profile_votes(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_profile_competitions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_profile_win(UUID, INT) TO authenticated;

-- Find profile by email or instagram
CREATE OR REPLACE FUNCTION find_profile_for_contestant(p_email TEXT, p_instagram TEXT)
RETURNS UUID AS $$
DECLARE
  found_id UUID;
BEGIN
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT id INTO found_id FROM profiles WHERE LOWER(email) = LOWER(p_email) LIMIT 1;
    IF found_id IS NOT NULL THEN RETURN found_id; END IF;
  END IF;
  IF p_instagram IS NOT NULL AND p_instagram != '' THEN
    SELECT id INTO found_id FROM profiles WHERE LOWER(REPLACE(instagram, '@', '')) = LOWER(REPLACE(p_instagram, '@', '')) LIMIT 1;
    IF found_id IS NOT NULL THEN RETURN found_id; END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_profile_for_contestant(TEXT, TEXT) TO authenticated;

-- Check if user voted today
CREATE OR REPLACE FUNCTION has_voted_today(p_user_id UUID, p_competition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  vote_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM votes
    WHERE voter_id = p_user_id AND competition_id = p_competition_id AND amount_paid = 0
    AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
  ) INTO vote_exists;
  RETURN vote_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_voted_today(UUID, UUID) TO authenticated;

-- Log competition activity
CREATE OR REPLACE FUNCTION log_competition_activity(
  p_competition_id UUID, p_activity_type TEXT, p_message TEXT,
  p_contestant_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO competition_activity (competition_id, activity_type, message, contestant_id, metadata)
  VALUES (p_competition_id, p_activity_type, p_message, p_contestant_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_competition_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_competition_activity TO service_role;

-- Vote activity trigger
CREATE OR REPLACE FUNCTION on_vote_inserted()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_name TEXT;
  v_vote_count INTEGER;
BEGIN
  SELECT name INTO v_contestant_name FROM contestants WHERE id = NEW.contestant_id;
  v_vote_count := COALESCE(NEW.vote_count, 1);
  PERFORM log_competition_activity(
    NEW.competition_id, 'vote',
    v_contestant_name || ' received ' || v_vote_count || ' vote' || CASE WHEN v_vote_count > 1 THEN 's' ELSE '' END,
    NEW.contestant_id,
    jsonb_build_object('vote_count', v_vote_count, 'voter_id', NEW.voter_id, 'amount_paid', COALESCE(NEW.amount_paid, 0))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_activity ON votes;
CREATE TRIGGER trigger_vote_activity AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION on_vote_inserted();

-- Vote notification trigger
CREATE OR REPLACE FUNCTION on_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_user_id UUID;
  v_comp_city TEXT;
  v_vote_count INTEGER;
BEGIN
  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = NEW.contestant_id;
  IF v_contestant_user_id IS NULL THEN RETURN NEW; END IF;
  v_vote_count := COALESCE(NEW.vote_count, 1);
  SELECT city INTO v_comp_city FROM competitions WHERE id = NEW.competition_id;
  INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
  VALUES (
    v_contestant_user_id, 'vote_received', 'New votes!',
    'You received ' || v_vote_count || ' vote' || CASE WHEN v_vote_count > 1 THEN 's' ELSE '' END || ' in ' || COALESCE(v_comp_city, 'your competition'),
    NEW.competition_id, NEW.contestant_id, jsonb_build_object('vote_count', v_vote_count)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_notification ON votes;
CREATE TRIGGER trigger_vote_notification AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION on_vote_notification();

-- Rank change notification trigger
CREATE OR REPLACE FUNCTION on_rank_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.rank IS DISTINCT FROM NEW.rank AND NEW.user_id IS NOT NULL AND OLD.rank IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
    VALUES (
      NEW.user_id, 'rank_change',
      CASE WHEN NEW.rank < OLD.rank THEN 'You moved up!' ELSE 'Ranking update' END,
      CASE WHEN NEW.rank < OLD.rank THEN 'You moved from #' || OLD.rank || ' to #' || NEW.rank ELSE 'You moved from #' || OLD.rank || ' to #' || NEW.rank END,
      NEW.competition_id, NEW.id,
      jsonb_build_object('old_rank', OLD.rank, 'new_rank', NEW.rank, 'direction', CASE WHEN NEW.rank < OLD.rank THEN 'up' ELSE 'down' END)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_rank_change_notification ON contestants;
CREATE TRIGGER trigger_rank_change_notification AFTER UPDATE OF rank ON contestants FOR EACH ROW EXECUTE FUNCTION on_rank_change_notification();

-- Reward assigned notification trigger
CREATE OR REPLACE FUNCTION on_reward_assigned_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_user_id UUID;
  v_reward_name TEXT;
  v_brand_name TEXT;
BEGIN
  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = NEW.contestant_id;
  IF v_contestant_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT name, brand_name INTO v_reward_name, v_brand_name FROM rewards WHERE id = NEW.reward_id;
  INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
  VALUES (
    v_contestant_user_id, 'new_reward', 'You have a new reward!',
    COALESCE(v_brand_name, 'A brand') || ' sent you ' || COALESCE(v_reward_name, 'a reward'),
    NEW.competition_id, NEW.contestant_id,
    jsonb_build_object('reward_id', NEW.reward_id, 'reward_name', v_reward_name, 'brand_name', v_brand_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reward_assigned_notification ON reward_assignments;
CREATE TRIGGER trigger_reward_assigned_notification AFTER INSERT ON reward_assignments FOR EACH ROW EXECUTE FUNCTION on_reward_assigned_notification();

-- Bulk competition notification
CREATE OR REPLACE FUNCTION create_competition_notification(
  p_competition_id UUID, p_type TEXT, p_title TEXT, p_body TEXT,
  p_action_url TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT DISTINCT c.user_id, p_type, p_title, p_body, p_competition_id, p_action_url, p_metadata
  FROM contestants c WHERE c.competition_id = p_competition_id AND c.user_id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT comp.host_id, p_type, p_title, p_body, p_competition_id, p_action_url, p_metadata
  FROM competitions comp
  WHERE comp.id = p_competition_id AND comp.host_id IS NOT NULL
    AND comp.host_id NOT IN (SELECT DISTINCT c.user_id FROM contestants c WHERE c.competition_id = p_competition_id AND c.user_id IS NOT NULL);
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-complete competitions (cron job)
CREATE OR REPLACE FUNCTION auto_complete_competitions()
RETURNS VOID AS $$
BEGIN
  UPDATE competitions
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'live' AND finale_date IS NOT NULL AND finale_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_competition_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_post_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_votes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PROFILES POLICIES
-- =============================================================================
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================
CREATE POLICY "Allow all for organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- CITIES POLICIES
-- =============================================================================
CREATE POLICY "Allow all for cities" ON cities FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- CATEGORIES POLICIES
-- =============================================================================
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Super admins can manage categories" ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- DEMOGRAPHICS POLICIES
-- =============================================================================
CREATE POLICY "Demographics are viewable by everyone" ON demographics FOR SELECT USING (true);
CREATE POLICY "Super admins can manage demographics" ON demographics FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- COMPETITIONS POLICIES
-- =============================================================================
CREATE POLICY "Competitions are viewable by everyone" ON competitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create competitions" ON competitions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own competitions" ON competitions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Super admins can manage all competitions" ON competitions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- CONTESTANTS POLICIES
-- =============================================================================
CREATE POLICY "Contestants are viewable by everyone" ON contestants FOR SELECT USING (true);
CREATE POLICY "Users can update own contestant profile" ON contestants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Hosts can manage contestants" ON contestants FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = contestants.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all contestants" ON contestants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- NOMINEES POLICIES
-- =============================================================================
CREATE POLICY "Users can view nominee by invite token" ON nominees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can create nominations" ON nominees FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can claim their nomination" ON nominees FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Hosts can manage nominees" ON nominees FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = nominees.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all nominees" ON nominees FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- VOTES POLICIES
-- =============================================================================
CREATE POLICY "votes_insert_authenticated" ON votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "votes_select_own" ON votes FOR SELECT TO authenticated USING (auth.uid() = voter_id);
CREATE POLICY "votes_super_admin_all" ON votes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "votes_host_select" ON votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = votes.competition_id AND host_id = auth.uid()));

-- =============================================================================
-- JUDGES POLICIES
-- =============================================================================
CREATE POLICY "Judges are viewable by everyone" ON judges FOR SELECT USING (true);
CREATE POLICY "Hosts can manage judges" ON judges FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = judges.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all judges" ON judges FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- SPONSORS POLICIES
-- =============================================================================
CREATE POLICY "Sponsors are viewable by everyone" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Hosts can manage sponsors" ON sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = sponsors.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all sponsors" ON sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- EVENTS POLICIES
-- =============================================================================
CREATE POLICY "Public events are viewable by everyone" ON events FOR SELECT USING (public_visible = true);
CREATE POLICY "Hosts can view all events" ON events FOR SELECT
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = events.competition_id AND host_id = auth.uid()));
CREATE POLICY "Hosts can manage events" ON events FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = events.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all events" ON events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- ANNOUNCEMENTS POLICIES
-- =============================================================================
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);
CREATE POLICY "Hosts can manage announcements" ON announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions WHERE id = announcements.competition_id AND host_id = auth.uid()));
CREATE POLICY "Super admins can manage all announcements" ON announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- VOTING_ROUNDS POLICIES
-- =============================================================================
CREATE POLICY "voting_rounds_select_policy" ON voting_rounds FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM competitions c WHERE c.id = voting_rounds.competition_id AND c.status IN ('publish', 'live', 'completed'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
CREATE POLICY "voting_rounds_admin_policy" ON voting_rounds FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = voting_rounds.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- NOMINATION_PERIODS POLICIES
-- =============================================================================
CREATE POLICY "nomination_periods_select_policy" ON nomination_periods FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM competitions c WHERE c.id = nomination_periods.competition_id AND c.status IN ('publish', 'live', 'completed'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
CREATE POLICY "nomination_periods_admin_policy" ON nomination_periods FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = nomination_periods.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- REWARDS POLICIES
-- =============================================================================
CREATE POLICY "Anyone can view active rewards" ON rewards FOR SELECT USING (status = 'active');
CREATE POLICY "Super admins can manage all rewards" ON rewards FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- REWARD_ASSIGNMENTS POLICIES
-- =============================================================================
CREATE POLICY "Contestants can view own reward assignments" ON reward_assignments FOR SELECT
  USING (contestant_id IN (SELECT id FROM contestants WHERE user_id = auth.uid()));
CREATE POLICY "Contestants can update own reward assignments" ON reward_assignments FOR UPDATE
  USING (contestant_id IN (SELECT id FROM contestants WHERE user_id = auth.uid()))
  WITH CHECK (contestant_id IN (SELECT id FROM contestants WHERE user_id = auth.uid()));
CREATE POLICY "Nominees can view own reward assignments" ON reward_assignments FOR SELECT
  USING (nominee_id IN (SELECT id FROM nominees WHERE user_id = auth.uid()));
CREATE POLICY "Nominees can update own reward assignments" ON reward_assignments FOR UPDATE
  USING (nominee_id IN (SELECT id FROM nominees WHERE user_id = auth.uid()))
  WITH CHECK (nominee_id IN (SELECT id FROM nominees WHERE user_id = auth.uid()));
CREATE POLICY "Super admins can manage all reward assignments" ON reward_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- REWARD_COMPETITION_ASSIGNMENTS POLICIES
-- =============================================================================
CREATE POLICY "Contestants can view competition reward assignments" ON reward_competition_assignments FOR SELECT
  USING (competition_id IN (SELECT competition_id FROM contestants WHERE user_id = auth.uid()));
CREATE POLICY "Super admins can manage reward competition assignments" ON reward_competition_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- =============================================================================
-- APP_SETTINGS POLICIES
-- =============================================================================
CREATE POLICY "App settings are publicly readable" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Super admins can manage app settings" ON app_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- COMPETITION_ACTIVITY POLICIES
-- =============================================================================
CREATE POLICY "Public can view activity" ON competition_activity FOR SELECT USING (true);
CREATE POLICY "Service role can insert activity" ON competition_activity FOR INSERT WITH CHECK (true);

-- =============================================================================
-- AI_POST_EVENTS POLICIES
-- =============================================================================
CREATE POLICY "Super admins can view ai_post_events" ON ai_post_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "Service role can manage ai_post_events" ON ai_post_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- INTEREST_SUBMISSIONS POLICIES
-- =============================================================================
CREATE POLICY "Anyone can submit interest" ON interest_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Interest submissions viewable by admins" ON interest_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = interest_submissions.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));
CREATE POLICY "Interest submissions updatable by admins" ON interest_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = interest_submissions.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- COMPETITION_PRIZES POLICIES
-- =============================================================================
CREATE POLICY "Competition prizes are viewable by everyone" ON competition_prizes FOR SELECT USING (true);
CREATE POLICY "Hosts can manage competition prizes" ON competition_prizes FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = competition_prizes.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- COMPETITION_RULES POLICIES
-- =============================================================================
CREATE POLICY "Competition rules are viewable by everyone" ON competition_rules FOR SELECT USING (true);
CREATE POLICY "Hosts can manage competition rules" ON competition_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = competition_rules.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- MANUAL_VOTES POLICIES
-- =============================================================================
CREATE POLICY "Manual votes viewable by admins" ON manual_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = manual_votes.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));
CREATE POLICY "Manual votes manageable by admins" ON manual_votes FOR ALL
  USING (EXISTS (SELECT 1 FROM competitions c JOIN profiles p ON p.id = auth.uid() WHERE c.id = manual_votes.competition_id AND (p.is_super_admin = true OR c.host_id = auth.uid())));

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE contestants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- STORAGE BUCKET FOR AVATARS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public avatar read access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- =============================================================================
-- END OF CONSOLIDATED SCHEMA
-- =============================================================================

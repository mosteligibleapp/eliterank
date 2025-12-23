-- Super Admin Migration
-- Adds super admin role and competition template management

-- ============================================
-- ADD ROLE TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'host', 'super_admin'));

-- ============================================
-- COMPETITION TEMPLATES (created by super admin)
-- ============================================
CREATE TABLE IF NOT EXISTS competition_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  season INTEGER NOT NULL,
  description TEXT,
  -- Template settings
  vote_price DECIMAL(6,2) DEFAULT 1.00,
  host_payout_percentage DECIMAL(5,2) DEFAULT 20.00,
  max_contestants INTEGER DEFAULT 30,
  -- Dates (optional - can be set when assigning host)
  nomination_start TIMESTAMPTZ,
  nomination_end TIMESTAMPTZ,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  finals_date TIMESTAMPTZ,
  -- Assigned host (null if unassigned)
  assigned_host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'assigned', 'active', 'completed')),
  -- Metadata
  cover_image_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: one competition per city per season
  UNIQUE(city, season)
);

-- ============================================
-- AVAILABLE CITIES
-- ============================================
CREATE TABLE IF NOT EXISTS available_cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  state TEXT,
  country TEXT DEFAULT 'USA',
  timezone TEXT DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT TRUE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default cities
INSERT INTO available_cities (name, state, cover_image_url) VALUES
  ('New York', 'NY', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop'),
  ('Chicago', 'IL', 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=600&fit=crop'),
  ('Miami', 'FL', 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=600&fit=crop'),
  ('Los Angeles', 'CA', 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=600&fit=crop'),
  ('Dallas', 'TX', 'https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=800&h=600&fit=crop'),
  ('Atlanta', 'GA', 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&h=600&fit=crop'),
  ('Boston', 'MA', 'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800&h=600&fit=crop'),
  ('San Francisco', 'CA', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop'),
  ('Seattle', 'WA', 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&h=600&fit=crop'),
  ('Denver', 'CO', 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&h=600&fit=crop')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- HOST APPLICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS host_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  -- Application details
  experience TEXT,
  social_following INTEGER,
  instagram TEXT,
  linkedin TEXT,
  why_host TEXT,
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One application per user per city
  UNIQUE(user_id, city)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_competition_templates_city ON competition_templates(city);
CREATE INDEX IF NOT EXISTS idx_competition_templates_host ON competition_templates(assigned_host_id);
CREATE INDEX IF NOT EXISTS idx_competition_templates_status ON competition_templates(status);
CREATE INDEX IF NOT EXISTS idx_host_applications_user ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_competition_templates_updated_at
  BEFORE UPDATE ON competition_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_host_applications_updated_at
  BEFORE UPDATE ON host_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE competition_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage templates" ON competition_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Anyone can read active cities
CREATE POLICY "Anyone can read cities" ON available_cities
  FOR SELECT USING (is_active = true);

-- Super admins can manage cities
CREATE POLICY "Super admins can manage cities" ON available_cities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Users can create their own applications
CREATE POLICY "Users can create own applications" ON host_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can read their own applications
CREATE POLICY "Users can read own applications" ON host_applications
  FOR SELECT USING (user_id = auth.uid());

-- Super admins can manage all applications
CREATE POLICY "Super admins can manage applications" ON host_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================
-- HELPER FUNCTION: Create competition from template
-- ============================================
CREATE OR REPLACE FUNCTION create_competition_from_template(template_id UUID)
RETURNS UUID AS $$
DECLARE
  template competition_templates%ROWTYPE;
  new_competition_id UUID;
BEGIN
  SELECT * INTO template FROM competition_templates WHERE id = template_id;

  IF template.assigned_host_id IS NULL THEN
    RAISE EXCEPTION 'Template must have an assigned host';
  END IF;

  INSERT INTO competitions (
    host_id,
    city,
    season,
    status,
    phase,
    vote_price,
    host_payout_percentage,
    nomination_start,
    nomination_end,
    voting_start,
    voting_end,
    finals_date
  ) VALUES (
    template.assigned_host_id,
    template.city,
    template.season,
    'upcoming',
    'setup',
    template.vote_price,
    template.host_payout_percentage,
    template.nomination_start,
    template.nomination_end,
    template.voting_start,
    template.voting_end,
    template.finals_date
  ) RETURNING id INTO new_competition_id;

  -- Update template status
  UPDATE competition_templates SET status = 'active' WHERE id = template_id;

  -- Update host role
  UPDATE profiles SET role = 'host' WHERE id = template.assigned_host_id AND role = 'user';

  RETURN new_competition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

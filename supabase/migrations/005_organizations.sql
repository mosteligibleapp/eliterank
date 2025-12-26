-- EliteRank Organizations Schema
-- Organizations can have multiple competitions

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., 'most-eligible')
  name TEXT NOT NULL,
  logo TEXT, -- Emoji or image URL
  tagline TEXT,
  description TEXT,
  founded_year INTEGER,
  website TEXT,
  instagram TEXT,
  cover_image TEXT,
  -- Owner/admin
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Stats (cached, updated by triggers)
  total_cities INTEGER DEFAULT 0,
  total_contestants INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to competitions table
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_competitions_organization ON competitions(organization_id);

-- Trigger to update organization stats when competition changes
CREATE OR REPLACE FUNCTION update_organization_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the organization's aggregated stats
  UPDATE organizations o SET
    total_cities = (SELECT COUNT(DISTINCT city) FROM competitions WHERE organization_id = o.id),
    total_contestants = (SELECT COALESCE(SUM(total_contestants), 0) FROM competitions WHERE organization_id = o.id),
    total_votes = (SELECT COALESCE(SUM(total_votes), 0) FROM competitions WHERE organization_id = o.id)
  WHERE o.id = COALESCE(NEW.organization_id, OLD.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_stats_on_competition
  AFTER INSERT OR UPDATE OR DELETE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_organization_stats();

-- RLS Policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Anyone can view organizations
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  USING (true);

-- Only organization owners can update their org
CREATE POLICY "Organization owners can update their org"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Seed default organizations
INSERT INTO organizations (slug, name, logo, tagline, description, founded_year, website, instagram, cover_image) VALUES
(
  'most-eligible',
  'Most Eligible',
  '👑',
  'Find Your City''s Most Eligible Singles',
  'Most Eligible is the premier social competition celebrating ambitious singles in major cities across America. Our city-based competitions bring together accomplished professionals who compete for the title of their city''s Most Eligible.',
  2024,
  'mosteligible.com',
  '@mosteligible',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop'
),
(
  'elite-professionals',
  'Elite Professionals',
  '💼',
  'Celebrating Excellence in Business',
  'Elite Professionals showcases the brightest business minds and entrepreneurs in each city. Our competitions highlight innovation, leadership, and professional achievement.',
  2025,
  'eliteprofessionals.com',
  '@eliteprofessionals',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200&h=400&fit=crop'
)
ON CONFLICT (slug) DO NOTHING;

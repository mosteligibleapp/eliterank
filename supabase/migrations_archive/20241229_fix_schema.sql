-- =============================================================================
-- FIX SCHEMA - Run this to set up the required tables
-- =============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all for organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all for cities" ON cities;
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
DROP POLICY IF EXISTS "Organizations are editable by super admins" ON organizations;
DROP POLICY IF EXISTS "Cities are viewable by everyone" ON cities;
DROP POLICY IF EXISTS "Cities are editable by super admins" ON cities;

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- =============================================================================
-- CITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_city_state UNIQUE (name, state)
);

CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- =============================================================================
-- COMPETITION SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL UNIQUE,
    price_per_vote DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    use_price_bundler BOOLEAN NOT NULL DEFAULT false,
    nomination_start TIMESTAMPTZ,
    nomination_end TIMESTAMPTZ,
    finale_date TIMESTAMPTZ,
    allow_manual_votes BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- UPDATE COMPETITIONS TABLE - Add new columns if they don't exist
-- =============================================================================

-- Add organization_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitions' AND column_name = 'organization_id') THEN
        ALTER TABLE competitions ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Add city_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitions' AND column_name = 'city_id') THEN
        ALTER TABLE competitions ADD COLUMN city_id UUID;
    END IF;
END $$;

-- Add season column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'competitions' AND column_name = 'season') THEN
        ALTER TABLE competitions ADD COLUMN season INTEGER DEFAULT 2025;
    END IF;
END $$;

-- Add foreign key constraints (only if columns exist and constraints don't)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'competitions_organization_id_fkey') THEN
        ALTER TABLE competitions
        ADD CONSTRAINT competitions_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'competitions_city_id_fkey') THEN
        ALTER TABLE competitions
        ADD CONSTRAINT competitions_city_id_fkey
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY - Allow all for now (simpler)
-- =============================================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- Cities
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for cities" ON cities FOR ALL USING (true) WITH CHECK (true);

-- Competition Settings
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for competition_settings" ON competition_settings;
CREATE POLICY "Allow all for competition_settings" ON competition_settings FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- Done!
-- =============================================================================

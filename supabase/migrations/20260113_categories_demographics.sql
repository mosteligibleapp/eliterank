-- =============================================================================
-- MIGRATION: Categories and Demographics Tables
-- Date: 2026-01-13
-- Description:
--   - Create categories table for competition categorization (Dating, Business, etc.)
--   - Create demographics table for audience segmentation (Open, Women 21-39, etc.)
--   - Add category_id and demographic_id to competitions table
--   - Add unique constraint for franchise model (org + city + category + demographic + season)
--   - Backfill existing competitions with default values
-- =============================================================================

-- =============================================================================
-- STEP 1: Create categories table
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create index on active status for filtering
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active) WHERE active = TRUE;

-- =============================================================================
-- STEP 2: Create demographics table
-- =============================================================================
CREATE TABLE IF NOT EXISTS demographics (
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

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_demographics_updated_at ON demographics;
CREATE TRIGGER update_demographics_updated_at
    BEFORE UPDATE ON demographics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create index on active status for filtering
CREATE INDEX IF NOT EXISTS idx_demographics_active ON demographics(active) WHERE active = TRUE;

-- =============================================================================
-- STEP 3: Seed categories table
-- =============================================================================
INSERT INTO categories (name, slug, active) VALUES
    ('Dating', 'dating', TRUE),
    ('Business', 'business', TRUE),
    ('Talent', 'talent', TRUE),
    ('Fitness', 'fitness', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- STEP 4: Seed demographics table
-- =============================================================================
INSERT INTO demographics (label, slug, gender, age_min, age_max, active) VALUES
    ('Open (All)', 'open', NULL, NULL, NULL, TRUE),
    ('Women 21-39', 'women-21-39', 'female', 21, 39, TRUE),
    ('Women 40+', 'women-40-plus', 'female', 40, NULL, TRUE),
    ('Men 21-39', 'men-21-39', 'male', 21, 39, TRUE),
    ('Men 40+', 'men-40-plus', 'male', 40, NULL, TRUE),
    ('LGBTQ+ 21-39', 'lgbtq-plus-21-39', 'LGBTQ+', 21, 39, TRUE),
    ('LGBTQ+ 40+', 'lgbtq-plus-40-plus', 'LGBTQ+', 40, NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- STEP 5: Add category_id and demographic_id to competitions table
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS demographic_id UUID REFERENCES demographics(id) ON DELETE SET NULL;

-- Create indexes for the foreign keys
CREATE INDEX IF NOT EXISTS idx_competitions_category ON competitions(category_id);
CREATE INDEX IF NOT EXISTS idx_competitions_demographic ON competitions(demographic_id);

-- =============================================================================
-- STEP 6: Backfill existing competitions with defaults
-- =============================================================================
-- Set category_id to 'dating' (first category) for all existing competitions
UPDATE competitions
SET category_id = (SELECT id FROM categories WHERE slug = 'dating' LIMIT 1)
WHERE category_id IS NULL;

-- Set demographic_id to 'open' for all existing competitions
UPDATE competitions
SET demographic_id = (SELECT id FROM demographics WHERE slug = 'open' LIMIT 1)
WHERE demographic_id IS NULL;

-- =============================================================================
-- STEP 7: Add unique constraint for franchise model
-- Drop old constraint if it exists and create new one
-- =============================================================================
-- Drop old constraint that only checked org + city + season
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS unique_org_city_season;
DROP INDEX IF EXISTS unique_org_city_season;

-- Create new unique constraint including category and demographic
-- This allows multiple competitions in same city/season if they have different category or demographic
CREATE UNIQUE INDEX IF NOT EXISTS unique_competition_slot
    ON competitions(organization_id, city_id, category_id, demographic_id, season)
    WHERE organization_id IS NOT NULL
      AND city_id IS NOT NULL
      AND category_id IS NOT NULL
      AND demographic_id IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    categories_count INTEGER;
    demographics_count INTEGER;
    has_category_id BOOLEAN;
    has_demographic_id BOOLEAN;
    has_unique_index BOOLEAN;
BEGIN
    -- Check categories table
    SELECT COUNT(*) INTO categories_count FROM categories;

    -- Check demographics table
    SELECT COUNT(*) INTO demographics_count FROM demographics;

    -- Check competitions columns
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'category_id'
    ) INTO has_category_id;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'demographic_id'
    ) INTO has_demographic_id;

    -- Check unique index
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'competitions' AND indexname = 'unique_competition_slot'
    ) INTO has_unique_index;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'categories table count: %', categories_count;
    RAISE NOTICE 'demographics table count: %', demographics_count;
    RAISE NOTICE 'competitions.category_id exists: %', has_category_id;
    RAISE NOTICE 'competitions.demographic_id exists: %', has_demographic_id;
    RAISE NOTICE 'unique_competition_slot index exists: %', has_unique_index;

    IF categories_count >= 4 AND demographics_count >= 7 AND has_category_id AND has_demographic_id AND has_unique_index THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

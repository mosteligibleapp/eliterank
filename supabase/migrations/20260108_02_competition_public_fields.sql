-- =============================================================================
-- MIGRATION: Competition Public Fields
-- Date: 2026-01-08
-- Description:
--   - Add about content, theme, and prize pool fields to competitions
--   - These override organization defaults when set
--   - Add slug for clean URLs (e.g., 'chicago-2026')
-- =============================================================================

-- =============================================================================
-- STEP 1: Add prize pool column
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS prize_pool_minimum numeric DEFAULT 1000 NOT NULL;

-- =============================================================================
-- STEP 2: Add about content columns
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS about_tagline text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS about_description text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS about_traits text[];
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS about_age_range text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS about_requirement text;

-- =============================================================================
-- STEP 3: Add theme color columns
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS theme_primary text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS theme_voting text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS theme_resurrection text;

-- =============================================================================
-- STEP 4: Add slug for clean URLs
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug (allows NULL but unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_slug ON competitions(slug) WHERE slug IS NOT NULL;

-- =============================================================================
-- STEP 5: Generate slugs for existing competitions
-- =============================================================================
UPDATE competitions
SET slug = lower(city) || '-' || EXTRACT(YEAR FROM created_at)::text
WHERE slug IS NULL AND city IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_prize_pool BOOLEAN;
    has_tagline BOOLEAN;
    has_traits BOOLEAN;
    has_slug BOOLEAN;
    has_theme_primary BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'prize_pool_minimum'
    ) INTO has_prize_pool;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'about_tagline'
    ) INTO has_tagline;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'about_traits'
    ) INTO has_traits;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'slug'
    ) INTO has_slug;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'theme_primary'
    ) INTO has_theme_primary;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'competitions.prize_pool_minimum exists: %', has_prize_pool;
    RAISE NOTICE 'competitions.about_tagline exists: %', has_tagline;
    RAISE NOTICE 'competitions.about_traits exists: %', has_traits;
    RAISE NOTICE 'competitions.slug exists: %', has_slug;
    RAISE NOTICE 'competitions.theme_primary exists: %', has_theme_primary;

    IF has_prize_pool AND has_tagline AND has_traits AND has_slug AND has_theme_primary THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

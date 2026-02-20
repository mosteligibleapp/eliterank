-- =============================================================================
-- MIGRATION: Organization Defaults
-- Date: 2026-01-08
-- Description:
--   - Add default about content and theme colors to organizations table
--   - These serve as templates that competitions inherit
-- =============================================================================

-- =============================================================================
-- STEP 1: Add default about content columns
-- =============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_about_tagline text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_about_description text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_about_traits text[] DEFAULT ARRAY['Ambitious professionals', 'Community leaders', 'Social innovators', 'Culture shapers'];
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_age_range text DEFAULT '21-45';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_requirement text DEFAULT 'Single & city-based';

-- =============================================================================
-- STEP 2: Add default theme colors
-- =============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_theme_primary text DEFAULT '#d4af37';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_theme_voting text DEFAULT '#f472b6';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_theme_resurrection text DEFAULT '#8b5cf6';

-- =============================================================================
-- STEP 3: Set defaults for existing "Most Eligible" organization
-- =============================================================================
UPDATE organizations
SET
  default_about_tagline = 'The premier singles competition',
  default_about_description = 'A celebration of the city''s most dynamic, successful, and eligible singles. Where ambition meets charm, and community crowns its champions.'
WHERE slug = 'most-eligible' OR name ILIKE '%most eligible%';

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_tagline BOOLEAN;
    has_description BOOLEAN;
    has_traits BOOLEAN;
    has_theme_primary BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'default_about_tagline'
    ) INTO has_tagline;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'default_about_description'
    ) INTO has_description;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'default_about_traits'
    ) INTO has_traits;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'default_theme_primary'
    ) INTO has_theme_primary;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'organizations.default_about_tagline exists: %', has_tagline;
    RAISE NOTICE 'organizations.default_about_description exists: %', has_description;
    RAISE NOTICE 'organizations.default_about_traits exists: %', has_traits;
    RAISE NOTICE 'organizations.default_theme_primary exists: %', has_theme_primary;

    IF has_tagline AND has_description AND has_traits AND has_theme_primary THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

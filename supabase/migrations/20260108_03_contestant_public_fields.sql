-- =============================================================================
-- MIGRATION: Contestant Public Fields
-- Date: 2026-01-08
-- Description:
--   - Add slug for clean profile URLs
--   - Add profile views and external shares tracking
-- =============================================================================

-- =============================================================================
-- STEP 1: Add slug and engagement tracking columns
-- =============================================================================
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS profile_views integer DEFAULT 0;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS external_shares integer DEFAULT 0;

-- =============================================================================
-- STEP 2: Create index for slug lookups
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_contestants_slug ON contestants(slug);

-- =============================================================================
-- STEP 3: Generate slugs for existing contestants (lowercase, hyphenated)
-- =============================================================================
UPDATE contestants
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL AND name IS NOT NULL;

-- =============================================================================
-- STEP 4: Handle duplicate slugs by appending id fragment
-- =============================================================================
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY competition_id, slug ORDER BY created_at) as rn
  FROM contestants
  WHERE slug IS NOT NULL
)
UPDATE contestants c
SET slug = c.slug || '-' || substring(c.id::text, 1, 4)
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_slug BOOLEAN;
    has_profile_views BOOLEAN;
    has_external_shares BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contestants' AND column_name = 'slug'
    ) INTO has_slug;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contestants' AND column_name = 'profile_views'
    ) INTO has_profile_views;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contestants' AND column_name = 'external_shares'
    ) INTO has_external_shares;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'contestants.slug exists: %', has_slug;
    RAISE NOTICE 'contestants.profile_views exists: %', has_profile_views;
    RAISE NOTICE 'contestants.external_shares exists: %', has_external_shares;

    IF has_slug AND has_profile_views AND has_external_shares THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

-- ============================================================================
-- COMPETITIONS TABLE CLEANUP MIGRATION
--
-- This migration:
-- 1. Populates missing slugs for all competitions
-- 2. Adds NOT NULL and UNIQUE constraints to slug
-- 3. Removes redundant 'city' text column (use city_id FK instead)
-- 4. Removes duplicate 'finale_date' column (keep 'finals_date')
-- 5. Adds helpful indexes
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Create helper function for slug generation
-- ============================================================================

CREATE OR REPLACE FUNCTION slugify(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            COALESCE(input_text, ''),
            '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
          ),
          '[\s_]+', '-', 'g'            -- Replace spaces with dashes
        ),
        '-+', '-', 'g'                  -- Collapse multiple dashes
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Populate missing slugs
-- Format: {name}-{city}-{year}[-{demographic}]
-- ============================================================================

-- First, let's see what we're working with
DO $$
DECLARE
  null_slug_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_slug_count FROM competitions WHERE slug IS NULL OR slug = '';
  SELECT COUNT(*) INTO total_count FROM competitions;
  RAISE NOTICE 'Competitions with missing slugs: % / %', null_slug_count, total_count;
END $$;

-- Update competitions with missing slugs
UPDATE competitions c
SET slug = (
  SELECT
    CASE
      -- With demographic (not open)
      WHEN d.slug IS NOT NULL AND d.slug != 'open' THEN
        CONCAT(
          slugify(COALESCE(c.name, org.name, 'competition')),
          '-',
          LOWER(REGEXP_REPLACE(COALESCE(ci.slug, ci.name, 'unknown'), '-[a-z]{2}$', '', 'i')),
          '-',
          c.season::text,
          '-',
          d.slug
        )
      -- Without demographic (open)
      ELSE
        CONCAT(
          slugify(COALESCE(c.name, org.name, 'competition')),
          '-',
          LOWER(REGEXP_REPLACE(COALESCE(ci.slug, ci.name, 'unknown'), '-[a-z]{2}$', '', 'i')),
          '-',
          c.season::text
        )
    END
  FROM cities ci
  JOIN organizations org ON c.organization_id = org.id
  LEFT JOIN demographics d ON c.demographic_id = d.id
  WHERE c.city_id = ci.id
)
WHERE c.slug IS NULL OR c.slug = '';

-- Verify all slugs are populated
DO $$
DECLARE
  null_slug_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_slug_count FROM competitions WHERE slug IS NULL OR slug = '';
  IF null_slug_count > 0 THEN
    RAISE WARNING 'Still have % competitions without slugs - manual review needed', null_slug_count;
  ELSE
    RAISE NOTICE 'All competitions now have slugs';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add constraints to slug column
-- ============================================================================

-- Make slug NOT NULL (only if all slugs are populated)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM competitions WHERE slug IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE competitions ALTER COLUMN slug SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to slug column';
  ELSE
    RAISE WARNING 'Cannot add NOT NULL - % rows have NULL slug', null_count;
  END IF;
END $$;

-- Add unique constraint per organization (org can't have duplicate slugs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competitions_org_slug_unique'
  ) THEN
    ALTER TABLE competitions
    ADD CONSTRAINT competitions_org_slug_unique UNIQUE (organization_id, slug);
    RAISE NOTICE 'Added unique constraint on (organization_id, slug)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'Cannot add unique constraint - duplicate slugs exist. Run: SELECT organization_id, slug, COUNT(*) FROM competitions GROUP BY organization_id, slug HAVING COUNT(*) > 1;';
END $$;

-- ============================================================================
-- STEP 4: Verify 'city' text column can be removed
-- (We use city_id foreign key instead)
-- NOTE: Not dropping yet - some code may still reference comp.city
-- ============================================================================

-- Verify city_id is populated for all rows
DO $$
DECLARE
  null_city_id_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_city_id_count FROM competitions WHERE city_id IS NULL;
  IF null_city_id_count > 0 THEN
    RAISE WARNING 'Found % rows with NULL city_id - these need city_id populated before removing city column', null_city_id_count;
  ELSE
    RAISE NOTICE 'All competitions have city_id populated. Safe to remove city column after updating code.';
  END IF;
END $$;

-- TODO: After verifying all code uses city_id (via cities table join), run:
-- ALTER TABLE competitions DROP COLUMN IF EXISTS city;

-- ============================================================================
-- STEP 5: Handle 'finale_date' vs 'finals_date' columns
-- NOTE: The codebase currently uses 'finale_date' in many places.
-- This step copies data but does NOT drop the column yet.
-- After updating all code references, run a separate migration to drop it.
-- ============================================================================

DO $$
BEGIN
  -- Copy any data from finale_date to finals_date if finals_date is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'finale_date'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'finals_date'
  ) THEN
    UPDATE competitions
    SET finals_date = finale_date
    WHERE finals_date IS NULL AND finale_date IS NOT NULL;

    RAISE NOTICE 'Synced finale_date → finals_date. Column NOT dropped - update code first.';
  ELSE
    RAISE NOTICE 'finale_date or finals_date column does not exist';
  END IF;
END $$;

-- TODO: After updating code to use finals_date everywhere, run:
-- ALTER TABLE competitions DROP COLUMN IF EXISTS finale_date;

-- ============================================================================
-- STEP 6: Add indexes for performance
-- ============================================================================

-- Index on slug for direct lookups
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON competitions(slug);

-- Composite index for org + slug lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_competitions_org_slug ON competitions(organization_id, slug);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);

-- Index on season for filtering
CREATE INDEX IF NOT EXISTS idx_competitions_season ON competitions(season);

-- ============================================================================
-- STEP 7: Cleanup
-- ============================================================================

DROP FUNCTION IF EXISTS slugify(TEXT);

-- ============================================================================
-- VERIFICATION: Show final state
-- ============================================================================

SELECT
  id,
  name,
  slug,
  season,
  status
FROM competitions
ORDER BY created_at DESC
LIMIT 10;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'competitions'
ORDER BY ordinal_position;

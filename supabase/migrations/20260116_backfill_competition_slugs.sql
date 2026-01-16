-- =============================================================================
-- MIGRATION: Backfill Competition Slugs
-- Date: 2026-01-16
-- Description:
--   - Populate NULL slug values for existing competitions
--   - Format: {city-slug}-{season} for open demographic
--   - Format: {city-slug}-{demographic-slug}-{season} for specific demographic
-- =============================================================================

-- =============================================================================
-- STEP 1: Backfill slugs for competitions with "open" demographic
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
    '-',
    c.season::text
)
FROM cities ci
JOIN demographics d ON d.id = c.demographic_id
WHERE c.slug IS NULL
  AND c.city_id = ci.id
  AND d.slug = 'open';

-- =============================================================================
-- STEP 2: Backfill slugs for competitions with specific demographic
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
    '-',
    d.slug,
    '-',
    c.season::text
)
FROM cities ci
JOIN demographics d ON d.id = c.demographic_id
WHERE c.slug IS NULL
  AND c.city_id = ci.id
  AND d.slug != 'open';

-- =============================================================================
-- STEP 3: Fallback for competitions without city_id (use city text field)
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    LOWER(REGEXP_REPLACE(c.city, '[^a-zA-Z0-9]+', '-', 'g')),
    '-',
    c.season::text
)
WHERE c.slug IS NULL
  AND c.city IS NOT NULL
  AND c.city_id IS NULL;

-- =============================================================================
-- STEP 4: Handle duplicate slugs by appending short UUID
-- =============================================================================
WITH duplicates AS (
    SELECT
        id,
        slug,
        ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM competitions
    WHERE slug IS NOT NULL
)
UPDATE competitions c
SET slug = c.slug || '-' || SUBSTRING(c.id::text, 1, 4)
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    total_competitions INTEGER;
    null_slugs INTEGER;
    duplicate_slugs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_competitions FROM competitions;
    SELECT COUNT(*) INTO null_slugs FROM competitions WHERE slug IS NULL;
    SELECT COUNT(*) - COUNT(DISTINCT slug) INTO duplicate_slugs
    FROM competitions WHERE slug IS NOT NULL;

    RAISE NOTICE '=== BACKFILL VERIFICATION ===';
    RAISE NOTICE 'Total competitions: %', total_competitions;
    RAISE NOTICE 'Competitions with NULL slug: %', null_slugs;
    RAISE NOTICE 'Duplicate slugs: %', duplicate_slugs;

    IF null_slugs = 0 AND duplicate_slugs = 0 THEN
        RAISE NOTICE '=== BACKFILL SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== BACKFILL INCOMPLETE ===';
    END IF;
END $$;

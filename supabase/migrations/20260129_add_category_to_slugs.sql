-- =============================================================================
-- MIGRATION: Add Category to Competition Slugs
-- Date: 2026-01-29
-- Description:
--   - Update all competition slugs to include category for uniqueness
--   - New format: {category-slug}-{city-slug}-{season} for open demographic
--   - New format: {category-slug}-{city-slug}-{demographic-slug}-{season} for specific demographic
-- =============================================================================

-- =============================================================================
-- STEP 1: Update slugs for competitions with "open" demographic
-- Format: {category}-{city}-{year}
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    cat.slug,
    '-',
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
    '-',
    c.season::text
)
FROM cities ci
JOIN demographics d ON d.id = c.demographic_id
JOIN categories cat ON cat.id = c.category_id
WHERE c.city_id = ci.id
  AND d.slug = 'open'
  AND c.category_id IS NOT NULL;

-- =============================================================================
-- STEP 2: Update slugs for competitions with specific demographic
-- Format: {category}-{city}-{demographic}-{year}
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    cat.slug,
    '-',
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
    '-',
    d.slug,
    '-',
    c.season::text
)
FROM cities ci
JOIN demographics d ON d.id = c.demographic_id
JOIN categories cat ON cat.id = c.category_id
WHERE c.city_id = ci.id
  AND d.slug != 'open'
  AND c.category_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Fallback for competitions without category (use 'general')
-- =============================================================================
UPDATE competitions c
SET slug = CONCAT(
    'general',
    '-',
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
    '-',
    c.season::text
)
FROM cities ci
JOIN demographics d ON d.id = c.demographic_id
WHERE c.city_id = ci.id
  AND d.slug = 'open'
  AND c.category_id IS NULL
  AND c.slug IS NOT NULL
  AND c.slug NOT LIKE '%-%-%-%';

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
    duplicate_slugs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_competitions FROM competitions;
    SELECT COUNT(*) - COUNT(DISTINCT slug) INTO duplicate_slugs
    FROM competitions WHERE slug IS NOT NULL;

    RAISE NOTICE '=== SLUG UPDATE VERIFICATION ===';
    RAISE NOTICE 'Total competitions: %', total_competitions;
    RAISE NOTICE 'Duplicate slugs: %', duplicate_slugs;

    IF duplicate_slugs = 0 THEN
        RAISE NOTICE '=== SLUG UPDATE SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== SLUG UPDATE INCOMPLETE - DUPLICATES EXIST ===';
    END IF;
END $$;

-- ============================================================================
-- FIX COMPETITION SLUGS
-- Updates ALL competition slugs to consistent format: {name}-{city}-{year}[-{demographic}]
-- ============================================================================

-- Helper function to generate slug (mirrors JS generateSlug function)
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(input_text, '[^\w\s-]', '', 'g'),  -- Remove special chars
          '[\s_-]+', '-', 'g'                               -- Replace spaces/underscores with dashes
        ),
        '^-+|-+$', '', 'g'                                  -- Remove leading/trailing dashes
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update all competition slugs to new format
-- Format: {name}-{city}-{year} for open demographic
-- Format: {name}-{city}-{year}-{demographic} for specific demographic
UPDATE competitions c
SET slug = CASE
  -- If demographic is null or 'open': name-city-year
  WHEN d.slug IS NULL OR d.slug = 'open' THEN
    CONCAT(
      generate_slug(COALESCE(c.name, cat.name, org.name, 'competition')),
      '-',
      REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
      '-',
      c.season::text
    )
  -- If specific demographic: name-city-year-demographic
  ELSE
    CONCAT(
      generate_slug(COALESCE(c.name, cat.name, org.name, 'competition')),
      '-',
      REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', ''),
      '-',
      c.season::text,
      '-',
      d.slug
    )
END
FROM cities ci
JOIN organizations org ON c.organization_id = org.id
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN demographics d ON c.demographic_id = d.id
WHERE c.city_id = ci.id;

-- Verify no duplicate slugs per organization
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT organization_id, slug, COUNT(*)
    FROM competitions
    GROUP BY organization_id, slug
    HAVING COUNT(*) > 1
  ) duplicates;

  IF dup_count > 0 THEN
    RAISE WARNING 'Found % duplicate slug combinations. Manual review needed.', dup_count;
  END IF;
END $$;

-- Add index on slug for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_competitions_slug ON competitions(slug);
CREATE INDEX IF NOT EXISTS idx_competitions_org_slug ON competitions(organization_id, slug);

-- Clean up helper function
DROP FUNCTION IF EXISTS generate_slug(TEXT);

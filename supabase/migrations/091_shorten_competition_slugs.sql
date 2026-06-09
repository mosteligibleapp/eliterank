-- =============================================================================
-- MIGRATION: Shorten competition slugs (SEO) + preserve old slugs
-- =============================================================================
-- The old slug format embedded the freeform competition name AND the
-- demographic, which duplicated each other and produced very long URLs, e.g.
--   elite-single-women-chicago-2026-women-21-39
--
-- New canonical format (org slug is always the first URL segment, so it is
-- omitted here):
--   {city}-{year}                 for the "open" demographic
--   {city}-{year}-{demographic}   for a specific demographic
-- e.g.  chicago-2026  /  chicago-2026-women-21-39
--
-- Old URLs must keep working: the current slug is copied into a new
-- `legacy_slug` column before it is overwritten. The app resolves a request
-- against slug OR legacy_slug and 301-redirects legacy hits to the canonical
-- short URL.
--
-- Idempotent: re-running keeps the originally-captured legacy_slug (the
-- backfill is guarded by `legacy_slug IS NULL`) and recomputes the same
-- deterministic short slug.
-- =============================================================================

-- 1. New column to remember the pre-shortening slug -------------------------
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS legacy_slug TEXT;

-- 2. Drop the GLOBAL unique slug index up front so the bulk rewrite below
--    doesn't trip over transient duplicates, and because uniqueness is really
--    a per-organization concern (franchise model: two orgs may both run
--    "chicago-2026"). The lookups already scope by organization_id.
DROP INDEX IF EXISTS idx_competitions_slug;

-- 3. Helper: mirrors the JS slugify() in src/utils/slugs.js ------------------
CREATE OR REPLACE FUNCTION pg_temp.generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(BOTH '-' FROM
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(COALESCE(input_text, ''), '[^\w\s-]', '', 'g'),
          '[\s_]+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Capture the existing slug as legacy_slug (only once) --------------------
UPDATE competitions
SET legacy_slug = slug
WHERE slug IS NOT NULL
  AND legacy_slug IS NULL;

-- 5. Recompute the canonical short slug for every competition that has a city.
--    Demographic suffix is dropped for the "open" demographic (or none).
UPDATE competitions c
SET slug = (
  SELECT
    REGEXP_REPLACE(LOWER(ci.slug), '-[a-z]{2}$', '')  -- city, state suffix stripped
    || '-' || c.season::text
    || CASE
         WHEN d.slug IS NULL OR d.slug = 'open' THEN ''
         ELSE '-' || d.slug
       END
  FROM cities ci
  LEFT JOIN demographics d ON d.id = c.demographic_id
  WHERE ci.id = c.city_id
)
WHERE c.city_id IS NOT NULL;

-- 6. Fallback for legacy/manual competitions with no city_id: derive from the
--    free-text city column when present, otherwise keep the old slug.
UPDATE competitions c
SET slug = pg_temp.generate_slug(c.city) || '-' || c.season::text
WHERE c.city_id IS NULL
  AND c.city IS NOT NULL
  AND c.season IS NOT NULL;

-- 7. De-duplicate within an organization by appending a short id suffix.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY organization_id, slug ORDER BY created_at) AS rn
  FROM competitions
  WHERE slug IS NOT NULL
)
UPDATE competitions c
SET slug = c.slug || '-' || SUBSTRING(c.id::text, 1, 4)
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 8. Recreate uniqueness as a per-organization constraint, and index the
--    legacy slug so old-URL lookups stay fast.
DROP INDEX IF EXISTS idx_competitions_org_slug;
CREATE UNIQUE INDEX idx_competitions_org_slug
  ON competitions(organization_id, slug)
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_competitions_legacy_slug
  ON competitions(legacy_slug)
  WHERE legacy_slug IS NOT NULL;

-- 9. Report ------------------------------------------------------------------
DO $$
DECLARE
  total       INTEGER;
  with_legacy INTEGER;
  dupes       INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM competitions;
  SELECT COUNT(*) INTO with_legacy FROM competitions WHERE legacy_slug IS NOT NULL;
  SELECT COUNT(*) INTO dupes FROM (
    SELECT organization_id, slug FROM competitions
    WHERE slug IS NOT NULL
    GROUP BY organization_id, slug HAVING COUNT(*) > 1
  ) q;

  RAISE NOTICE '=== SLUG SHORTENING ===';
  RAISE NOTICE 'Competitions: %, legacy slugs preserved: %, per-org dup slugs: %',
    total, with_legacy, dupes;
END $$;

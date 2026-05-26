-- Unify prize ownership under sponsors:
--   - Drop sponsors.UNIQUE(competition_id, tier) (frontend supports multi-per-tier via TIER_CAPS).
--   - Replace tier check with lowercase enum + 'inkind'.
--   - Backfill: each unique sponsor_name typed on a competition_prizes row becomes an
--     in-kind sponsor; existing prizes are linked via sponsor_id.

ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_competition_tier_unique;
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_tier_check;
ALTER TABLE sponsors ALTER COLUMN tier SET DEFAULT 'gold';
ALTER TABLE sponsors
  ADD CONSTRAINT sponsors_tier_check
  CHECK (tier IN ('platinum','gold','silver','inkind'));

WITH unique_prize_sponsors AS (
  SELECT
    competition_id,
    LOWER(TRIM(sponsor_name)) AS name_key,
    (ARRAY_AGG(sponsor_name ORDER BY created_at NULLS LAST))[1] AS canonical_name
  FROM competition_prizes
  WHERE sponsor_id IS NULL AND sponsor_name IS NOT NULL AND TRIM(sponsor_name) <> ''
  GROUP BY competition_id, LOWER(TRIM(sponsor_name))
)
INSERT INTO sponsors (competition_id, name, tier, amount)
SELECT u.competition_id, u.canonical_name, 'inkind', 0
FROM unique_prize_sponsors u
WHERE NOT EXISTS (
  SELECT 1 FROM sponsors s
  WHERE s.competition_id = u.competition_id
    AND LOWER(TRIM(s.name)) = u.name_key
);

UPDATE competition_prizes cp
SET sponsor_id = s.id
FROM sponsors s
WHERE cp.sponsor_id IS NULL
  AND cp.sponsor_name IS NOT NULL
  AND cp.competition_id = s.competition_id
  AND LOWER(TRIM(cp.sponsor_name)) = LOWER(TRIM(s.name));

-- =============================================================================
-- MIGRATION: Competition Settings (Prize, Geography, Contestant Limits)
-- Date: 2026-01-15
-- Description:
--   - Add minimum_prize_cents column for host-funded prize pool
--   - Add eligibility_radius_miles column for geographic restrictions
--   - Add min_contestants and max_contestants columns
-- =============================================================================

-- =============================================================================
-- STEP 1: Add new columns to competitions table
-- =============================================================================

-- Minimum prize in cents (default $1,000 = 100000 cents)
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS minimum_prize_cents INTEGER NOT NULL DEFAULT 100000;

-- Eligibility radius in miles (0 = must reside in city)
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS eligibility_radius_miles INTEGER NOT NULL DEFAULT 100;

-- Minimum contestants required to launch voting
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS min_contestants INTEGER NOT NULL DEFAULT 40;

-- Maximum contestants allowed (null = no limit)
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS max_contestants INTEGER DEFAULT NULL;

-- =============================================================================
-- STEP 2: Add check constraints for validation
-- =============================================================================

-- Ensure minimum prize is at least $1,000 (100000 cents)
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS chk_minimum_prize;

ALTER TABLE competitions
ADD CONSTRAINT chk_minimum_prize CHECK (minimum_prize_cents >= 100000);

-- Ensure eligibility radius is a valid option
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS chk_eligibility_radius;

ALTER TABLE competitions
ADD CONSTRAINT chk_eligibility_radius CHECK (eligibility_radius_miles IN (0, 10, 25, 50, 100));

-- Ensure min contestants is at least 10
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS chk_min_contestants;

ALTER TABLE competitions
ADD CONSTRAINT chk_min_contestants CHECK (min_contestants >= 10);

-- Ensure max contestants > min contestants (when max is set)
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS chk_max_contestants;

ALTER TABLE competitions
ADD CONSTRAINT chk_max_contestants CHECK (max_contestants IS NULL OR max_contestants > min_contestants);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_minimum_prize BOOLEAN;
    has_eligibility_radius BOOLEAN;
    has_min_contestants BOOLEAN;
    has_max_contestants BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'minimum_prize_cents'
    ) INTO has_minimum_prize;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'eligibility_radius_miles'
    ) INTO has_eligibility_radius;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'min_contestants'
    ) INTO has_min_contestants;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'max_contestants'
    ) INTO has_max_contestants;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'minimum_prize_cents exists: %', has_minimum_prize;
    RAISE NOTICE 'eligibility_radius_miles exists: %', has_eligibility_radius;
    RAISE NOTICE 'min_contestants exists: %', has_min_contestants;
    RAISE NOTICE 'max_contestants exists: %', has_max_contestants;

    IF has_minimum_prize AND has_eligibility_radius AND has_min_contestants AND has_max_contestants THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE ===';
    END IF;
END $$;

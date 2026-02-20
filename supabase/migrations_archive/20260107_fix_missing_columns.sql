-- =============================================================================
-- MIGRATION: Fix Missing Columns
-- Date: 2026-01-07
-- Description: Adds missing columns that code expects but weren't in migrations
-- =============================================================================

-- =============================================================================
-- STEP 1: Add missing columns to nominees table
-- =============================================================================
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS nominator_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS nominator_wants_updates BOOLEAN DEFAULT TRUE;

-- =============================================================================
-- STEP 2: Add back columns to profiles that views reference
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- =============================================================================
-- STEP 3: Add city column to competitions for backwards compatibility
-- Some code and edge functions reference competitions.city directly
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS city TEXT;

-- Populate city from cities table if city_id exists
UPDATE competitions c
SET city = ci.name
FROM cities ci
WHERE c.city_id = ci.id
AND c.city IS NULL;

-- =============================================================================
-- STEP 4: Add missing date columns to competitions
-- Edge functions reference these directly on competitions table
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS nomination_start TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS nomination_end TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS voting_start TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS voting_end TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS finals_date TIMESTAMPTZ;

-- Also ensure finale_date exists (some code uses this name)
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS finale_date TIMESTAMPTZ;

-- =============================================================================
-- STEP 5: Add winners array to competitions for results_announced event
-- =============================================================================
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS winners UUID[] DEFAULT '{}';

-- =============================================================================
-- STEP 6: Ensure contestants has all expected columns
-- =============================================================================
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS eliminated_in_round INTEGER;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS advancement_status TEXT;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS current_round INTEGER;

-- =============================================================================
-- STEP 7: Ensure profiles has stats columns for views
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gallery TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_votes_received INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_competitions INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_placement INTEGER;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    nominees_has_anonymous BOOLEAN;
    nominees_has_updates BOOLEAN;
    profiles_has_tiktok BOOLEAN;
    competitions_has_city BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nominees' AND column_name = 'nominator_anonymous'
    ) INTO nominees_has_anonymous;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nominees' AND column_name = 'nominator_wants_updates'
    ) INTO nominees_has_updates;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'tiktok'
    ) INTO profiles_has_tiktok;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'city'
    ) INTO competitions_has_city;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'nominees.nominator_anonymous exists: %', nominees_has_anonymous;
    RAISE NOTICE 'nominees.nominator_wants_updates exists: %', nominees_has_updates;
    RAISE NOTICE 'profiles.tiktok exists: %', profiles_has_tiktok;
    RAISE NOTICE 'competitions.city exists: %', competitions_has_city;

    IF nominees_has_anonymous AND nominees_has_updates AND profiles_has_tiktok AND competitions_has_city THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

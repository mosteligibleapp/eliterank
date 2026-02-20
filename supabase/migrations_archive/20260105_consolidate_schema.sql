-- =============================================================================
-- MIGRATION: Consolidate Database Schema
-- Date: 2026-01-05
-- Description:
--   - Merges competition_settings into competitions table
--   - Standardizes finale_date naming
--   - Ensures voting_rounds table exists with round_type
--   - Cleans up redundant date fields
-- =============================================================================

-- =============================================================================
-- STEP 1: Add settings columns to competitions table
-- =============================================================================
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS price_per_vote DECIMAL(10, 2) DEFAULT 1.00;

ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS use_price_bundler BOOLEAN DEFAULT false;

ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS allow_manual_votes BOOLEAN DEFAULT false;

-- Standardize finale_date naming (add if not exists)
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS finale_date TIMESTAMPTZ;

-- =============================================================================
-- STEP 2: Migrate data from competition_settings to competitions
-- =============================================================================
-- Only runs if competition_settings table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competition_settings') THEN
        -- Migrate price_per_vote
        UPDATE competitions c
        SET price_per_vote = cs.price_per_vote
        FROM competition_settings cs
        WHERE c.id = cs.competition_id
        AND cs.price_per_vote IS NOT NULL
        AND (c.price_per_vote IS NULL OR c.price_per_vote = 1.00);

        -- Migrate use_price_bundler
        UPDATE competitions c
        SET use_price_bundler = cs.use_price_bundler
        FROM competition_settings cs
        WHERE c.id = cs.competition_id
        AND cs.use_price_bundler IS NOT NULL;

        -- Migrate allow_manual_votes
        UPDATE competitions c
        SET allow_manual_votes = cs.allow_manual_votes
        FROM competition_settings cs
        WHERE c.id = cs.competition_id
        AND cs.allow_manual_votes IS NOT NULL;

        -- Migrate finale_date from competition_settings
        UPDATE competitions c
        SET finale_date = COALESCE(cs.finale_date, c.finale_date)
        FROM competition_settings cs
        WHERE c.id = cs.competition_id
        AND cs.finale_date IS NOT NULL;

        RAISE NOTICE 'Data migrated from competition_settings to competitions';
    ELSE
        RAISE NOTICE 'competition_settings table does not exist, skipping migration';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Create voting_rounds table if it doesn't exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS voting_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Round 1',
    round_order INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    contestants_advance INTEGER NOT NULL DEFAULT 10,
    round_type VARCHAR(20) NOT NULL DEFAULT 'voting' CHECK (round_type IN ('voting', 'judging')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_voting_round_order UNIQUE (competition_id, round_order)
);

-- Add round_type if table existed without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'voting_rounds' AND column_name = 'round_type'
    ) THEN
        ALTER TABLE voting_rounds
        ADD COLUMN round_type VARCHAR(20) NOT NULL DEFAULT 'voting'
        CHECK (round_type IN ('voting', 'judging'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_voting_rounds_competition ON voting_rounds(competition_id);

-- =============================================================================
-- STEP 4: Create nomination_periods table if it doesn't exist
-- =============================================================================
CREATE TABLE IF NOT EXISTS nomination_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Open Nominations',
    period_order INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_submissions INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_nomination_period_order UNIQUE (competition_id, period_order)
);

CREATE INDEX IF NOT EXISTS idx_nomination_periods_competition ON nomination_periods(competition_id);

-- =============================================================================
-- STEP 5: RLS for voting_rounds (safe to re-run)
-- =============================================================================
ALTER TABLE voting_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voting_rounds_select_policy" ON voting_rounds;
DROP POLICY IF EXISTS "voting_rounds_admin_policy" ON voting_rounds;

CREATE POLICY "voting_rounds_select_policy" ON voting_rounds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = voting_rounds.competition_id
            AND c.status IN ('publish', 'live', 'completed')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "voting_rounds_admin_policy" ON voting_rounds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN profiles p ON p.id = auth.uid()
            WHERE c.id = voting_rounds.competition_id
            AND (p.is_super_admin = true OR c.host_id = auth.uid())
        )
    );

-- =============================================================================
-- STEP 6: RLS for nomination_periods (safe to re-run)
-- =============================================================================
ALTER TABLE nomination_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomination_periods_select_policy" ON nomination_periods;
DROP POLICY IF EXISTS "nomination_periods_super_admin_policy" ON nomination_periods;
DROP POLICY IF EXISTS "nomination_periods_host_policy" ON nomination_periods;

CREATE POLICY "nomination_periods_select_policy" ON nomination_periods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = nomination_periods.competition_id
            AND c.status IN ('publish', 'live', 'completed')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "nomination_periods_admin_policy" ON nomination_periods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN profiles p ON p.id = auth.uid()
            WHERE c.id = nomination_periods.competition_id
            AND (p.is_super_admin = true OR c.host_id = auth.uid())
        )
    );

-- =============================================================================
-- STEP 7: Drop competition_settings table
-- =============================================================================
DROP TABLE IF EXISTS competition_settings CASCADE;

-- =============================================================================
-- STEP 8: Clean up redundant columns (keep for backwards compatibility, mark deprecated)
-- Note: We keep nomination_start/end and voting_start/end for now as fallbacks
-- They will be fully removed in a future migration after code is updated
-- =============================================================================

-- Add comments to mark deprecated columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'nomination_start') THEN
        COMMENT ON COLUMN competitions.nomination_start IS 'DEPRECATED: Use nomination_periods table instead';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'nomination_end') THEN
        COMMENT ON COLUMN competitions.nomination_end IS 'DEPRECATED: Use nomination_periods table instead';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'voting_start') THEN
        COMMENT ON COLUMN competitions.voting_start IS 'DEPRECATED: Use voting_rounds table instead';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competitions' AND column_name = 'voting_end') THEN
        COMMENT ON COLUMN competitions.voting_end IS 'DEPRECATED: Use voting_rounds table instead';
    END IF;
END $$;

-- =============================================================================
-- STEP 9: Create helper view for backwards compatibility
-- =============================================================================
CREATE OR REPLACE VIEW competition_with_timing AS
SELECT
    c.*,
    -- Get first nomination period dates as fallback
    (SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id) as first_nomination_start,
    (SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id) as last_nomination_end,
    -- Get first voting round dates as fallback
    (SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as first_voting_start,
    (SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting') as last_voting_end,
    -- Effective dates (prefer periods/rounds, fallback to legacy columns)
    COALESCE(
        (SELECT MIN(start_date) FROM nomination_periods np WHERE np.competition_id = c.id),
        c.nomination_start
    ) as effective_nomination_start,
    COALESCE(
        (SELECT MAX(end_date) FROM nomination_periods np WHERE np.competition_id = c.id),
        c.nomination_end
    ) as effective_nomination_end,
    COALESCE(
        (SELECT MIN(start_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'),
        c.voting_start
    ) as effective_voting_start,
    COALESCE(
        (SELECT MAX(end_date) FROM voting_rounds vr WHERE vr.competition_id = c.id AND vr.round_type = 'voting'),
        c.voting_end
    ) as effective_voting_end
FROM competitions c;

COMMENT ON VIEW competition_with_timing IS 'View that provides effective dates from periods/rounds with fallback to legacy columns';

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    competitions_has_price BOOLEAN;
    voting_rounds_exists BOOLEAN;
    nomination_periods_exists BOOLEAN;
    settings_dropped BOOLEAN;
BEGIN
    -- Check competitions has new columns
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'price_per_vote'
    ) INTO competitions_has_price;

    -- Check voting_rounds exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'voting_rounds'
    ) INTO voting_rounds_exists;

    -- Check nomination_periods exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'nomination_periods'
    ) INTO nomination_periods_exists;

    -- Check competition_settings is dropped
    SELECT NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'competition_settings'
    ) INTO settings_dropped;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'competitions.price_per_vote exists: %', competitions_has_price;
    RAISE NOTICE 'voting_rounds table exists: %', voting_rounds_exists;
    RAISE NOTICE 'nomination_periods table exists: %', nomination_periods_exists;
    RAISE NOTICE 'competition_settings dropped: %', settings_dropped;

    IF competitions_has_price AND voting_rounds_exists AND nomination_periods_exists AND settings_dropped THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

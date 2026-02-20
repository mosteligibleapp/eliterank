-- =============================================================================
-- MIGRATION: Fix Competition Total Votes Column
-- Date: 2026-01-09
-- Description: Adds missing total_votes and total_revenue columns to competitions table
--              These columns are required by the process_vote() trigger
-- =============================================================================

-- Add total_votes column if it doesn't exist
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;

-- Add total_revenue column if it doesn't exist
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_total_votes BOOLEAN;
    has_total_revenue BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'total_votes'
    ) INTO has_total_votes;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competitions' AND column_name = 'total_revenue'
    ) INTO has_total_revenue;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'competitions.total_votes exists: %', has_total_votes;
    RAISE NOTICE 'competitions.total_revenue exists: %', has_total_revenue;

    IF has_total_votes AND has_total_revenue THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE ===';
    END IF;
END $$;

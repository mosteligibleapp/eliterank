-- =============================================================================
-- MIGRATION: Add nomination_periods table and round_type to voting_rounds
-- Date: 2026-01-03
-- Description:
--   - Creates nomination_periods table for multiple prospecting periods
--   - Adds round_type column to voting_rounds to distinguish voting vs judging
-- =============================================================================

-- =============================================================================
-- NOMINATION PERIODS TABLE
-- =============================================================================
-- Replaces flat nomination_start/nomination_end with multiple configurable periods
CREATE TABLE IF NOT EXISTS nomination_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Open Nominations',
    period_order INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_submissions INTEGER, -- NULL means unlimited
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_period_order UNIQUE (competition_id, period_order)
);

-- Index for competition lookup
CREATE INDEX IF NOT EXISTS idx_nomination_periods_competition_id ON nomination_periods(competition_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_nomination_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nomination_periods_updated_at ON nomination_periods;
CREATE TRIGGER update_nomination_periods_updated_at
    BEFORE UPDATE ON nomination_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_nomination_periods_updated_at();

-- Comment
COMMENT ON TABLE nomination_periods IS 'Multiple contestant prospecting/nomination periods per competition';

-- =============================================================================
-- ADD ROUND_TYPE TO VOTING_ROUNDS
-- =============================================================================
-- Allows rounds to be either 'voting' (public votes) or 'judging' (judge scores)
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

-- Comment
COMMENT ON COLUMN voting_rounds.round_type IS 'Type of round: voting (public votes) or judging (judge scores)';

-- =============================================================================
-- RLS POLICIES FOR NOMINATION_PERIODS
-- =============================================================================
ALTER TABLE nomination_periods ENABLE ROW LEVEL SECURITY;

-- Anyone can view nomination periods for visible competitions
CREATE POLICY "nomination_periods_select_policy" ON nomination_periods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = nomination_periods.competition_id
            AND c.status IN ('publish', 'live', 'completed')
        )
    );

-- Super admins can do anything
CREATE POLICY "nomination_periods_super_admin_policy" ON nomination_periods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- Hosts can manage their competition's periods
CREATE POLICY "nomination_periods_host_policy" ON nomination_periods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = nomination_periods.competition_id
            AND c.host_id = auth.uid()
        )
    );

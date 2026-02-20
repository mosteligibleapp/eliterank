-- =============================================================================
-- EliteRank Database Schema - Complete Restructure
-- =============================================================================
-- This migration creates the new schema for the restructured competition system.
-- Run this on a clean database or after backing up existing data.
-- =============================================================================

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- =============================================================================
-- CITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,  -- US state code (e.g., 'IL', 'NY')
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_city_state UNIQUE (name, state)
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state);

-- =============================================================================
-- COMPETITIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    season INTEGER NOT NULL,  -- Year (e.g., 2025)
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publish', 'live', 'archive', 'completed')),
    entry_type VARCHAR(20) NOT NULL DEFAULT 'nominations' CHECK (entry_type IN ('nominations', 'applications', 'appointments')),
    has_events BOOLEAN NOT NULL DEFAULT false,
    number_of_winners INTEGER NOT NULL DEFAULT 5,
    selection_criteria VARCHAR(20) NOT NULL DEFAULT 'votes' CHECK (selection_criteria IN ('votes', 'hybrid')),
    host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    description TEXT,
    rules_doc_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_org_city_season UNIQUE (organization_id, city_id, season)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitions_org ON competitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_competitions_city ON competitions(city_id);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_host ON competitions(host_id);

-- =============================================================================
-- COMPETITION SETTINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL UNIQUE REFERENCES competitions(id) ON DELETE CASCADE,
    price_per_vote DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    use_price_bundler BOOLEAN NOT NULL DEFAULT false,
    nomination_start TIMESTAMPTZ,
    nomination_end TIMESTAMPTZ,
    finale_date TIMESTAMPTZ,
    allow_manual_votes BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for competition lookup
CREATE INDEX IF NOT EXISTS idx_competition_settings_comp ON competition_settings(competition_id);

-- =============================================================================
-- VOTING ROUNDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS voting_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    round_order INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    contestants_advance INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_round_order UNIQUE (competition_id, round_order)
);

-- Index for competition lookup
CREATE INDEX IF NOT EXISTS idx_voting_rounds_comp ON voting_rounds(competition_id);

-- =============================================================================
-- INTEREST SUBMISSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS interest_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interest_submissions_comp ON interest_submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_interest_submissions_type ON interest_submissions(interest_type);
CREATE INDEX IF NOT EXISTS idx_interest_submissions_status ON interest_submissions(status);

-- =============================================================================
-- COMPETITION PRIZES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    value VARCHAR(100),
    external_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_competition_prizes_comp ON competition_prizes(competition_id);

-- =============================================================================
-- COMPETITION RULES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    section_title VARCHAR(255) NOT NULL,
    section_content TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_competition_rules_comp ON competition_rules(competition_id);

-- =============================================================================
-- MANUAL VOTES TABLE (for tracking manual votes separately)
-- =============================================================================
CREATE TABLE IF NOT EXISTS manual_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    vote_count INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manual_votes_comp ON manual_votes(competition_id);
CREATE INDEX IF NOT EXISTS idx_manual_votes_contestant ON manual_votes(contestant_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Organizations: public read, authenticated write
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by everyone"
    ON organizations FOR SELECT
    USING (true);

CREATE POLICY "Organizations are editable by super admins"
    ON organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- Cities: public read, authenticated write
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by everyone"
    ON cities FOR SELECT
    USING (true);

CREATE POLICY "Cities are editable by super admins"
    ON cities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- Competitions: conditional read based on status, authenticated write
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public competitions are viewable by everyone"
    ON competitions FOR SELECT
    USING (status IN ('publish', 'live', 'completed'));

CREATE POLICY "Draft/archived competitions visible to super admins"
    ON competitions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Competitions are editable by super admins and hosts"
    ON competitions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_super_admin = true OR competitions.host_id = auth.uid())
        )
    );

-- Competition Settings: same as competitions
ALTER TABLE competition_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable with competition"
    ON competition_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions
            WHERE competitions.id = competition_settings.competition_id
            AND competitions.status IN ('publish', 'live', 'completed')
        )
    );

CREATE POLICY "Settings editable by super admins and hosts"
    ON competition_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN profiles p ON p.id = auth.uid()
            WHERE c.id = competition_settings.competition_id
            AND (p.is_super_admin = true OR c.host_id = auth.uid())
        )
    );

-- Interest Submissions: public insert, admin read
ALTER TABLE interest_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit interest"
    ON interest_submissions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Interest submissions viewable by super admins and hosts"
    ON interest_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN profiles p ON p.id = auth.uid()
            WHERE c.id = interest_submissions.competition_id
            AND (p.is_super_admin = true OR c.host_id = auth.uid())
        )
    );

CREATE POLICY "Interest submissions updatable by super admins and hosts"
    ON interest_submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN profiles p ON p.id = auth.uid()
            WHERE c.id = interest_submissions.competition_id
            AND (p.is_super_admin = true OR c.host_id = auth.uid())
        )
    );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_settings_updated_at
    BEFORE UPDATE ON competition_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voting_rounds_updated_at
    BEFORE UPDATE ON voting_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_prizes_updated_at
    BEFORE UPDATE ON competition_prizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_rules_updated_at
    BEFORE UPDATE ON competition_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUTO-COMPLETE FUNCTION
-- =============================================================================
-- This function can be called by a cron job to auto-complete competitions
-- whose finale_date has passed.

CREATE OR REPLACE FUNCTION auto_complete_competitions()
RETURNS void AS $$
BEGIN
    UPDATE competitions c
    SET status = 'completed',
        updated_at = NOW()
    FROM competition_settings cs
    WHERE c.id = cs.competition_id
    AND c.status = 'live'
    AND cs.finale_date IS NOT NULL
    AND cs.finale_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE organizations IS 'Organizations that run competitions (e.g., Most Eligible)';
COMMENT ON TABLE cities IS 'US cities where competitions can be held';
COMMENT ON TABLE competitions IS 'Individual competition instances';
COMMENT ON TABLE competition_settings IS 'Advanced settings for each competition';
COMMENT ON TABLE voting_rounds IS 'Multiple voting rounds per competition';
COMMENT ON TABLE interest_submissions IS 'Interest form submissions for published competitions';
COMMENT ON TABLE competition_prizes IS 'Prizes available for competition winners';
COMMENT ON TABLE competition_rules IS 'Competition rules organized by section';
COMMENT ON TABLE manual_votes IS 'Manually added votes (tracked separately from public votes)';

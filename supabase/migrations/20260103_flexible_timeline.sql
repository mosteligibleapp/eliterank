-- ============================================================================
-- Flexible Timeline Management Migration
-- Adds customizable nomination periods, finale title, vote accumulation,
-- and contestant advancement tracking
-- ============================================================================

-- ============================================================================
-- 1. NOMINATION PERIODS TABLE (like voting_rounds but for prospecting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS nomination_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Nominations',
    period_order INTEGER NOT NULL DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_submissions INTEGER, -- Optional limit on submissions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_nomination_period_order UNIQUE (competition_id, period_order)
);

CREATE INDEX IF NOT EXISTS idx_nomination_periods_competition_id ON nomination_periods(competition_id);

-- Enable RLS
ALTER TABLE nomination_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nomination_periods
DROP POLICY IF EXISTS "Anyone can view nomination_periods" ON nomination_periods;
CREATE POLICY "Anyone can view nomination_periods" ON nomination_periods
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage nomination_periods" ON nomination_periods;
CREATE POLICY "Hosts can manage nomination_periods" ON nomination_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = nomination_periods.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can manage nomination_periods" ON nomination_periods;
CREATE POLICY "Super admins can manage nomination_periods" ON nomination_periods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- 2. UPDATE COMPETITION_SETTINGS - Add finale customization
-- ============================================================================

-- Add finale_title column for customizable end date label
ALTER TABLE competition_settings
ADD COLUMN IF NOT EXISTS finale_title VARCHAR(255) DEFAULT 'Finals';

-- ============================================================================
-- 3. UPDATE VOTING_ROUNDS - Add vote accumulation option
-- ============================================================================

-- Add votes_accumulate column (default false = reset each round)
ALTER TABLE voting_rounds
ADD COLUMN IF NOT EXISTS votes_accumulate BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 4. UPDATE CONTESTANTS - Add advancement tracking
-- ============================================================================

-- Track which round a contestant was eliminated in (null = still active)
ALTER TABLE contestants
ADD COLUMN IF NOT EXISTS eliminated_in_round INTEGER;

-- Track advancement status
ALTER TABLE contestants
ADD COLUMN IF NOT EXISTS advancement_status VARCHAR(50) DEFAULT 'active'
CHECK (advancement_status IN ('active', 'advancing', 'eliminated', 'winner', 'runner_up'));

-- Track the round they're currently in
ALTER TABLE contestants
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- ============================================================================
-- 5. MIGRATE EXISTING DATA
-- ============================================================================

-- For existing competitions with nomination dates in competition_settings,
-- create a nomination_period record
INSERT INTO nomination_periods (competition_id, title, period_order, start_date, end_date)
SELECT
    cs.competition_id,
    'Nominations',
    1,
    cs.nomination_start,
    cs.nomination_end
FROM competition_settings cs
WHERE cs.nomination_start IS NOT NULL OR cs.nomination_end IS NOT NULL
ON CONFLICT (competition_id, period_order) DO NOTHING;

-- ============================================================================
-- 6. ROUND ADVANCEMENT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS round_advancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    voting_round_id UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
    contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    advanced BOOLEAN NOT NULL DEFAULT false,
    final_vote_count INTEGER NOT NULL DEFAULT 0,
    final_rank INTEGER,
    decided_by UUID REFERENCES profiles(id), -- Host who made the decision (for ties)
    decided_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT, -- For tie-breaker explanations
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round_advancements_competition ON round_advancements(competition_id);
CREATE INDEX IF NOT EXISTS idx_round_advancements_round ON round_advancements(voting_round_id);
CREATE INDEX IF NOT EXISTS idx_round_advancements_contestant ON round_advancements(contestant_id);

-- Enable RLS
ALTER TABLE round_advancements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for round_advancements
DROP POLICY IF EXISTS "Anyone can view round_advancements" ON round_advancements;
CREATE POLICY "Anyone can view round_advancements" ON round_advancements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage round_advancements" ON round_advancements;
CREATE POLICY "Hosts can manage round_advancements" ON round_advancements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = round_advancements.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can manage round_advancements" ON round_advancements;
CREATE POLICY "Super admins can manage round_advancements" ON round_advancements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================================
-- Done!
-- ============================================================================

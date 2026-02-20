-- ============================================================================
-- REWARD COMPETITION ASSIGNMENTS
-- Links rewards to competitions for visibility (separate from contestant assignments)
-- ============================================================================

-- Table to link rewards to competitions (for visibility to all contestants/nominees)
CREATE TABLE IF NOT EXISTS reward_competition_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique assignment per reward-competition combination
  UNIQUE(reward_id, competition_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reward_competition_assignments_reward_id ON reward_competition_assignments(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_competition_assignments_competition_id ON reward_competition_assignments(competition_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE reward_competition_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all competition assignments
CREATE POLICY "Super admins can manage reward competition assignments"
  ON reward_competition_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Contestants can view competition assignments for their competitions
CREATE POLICY "Contestants can view their competition reward assignments"
  ON reward_competition_assignments FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM contestants WHERE user_id = auth.uid()
    )
  );

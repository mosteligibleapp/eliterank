-- ============================================================================
-- REWARD NOMINEE ASSIGNMENTS
-- Adds nominee_id to reward_assignments so rewards can be shared with nominees
-- ============================================================================

-- Make contestant_id nullable (nominees won't have a contestant record)
ALTER TABLE reward_assignments ALTER COLUMN contestant_id DROP NOT NULL;

-- Add nominee_id column
ALTER TABLE reward_assignments ADD COLUMN IF NOT EXISTS nominee_id UUID REFERENCES nominees(id) ON DELETE CASCADE;

-- Add index for nominee lookups
CREATE INDEX IF NOT EXISTS idx_reward_assignments_nominee_id ON reward_assignments(nominee_id);

-- Add unique constraint for reward-nominee combination
ALTER TABLE reward_assignments ADD CONSTRAINT reward_assignments_reward_nominee_unique UNIQUE (reward_id, nominee_id);

-- Update RLS: Nominees can view their own reward assignments
CREATE POLICY "Nominees can view own reward assignments"
  ON reward_assignments FOR SELECT
  USING (
    nominee_id IN (
      SELECT id FROM nominees WHERE user_id = auth.uid()
    )
  );

-- Nominees can update their own assignments (for claiming)
CREATE POLICY "Nominees can update own reward assignments"
  ON reward_assignments FOR UPDATE
  USING (
    nominee_id IN (
      SELECT id FROM nominees WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    nominee_id IN (
      SELECT id FROM nominees WHERE user_id = auth.uid()
    )
  );

-- Ensure at least one of contestant_id or nominee_id is set
ALTER TABLE reward_assignments ADD CONSTRAINT reward_assignments_has_recipient
  CHECK (contestant_id IS NOT NULL OR nominee_id IS NOT NULL);

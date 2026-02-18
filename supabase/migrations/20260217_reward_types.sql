-- ============================================================================
-- REWARD TYPES
-- Adds reward_type and is_affiliate to rewards table to distinguish between
-- prize types (all nominees vs winners only) and affiliate vs non-affiliate
-- ============================================================================

-- Add reward_type column: who is eligible
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'all_nominees'
  CHECK (reward_type IN ('all_nominees', 'winners_only'));

-- Add is_affiliate column: whether the reward has an affiliate/commission program
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT false;

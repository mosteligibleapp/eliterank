-- ============================================================================
-- ADD CASH VALUE FIELD TO REWARDS
-- Allows admins to specify the monetary value of a reward
-- ============================================================================

-- Add cash_value column to rewards table
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS cash_value DECIMAL(10,2);

-- Comment for documentation
COMMENT ON COLUMN rewards.cash_value IS 'The cash/monetary value of the reward in USD';

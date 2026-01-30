-- ============================================================================
-- REWARDS SYSTEM MIGRATION
-- Creates tables for managing affiliate rewards/products for contestants
-- ============================================================================

-- Rewards table - global rewards/products from affiliate brands
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- e.g., "L.A. TAN Self-Tanning Kit"
  brand_name TEXT NOT NULL,                        -- e.g., "L.A. TAN"
  brand_logo_url TEXT,
  description TEXT,
  image_url TEXT,
  product_url TEXT,                                -- Brand's product page
  terms TEXT,                                      -- Promotion requirements/conditions
  commission_rate DECIMAL(5,2),                    -- e.g., 20.00 for 20%
  requires_promotion BOOLEAN DEFAULT true,
  claim_deadline_days INTEGER DEFAULT 7,           -- Days from assignment to claim
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward assignments - links rewards to specific contestants
CREATE TABLE IF NOT EXISTS reward_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,

  -- Distribution info (entered by admin after receiving from brand)
  discount_code TEXT,
  tracking_link TEXT,

  -- Claim status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'shipped', 'active', 'completed', 'expired')),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                          -- Calculated from claim_deadline_days

  -- Shipping info (filled by contestant when claiming)
  shipping_address JSONB,                          -- {street, city, state, zip, country}

  -- Compliance tracking
  content_posted BOOLEAN DEFAULT false,
  content_links TEXT[],                            -- Array of social media post URLs
  compliance_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique assignment per reward-contestant combination
  UNIQUE(reward_id, contestant_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reward_assignments_reward_id ON reward_assignments(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_assignments_competition_id ON reward_assignments(competition_id);
CREATE INDEX IF NOT EXISTS idx_reward_assignments_contestant_id ON reward_assignments(contestant_id);
CREATE INDEX IF NOT EXISTS idx_reward_assignments_status ON reward_assignments(status);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_assignments ENABLE ROW LEVEL SECURITY;

-- Rewards policies
-- Super admins can manage all rewards
CREATE POLICY "Super admins can manage all rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Anyone can view active rewards (for public display)
CREATE POLICY "Anyone can view active rewards"
  ON rewards FOR SELECT
  USING (status = 'active');

-- Reward assignments policies
-- Super admins can manage all assignments
CREATE POLICY "Super admins can manage all reward assignments"
  ON reward_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Contestants can view their own assignments
CREATE POLICY "Contestants can view own reward assignments"
  ON reward_assignments FOR SELECT
  USING (
    contestant_id IN (
      SELECT id FROM contestants WHERE user_id = auth.uid()
    )
  );

-- Contestants can update their own assignments (for claiming)
CREATE POLICY "Contestants can update own reward assignments"
  ON reward_assignments FOR UPDATE
  USING (
    contestant_id IN (
      SELECT id FROM contestants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    contestant_id IN (
      SELECT id FROM contestants WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to set expires_at when assignment is created
CREATE OR REPLACE FUNCTION set_reward_assignment_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    SELECT NEW.created_at + (COALESCE(r.claim_deadline_days, 7) * INTERVAL '1 day')
    INTO NEW.expires_at
    FROM rewards r
    WHERE r.id = NEW.reward_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set expiry date
DROP TRIGGER IF EXISTS trigger_set_reward_assignment_expiry ON reward_assignments;
CREATE TRIGGER trigger_set_reward_assignment_expiry
  BEFORE INSERT ON reward_assignments
  FOR EACH ROW
  EXECUTE FUNCTION set_reward_assignment_expiry();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reward_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_rewards_updated_at ON rewards;
CREATE TRIGGER trigger_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_updated_at();

DROP TRIGGER IF EXISTS trigger_reward_assignments_updated_at ON reward_assignments;
CREATE TRIGGER trigger_reward_assignments_updated_at
  BEFORE UPDATE ON reward_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_updated_at();

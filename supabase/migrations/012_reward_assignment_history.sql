-- =============================================================================
-- MIGRATION 012: Reward Assignment History (Audit Log)
-- Tracks all status changes and updates to reward assignments
-- =============================================================================

-- TABLE: reward_assignment_history
CREATE TABLE reward_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES reward_assignments(id) ON DELETE CASCADE,

  -- What changed
  field_name TEXT NOT NULL,         -- e.g. 'status', 'shipping_address', 'discount_code'
  old_value TEXT,
  new_value TEXT,

  -- Who changed it (null = system/trigger)
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_assignment_history_assignment_id ON reward_assignment_history(assignment_id);
CREATE INDEX idx_reward_assignment_history_created_at ON reward_assignment_history(created_at);

-- Trigger function to log status changes automatically
CREATE OR REPLACE FUNCTION log_reward_assignment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO reward_assignment_history (assignment_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;

  IF OLD.shipping_address IS DISTINCT FROM NEW.shipping_address THEN
    INSERT INTO reward_assignment_history (assignment_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'shipping_address', OLD.shipping_address::TEXT, NEW.shipping_address::TEXT, auth.uid());
  END IF;

  IF OLD.content_posted IS DISTINCT FROM NEW.content_posted THEN
    INSERT INTO reward_assignment_history (assignment_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'content_posted', OLD.content_posted::TEXT, NEW.content_posted::TEXT, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_reward_assignment_changes
  AFTER UPDATE ON reward_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_reward_assignment_status_change();

-- RLS policies
ALTER TABLE reward_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all reward assignment history"
  ON reward_assignment_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "Super admins can insert reward assignment history"
  ON reward_assignment_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

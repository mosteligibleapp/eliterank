-- =============================================================================
-- MIGRATION: In-App Notification System
-- Date: 2026-02-12
-- Description:
--   - Create notifications table for in-app notification bell
--   - Add RLS policies, indexes, and Realtime publication
--   - Create triggers for vote_received and rank_change notifications
--   - Create RPC function for bulk competition lifecycle notifications
-- =============================================================================

-- =============================================================================
-- STEP 1: Create the notifications table
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Type constraint
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type
  CHECK (type IN (
    'nominated',
    'nomination_approved',
    'new_reward',
    'prize_package',
    'rank_change',
    'vote_received',
    'event_posted',
    'system_announcement'
  ));

-- =============================================================================
-- STEP 2: Indexes
-- =============================================================================
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_competition
  ON notifications(competition_id)
  WHERE competition_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Row Level Security
-- =============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 4: Enable Realtime
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =============================================================================
-- STEP 5: Vote notification trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION on_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_user_id UUID;
  v_comp_city TEXT;
  v_vote_count INTEGER;
BEGIN
  SELECT user_id INTO v_contestant_user_id
  FROM contestants
  WHERE id = NEW.contestant_id;

  IF v_contestant_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_vote_count := COALESCE(NEW.vote_count, 1);

  SELECT city INTO v_comp_city
  FROM competitions
  WHERE id = NEW.competition_id;

  INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
  VALUES (
    v_contestant_user_id,
    'vote_received',
    'New votes!',
    'You received ' || v_vote_count || ' vote' ||
      CASE WHEN v_vote_count > 1 THEN 's' ELSE '' END ||
      ' in ' || COALESCE(v_comp_city, 'your competition'),
    NEW.competition_id,
    NEW.contestant_id,
    jsonb_build_object('vote_count', v_vote_count)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_notification ON votes;

CREATE TRIGGER trigger_vote_notification
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION on_vote_notification();

-- =============================================================================
-- STEP 6: Rank change notification trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION on_rank_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.rank IS DISTINCT FROM NEW.rank AND NEW.user_id IS NOT NULL AND OLD.rank IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
    VALUES (
      NEW.user_id,
      'rank_change',
      CASE
        WHEN NEW.rank < OLD.rank THEN 'You moved up!'
        ELSE 'Ranking update'
      END,
      CASE
        WHEN NEW.rank < OLD.rank THEN 'You moved from #' || OLD.rank || ' to #' || NEW.rank
        ELSE 'You moved from #' || OLD.rank || ' to #' || NEW.rank
      END,
      NEW.competition_id,
      NEW.id,
      jsonb_build_object('old_rank', OLD.rank, 'new_rank', NEW.rank, 'direction', CASE WHEN NEW.rank < OLD.rank THEN 'up' ELSE 'down' END)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_rank_change_notification ON contestants;

CREATE TRIGGER trigger_rank_change_notification
  AFTER UPDATE OF rank ON contestants
  FOR EACH ROW
  EXECUTE FUNCTION on_rank_change_notification();

-- =============================================================================
-- STEP 7: Reward assignment notification trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION on_reward_assigned_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_user_id UUID;
  v_reward_name TEXT;
  v_brand_name TEXT;
BEGIN
  SELECT user_id INTO v_contestant_user_id
  FROM contestants
  WHERE id = NEW.contestant_id;

  IF v_contestant_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name, brand_name INTO v_reward_name, v_brand_name
  FROM rewards
  WHERE id = NEW.reward_id;

  INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
  VALUES (
    v_contestant_user_id,
    'new_reward',
    'You have a new reward!',
    COALESCE(v_brand_name, 'A brand') || ' sent you ' || COALESCE(v_reward_name, 'a reward'),
    NEW.competition_id,
    NEW.contestant_id,
    jsonb_build_object('reward_id', NEW.reward_id, 'reward_name', v_reward_name, 'brand_name', v_brand_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reward_assigned_notification ON reward_assignments;

CREATE TRIGGER trigger_reward_assigned_notification
  AFTER INSERT ON reward_assignments
  FOR EACH ROW
  EXECUTE FUNCTION on_reward_assigned_notification();

-- =============================================================================
-- STEP 8: RPC for bulk competition lifecycle notifications
-- =============================================================================
CREATE OR REPLACE FUNCTION create_competition_notification(
  p_competition_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Notify all contestants with linked user accounts
  INSERT INTO notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT DISTINCT
    c.user_id,
    p_type,
    p_title,
    p_body,
    p_competition_id,
    p_action_url,
    p_metadata
  FROM contestants c
  WHERE c.competition_id = p_competition_id
    AND c.user_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Also notify the competition host
  INSERT INTO notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT
    comp.host_id,
    p_type,
    p_title,
    p_body,
    p_competition_id,
    p_action_url,
    p_metadata
  FROM competitions comp
  WHERE comp.id = p_competition_id
    AND comp.host_id IS NOT NULL
    AND comp.host_id NOT IN (
      SELECT DISTINCT c.user_id FROM contestants c
      WHERE c.competition_id = p_competition_id AND c.user_id IS NOT NULL
    );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    table_exists BOOLEAN;
    trigger1_exists BOOLEAN;
    trigger2_exists BOOLEAN;
    trigger3_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'notifications'
    ) INTO table_exists;

    SELECT EXISTS (
        SELECT FROM pg_trigger WHERE tgname = 'trigger_vote_notification'
    ) INTO trigger1_exists;

    SELECT EXISTS (
        SELECT FROM pg_trigger WHERE tgname = 'trigger_rank_change_notification'
    ) INTO trigger2_exists;

    SELECT EXISTS (
        SELECT FROM pg_trigger WHERE tgname = 'trigger_reward_assigned_notification'
    ) INTO trigger3_exists;

    SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_competition_notification'
        AND n.nspname = 'public'
    ) INTO function_exists;

    RAISE NOTICE '=== NOTIFICATIONS MIGRATION VERIFICATION ===';
    RAISE NOTICE 'notifications table exists: %', table_exists;
    RAISE NOTICE 'trigger_vote_notification exists: %', trigger1_exists;
    RAISE NOTICE 'trigger_rank_change_notification exists: %', trigger2_exists;
    RAISE NOTICE 'trigger_reward_assigned_notification exists: %', trigger3_exists;
    RAISE NOTICE 'create_competition_notification function exists: %', function_exists;

    IF table_exists AND trigger1_exists AND trigger2_exists AND trigger3_exists AND function_exists THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

-- Fans feature: allow users to become fans of nominees/contestants
-- Fans receive competition and performance updates

-- 1. Create fans table
CREATE TABLE IF NOT EXISTS fans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fan_id, profile_id),
  CHECK (fan_id != profile_id)
);

CREATE INDEX IF NOT EXISTS idx_fans_fan_id ON fans(fan_id);
CREATE INDEX IF NOT EXISTS idx_fans_profile_id ON fans(profile_id);

-- 2. Add fan_count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fan_count INTEGER DEFAULT 0;

-- 3. RLS policies
ALTER TABLE fans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fan relationships"
  ON fans FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow others"
  ON fans FOR INSERT WITH CHECK (fan_id = auth.uid());

CREATE POLICY "Users can unfollow"
  ON fans FOR DELETE USING (fan_id = auth.uid());

-- 4. Trigger to keep fan_count in sync
CREATE OR REPLACE FUNCTION update_fan_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET fan_count = COALESCE(fan_count, 0) + 1 WHERE id = NEW.profile_id;

    -- Create in-app notification for the person being fanned
    INSERT INTO notifications (user_id, type, title, message, metadata)
    SELECT NEW.profile_id, 'new_fan',
      COALESCE(p.first_name, 'Someone') || ' became your fan!',
      COALESCE(p.first_name, 'Someone') || ' ' || COALESCE(p.last_name, '') || ' is now your fan.',
      jsonb_build_object('fan_id', NEW.fan_id, 'fan_name', COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''), 'fan_avatar', p.avatar_url)
    FROM profiles p WHERE p.id = NEW.fan_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET fan_count = GREATEST(COALESCE(fan_count, 0) - 1, 0) WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_fan_change
  AFTER INSERT OR DELETE ON fans
  FOR EACH ROW EXECUTE FUNCTION update_fan_count();

-- 5. Add new_fan to notification type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type CHECK (type IN (
  'nominated', 'nomination_approved', 'nominee_accepted', 'nominee_declined',
  'new_reward', 'prize_package',
  'rank_change', 'vote_received', 'event_posted', 'system_announcement',
  'new_fan'
));

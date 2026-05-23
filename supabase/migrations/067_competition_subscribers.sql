-- Per-competition "notify me when nominations open" opt-ins.
-- Inserted when an authenticated user clicks "Get notified" on a
-- competition's coming-soon page. Phase 2 will surface these in the
-- host's PeopleTab; Phase 3 will email them when the phase transitions.

CREATE TABLE IF NOT EXISTS competition_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_subscribers_competition_id
  ON competition_subscribers(competition_id);

CREATE INDEX IF NOT EXISTS idx_competition_subscribers_user_id
  ON competition_subscribers(user_id);

ALTER TABLE competition_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe themselves" ON competition_subscribers;
CREATE POLICY "Users can subscribe themselves" ON competition_subscribers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unsubscribe themselves" ON competition_subscribers;
CREATE POLICY "Users can unsubscribe themselves" ON competition_subscribers
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Subscribers visible to self, admins, hosts" ON competition_subscribers;
CREATE POLICY "Subscribers visible to self, admins, hosts" ON competition_subscribers
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = competition_subscribers.competition_id AND c.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts cch
      WHERE cch.competition_id = competition_subscribers.competition_id
        AND cch.user_id = auth.uid()
    )
  );

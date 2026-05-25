-- Dedup ledger for one-off email blasts sent to competition_subscribers
-- when a phase transitions (e.g. nominations_open). The cron job
-- (check-competition-events) inserts a row after sending so the same
-- blast never goes out twice for the same competition + event.

CREATE TABLE IF NOT EXISTS subscriber_blast_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_subscriber_blast_events_competition_id
  ON subscriber_blast_events(competition_id);

ALTER TABLE subscriber_blast_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blasts visible to admins and hosts" ON subscriber_blast_events;
CREATE POLICY "Blasts visible to admins and hosts" ON subscriber_blast_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = subscriber_blast_events.competition_id AND c.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts cch
      WHERE cch.competition_id = subscriber_blast_events.competition_id
        AND cch.user_id = auth.uid()
    )
  );

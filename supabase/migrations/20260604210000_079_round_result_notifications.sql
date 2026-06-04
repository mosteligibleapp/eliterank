-- =============================================================================
-- 079_round_result_notifications.sql
--
-- Dedup ledger for round-result notification emails (advanced / eliminated /
-- fan-advanced) sent by the notify-round-results edge function.
--
-- One row per voting_round guarantees each round's result emails go out at most
-- once, even if the function is invoked repeatedly (manual re-runs, cron
-- overlap). The function reserves a row up front — the UNIQUE(voting_round_id)
-- constraint makes a second invocation a no-op — then backfills the per-bucket
-- counts after sending. Mirrors the subscriber_blast_events pattern used by
-- check-competition-events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS round_result_notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id     UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  voting_round_id    UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
  advanced_emailed   INTEGER NOT NULL DEFAULT 0,
  eliminated_emailed INTEGER NOT NULL DEFAULT 0,
  fans_emailed       INTEGER NOT NULL DEFAULT 0,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voting_round_id)
);

CREATE INDEX IF NOT EXISTS idx_round_result_notifications_competition_id
  ON round_result_notifications(competition_id);

ALTER TABLE round_result_notifications ENABLE ROW LEVEL SECURITY;

-- Visible to super admins, hosts, and co-hosts (mirrors subscriber_blast_events).
DROP POLICY IF EXISTS "Round result notifications visible to admins and hosts"
  ON round_result_notifications;
CREATE POLICY "Round result notifications visible to admins and hosts"
  ON round_result_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = round_result_notifications.competition_id AND c.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts cch
      WHERE cch.competition_id = round_result_notifications.competition_id
        AND cch.user_id = auth.uid()
    )
  );

-- Email logs — records every transactional email send attempt so hosts can
-- see deliverability per recipient (e.g. "this nominee got the invite email",
-- "this contestant got the weekly performance email").
--
-- Rows are written by the send-onesignal-email edge function using the service
-- role key (which bypasses RLS). Hosts read their own competition's logs via
-- the Email Activity tab in the competition dashboard.

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  onesignal_id TEXT,
  recipients INTEGER,
  delivery_method TEXT,
  error TEXT
);

-- Host dashboard lists a competition's emails newest-first
CREATE INDEX IF NOT EXISTS idx_email_logs_competition
  ON email_logs(competition_id, created_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Primary host can read the email logs for competitions they host
DROP POLICY IF EXISTS "email_logs_host_select" ON email_logs;
CREATE POLICY "email_logs_host_select" ON email_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM competitions
    WHERE competitions.id = email_logs.competition_id
      AND competitions.host_id = auth.uid()
  ));

-- Co-hosts get the same read access as the primary host (see 064_competition_co_hosts)
DROP POLICY IF EXISTS "email_logs_co_hosts_select" ON email_logs;
CREATE POLICY "email_logs_co_hosts_select" ON email_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM competition_co_hosts cch
    WHERE cch.competition_id = email_logs.competition_id
      AND cch.user_id = auth.uid()
  ));

-- Super admins can read/manage all email logs
DROP POLICY IF EXISTS "email_logs_super_admin_all" ON email_logs;
CREATE POLICY "email_logs_super_admin_all" ON email_logs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
  ));

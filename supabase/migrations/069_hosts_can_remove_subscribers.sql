-- Allow hosts, co-hosts, and super admins to remove subscribers from their
-- competition's notify list. The existing "Users can unsubscribe themselves"
-- policy stays — multiple DELETE policies are OR'd, so users keep the ability
-- to unsubscribe themselves while hosts gain the ability to prune their list
-- from the dashboard.

DROP POLICY IF EXISTS "Hosts can remove subscribers" ON competition_subscribers;
CREATE POLICY "Hosts can remove subscribers" ON competition_subscribers
  FOR DELETE USING (
    EXISTS (
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

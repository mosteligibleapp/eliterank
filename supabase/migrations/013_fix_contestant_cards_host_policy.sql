-- Fix: "Hosts can manage cards" policy references non-existent profiles.is_host column.
-- Replace with a check against competitions.host_id for actual hosts,
-- plus the existing is_super_admin check.

DROP POLICY IF EXISTS "Hosts can manage cards" ON contestant_cards;

CREATE POLICY "Hosts and admins can manage cards"
  ON contestant_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = contestant_cards.competition_id
      AND competitions.host_id = auth.uid()
    )
  );

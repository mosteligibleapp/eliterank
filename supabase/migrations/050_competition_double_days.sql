-- =============================================================================
-- Migration: Host-scheduled double vote days
--
-- Lets hosts pick specific calendar dates on which every vote (free + paid)
-- counts double for their competition. Independent of events: a host can
-- schedule a double day without creating a calendar event for it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS competition_double_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, date)
);

CREATE INDEX IF NOT EXISTS idx_competition_double_days_lookup
  ON competition_double_days(competition_id, date);

ALTER TABLE competition_double_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Double vote days are viewable by everyone"
  ON competition_double_days FOR SELECT
  USING (true);

CREATE POLICY "Hosts can manage their double vote days"
  ON competition_double_days FOR ALL
  USING (EXISTS (
    SELECT 1 FROM competitions
    WHERE id = competition_double_days.competition_id
      AND host_id = auth.uid()
  ));

CREATE POLICY "Super admins can manage all double vote days"
  ON competition_double_days FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ));

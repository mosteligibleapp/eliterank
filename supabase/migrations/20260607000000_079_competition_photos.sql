-- =============================================================================
-- Competition photos
-- A gallery surfaced on the completed-competition results page. Hosts upload
-- photos from the dashboard ("Setup" tab); anyone can view them publicly.
-- Mirrors the access model of competition_prizes: public SELECT, host/admin
-- manage.
-- =============================================================================
CREATE TABLE IF NOT EXISTS competition_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_photos_comp ON competition_photos(competition_id);

ALTER TABLE competition_photos ENABLE ROW LEVEL SECURITY;

-- Public read — the gallery is part of the public results page.
CREATE POLICY "Competition photos are viewable by everyone" ON competition_photos
  FOR SELECT USING (true);

-- Hosts (and super admins) manage their own competition's photos.
CREATE POLICY "Hosts can manage competition photos" ON competition_photos
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM competitions c
    JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = competition_photos.competition_id
      AND (p.is_super_admin = true OR c.host_id = auth.uid())
  ));

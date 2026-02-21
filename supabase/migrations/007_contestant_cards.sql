-- Migration: Add contestant_cards table for achievement card storage
-- This stores shareable achievement cards for different milestones

-- Create storage bucket for cards (if not exists via Supabase dashboard)
-- Note: Run this in Supabase dashboard SQL editor or ensure bucket exists:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contestant-cards', 'contestant-cards', true);

-- Contestant cards table
CREATE TABLE IF NOT EXISTS contestant_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  achievement_type TEXT NOT NULL,
  custom_title TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  rank INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by contestant
CREATE INDEX IF NOT EXISTS idx_contestant_cards_contestant_id 
  ON contestant_cards(contestant_id);

-- Index for filtering by achievement type
CREATE INDEX IF NOT EXISTS idx_contestant_cards_type 
  ON contestant_cards(achievement_type);

-- Index for competition-specific queries
CREATE INDEX IF NOT EXISTS idx_contestant_cards_competition_id 
  ON contestant_cards(competition_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_contestant_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contestant_cards_updated_at ON contestant_cards;
CREATE TRIGGER contestant_cards_updated_at
  BEFORE UPDATE ON contestant_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_contestant_cards_updated_at();

-- RLS Policies
ALTER TABLE contestant_cards ENABLE ROW LEVEL SECURITY;

-- Anyone can view cards (they're public/shareable)
CREATE POLICY "Cards are viewable by everyone"
  ON contestant_cards FOR SELECT
  USING (true);

-- Contestants can manage their own cards
CREATE POLICY "Contestants can insert their own cards"
  ON contestant_cards FOR INSERT
  WITH CHECK (
    contestant_id IN (
      SELECT id FROM contestants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contestants can delete their own cards"
  ON contestant_cards FOR DELETE
  USING (
    contestant_id IN (
      SELECT id FROM contestants WHERE user_id = auth.uid()
    )
  );

-- Hosts and admins can manage any cards
CREATE POLICY "Hosts can manage cards"
  ON contestant_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_host = true OR profiles.is_super_admin = true)
    )
  );

-- Grant permissions
GRANT SELECT ON contestant_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON contestant_cards TO authenticated;

COMMENT ON TABLE contestant_cards IS 'Stores achievement cards for contestants at various milestones';
COMMENT ON COLUMN contestant_cards.achievement_type IS 'Type: nominated, contestant, advancing, top20, top10, top5, finalist, winner, runner_up';

-- Contestant fans table — tracks which users are fans of which contestants
CREATE TABLE IF NOT EXISTS contestant_fans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contestant_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contestant_fans_user ON contestant_fans(user_id);
CREATE INDEX IF NOT EXISTS idx_contestant_fans_contestant ON contestant_fans(contestant_id);

-- RLS policies
ALTER TABLE contestant_fans ENABLE ROW LEVEL SECURITY;

-- Anyone can read fan counts
CREATE POLICY "Anyone can read fan data"
  ON contestant_fans FOR SELECT
  USING (true);

-- Authenticated users can fan/unfan
CREATE POLICY "Users can insert their own fan records"
  ON contestant_fans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fan records"
  ON contestant_fans FOR DELETE
  USING (auth.uid() = user_id);

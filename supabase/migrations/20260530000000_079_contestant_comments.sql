-- Fan Wall — fans can leave public comments ("cheers") on a contestant's profile.
-- Mirrors the contestant_fans model (037): user_id references auth.users, public
-- read, self-only writes — plus a hidden flag so the profile owner can moderate.
CREATE TABLE IF NOT EXISTS contestant_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 280),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Newest-first reads per contestant, and per-user lookups.
CREATE INDEX IF NOT EXISTS idx_contestant_comments_contestant
  ON contestant_comments(contestant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contestant_comments_user
  ON contestant_comments(user_id);

ALTER TABLE contestant_comments ENABLE ROW LEVEL SECURITY;

-- Read: public sees visible comments; a comment author always sees their own;
-- the profile owner sees everything (incl. hidden) so they can moderate.
CREATE POLICY "Read visible comments or own or owner"
  ON contestant_comments FOR SELECT
  USING (
    hidden = false
    OR auth.uid() = user_id
    OR auth.uid() = (SELECT user_id FROM contestants WHERE id = contestant_id)
  );

-- Insert: only fans of this contestant can post, and only as themselves.
CREATE POLICY "Fans can post comments"
  ON contestant_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM contestant_fans f
      WHERE f.contestant_id = contestant_comments.contestant_id
        AND f.user_id = auth.uid()
    )
  );

-- Update: only the profile owner can toggle visibility (hide / unhide).
CREATE POLICY "Owner can moderate comments"
  ON contestant_comments FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM contestants WHERE id = contestant_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM contestants WHERE id = contestant_id));

-- Delete: the author can remove their own comment; the owner can remove any.
CREATE POLICY "Author or owner can delete comments"
  ON contestant_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT user_id FROM contestants WHERE id = contestant_id)
  );

-- Realtime: the Fan Wall subscribes to live INSERT/UPDATE/DELETE events.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE contestant_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

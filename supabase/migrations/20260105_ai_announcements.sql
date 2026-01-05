-- Migration: AI-powered announcements
-- Adds is_ai_generated flag to announcements and creates event tracking table

-- Add is_ai_generated column to announcements table
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Create table to track which competition events have already triggered auto-posts
-- This prevents duplicate posts when the scheduled function runs multiple times
CREATE TABLE IF NOT EXISTS ai_post_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'competition_launched',
    'nominations_open',
    'nominations_close',
    'voting_open',
    'voting_close',
    'results_announced'
  )),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL,
  -- Ensure we only create one post per event type per competition
  UNIQUE(competition_id, event_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_post_events_competition ON ai_post_events(competition_id);

-- RLS policies for ai_post_events
ALTER TABLE ai_post_events ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can insert/update
-- Super admins can view for debugging
CREATE POLICY "Super admins can view ai_post_events"
  ON ai_post_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Service role bypass (for edge functions)
CREATE POLICY "Service role can manage ai_post_events"
  ON ai_post_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

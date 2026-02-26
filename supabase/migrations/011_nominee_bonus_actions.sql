-- =============================================================================
-- Add bonus_actions column to profiles table
-- Persists nominee action-based bonus task completions (view_how_to_win,
-- share_profile) so they survive across devices and browser data clears.
-- Previously these were only stored in localStorage, which is fragile.
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus_actions JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.bonus_actions IS 'Tracks nominee bonus task completions (e.g. view_how_to_win, share_profile) so they persist across devices';

-- =============================================================================
-- Migration: Remove add_bio bonus task
-- The "Write your bio" task is redundant since "Complete your profile" already
-- requires a bio. This removes the task and any completions for it.
-- =============================================================================

-- Remove completions for add_bio tasks
DELETE FROM bonus_vote_completions
WHERE task_id IN (
  SELECT id FROM bonus_vote_tasks WHERE task_key = 'add_bio'
);

-- Remove the add_bio task definitions
DELETE FROM bonus_vote_tasks WHERE task_key = 'add_bio';

-- Update sort_order for remaining tasks to close the gap
UPDATE bonus_vote_tasks SET sort_order = 3 WHERE task_key = 'add_social' AND sort_order = 4;
UPDATE bonus_vote_tasks SET sort_order = 4 WHERE task_key = 'view_how_to_win' AND sort_order = 5;
UPDATE bonus_vote_tasks SET sort_order = 5 WHERE task_key = 'share_profile' AND sort_order = 6;

-- =============================================================================
-- Update setup_default_bonus_tasks to no longer include add_bio
-- =============================================================================
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out all profile fields including name, bio, city, and age', 10, 1),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 2),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 3),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 4),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 5)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

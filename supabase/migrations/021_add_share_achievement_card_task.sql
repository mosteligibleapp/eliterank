-- =============================================================================
-- Add share_achievement_card bonus vote task
-- Awards bonus votes when contestants share/download their achievement cards
-- =============================================================================

-- Add the new task to all existing competitions that have bonus tasks set up
INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
SELECT DISTINCT
  competition_id,
  'share_achievement_card',
  'Share an achievement card',
  'Download or share one of your achievement cards on social media',
  5,
  7
FROM bonus_vote_tasks
ON CONFLICT (competition_id, task_key) DO NOTHING;

-- Update the setup_default_bonus_tasks function to include the new task
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out all profile fields including name, bio, city, and age', 10, 1),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 2),
    (p_competition_id, 'add_bio', 'Write your bio', 'Tell voters about yourself with a compelling bio', 5, 3),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 4),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 5),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 6),
    (p_competition_id, 'share_achievement_card', 'Share an achievement card', 'Download or share one of your achievement cards on social media', 5, 7)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS insert policy exists for hosts creating custom tasks
-- (The existing "Hosts can manage bonus vote tasks" FOR ALL policy handles this)

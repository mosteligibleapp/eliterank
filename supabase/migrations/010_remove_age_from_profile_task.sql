-- Remove age requirement from complete_profile bonus task
-- Age is only collected during the nomination flow, not on the profile page,
-- so requiring it for profile completion prevents the task from ever completing.

UPDATE bonus_vote_tasks
SET description = 'Fill out your name, bio, and city'
WHERE task_key = 'complete_profile';

-- Also update the setup function so new competitions get the correct description
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out your name, bio, and city', 10, 1),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 2),
    (p_competition_id, 'add_bio', 'Write your bio', 'Tell voters about yourself with a compelling bio', 5, 3),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 4),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 5),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 6)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

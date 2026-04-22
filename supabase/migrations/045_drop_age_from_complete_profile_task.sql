-- =============================================================================
-- Migration: Drop "age" from the complete_profile bonus task description
--
-- The profile edit flow no longer has an age field, but every existing
-- bonus_vote_tasks row was seeded with the old copy ("Fill out all profile
-- fields including name, bio, city, and age"). Contestants see that line
-- and can't find where to add age, so the task reads as impossible.
--
-- Update existing rows in place and rewrite setup_default_bonus_tasks so
-- future competitions get the corrected description.
-- =============================================================================

UPDATE bonus_vote_tasks
SET description = 'Fill out all profile fields including name, bio, and city'
WHERE task_key = 'complete_profile'
  AND description LIKE '%and age%';

CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order, requires_approval, proof_label)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out all profile fields including name, bio, and city', 10, 1, FALSE, NULL),
    (p_competition_id, 'intro_video', 'Record an intro video', 'Upload a short (up to 60s) video telling voters who you are, where you''re from, what you do, and why you should win', 15, 2, TRUE, 'Upload your intro video'),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 3, FALSE, NULL),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 4, FALSE, NULL),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 5, FALSE, NULL),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 6, FALSE, NULL)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Fix: Remove add_bio bonus task that was accidentally re-introduced
--
-- Migration 009 correctly removed add_bio (redundant with complete_profile
-- which already requires a bio). Migration 010 accidentally re-added it to
-- setup_default_bonus_tasks, causing double-counting of bio-related votes
-- (35 max instead of the intended 30).
-- =============================================================================

-- Remove completions for any add_bio tasks created after migration 010
-- and subtract the incorrectly awarded votes from contestants & competitions
UPDATE contestants c
SET votes = GREATEST(0, c.votes - bvc.votes_awarded)
FROM bonus_vote_completions bvc
JOIN bonus_vote_tasks bvt ON bvt.id = bvc.task_id
WHERE bvt.task_key = 'add_bio'
  AND bvc.contestant_id = c.id;

UPDATE competitions comp
SET total_votes = GREATEST(0, comp.total_votes - sub.total_deduct)
FROM (
  SELECT bvt.competition_id, SUM(bvc.votes_awarded) AS total_deduct
  FROM bonus_vote_completions bvc
  JOIN bonus_vote_tasks bvt ON bvt.id = bvc.task_id
  WHERE bvt.task_key = 'add_bio'
  GROUP BY bvt.competition_id
) sub
WHERE comp.id = sub.competition_id;

UPDATE profiles p
SET total_votes_received = GREATEST(0, p.total_votes_received - bvc.votes_awarded)
FROM bonus_vote_completions bvc
JOIN bonus_vote_tasks bvt ON bvt.id = bvc.task_id
WHERE bvt.task_key = 'add_bio'
  AND bvc.user_id = p.id;

-- Delete completions and task definitions
DELETE FROM bonus_vote_completions
WHERE task_id IN (SELECT id FROM bonus_vote_tasks WHERE task_key = 'add_bio');

DELETE FROM bonus_vote_tasks WHERE task_key = 'add_bio';

-- Fix setup_default_bonus_tasks to not include add_bio
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out your name, bio, and city', 10, 1),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 2),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 3),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 4),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 5)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

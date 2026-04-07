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

-- =============================================================================
-- SAFEGUARD: Add a CHECK constraint to block deprecated task keys at the DB level.
-- If a future migration or manual insert tries to create an 'add_bio' task,
-- the INSERT will fail immediately.
-- =============================================================================
ALTER TABLE bonus_vote_tasks
  ADD CONSTRAINT chk_no_deprecated_task_keys
  CHECK (task_key NOT IN ('add_bio'));

-- =============================================================================
-- SAFEGUARD: Wrap award_bonus_votes with a redundancy check.
-- Even if a deprecated task somehow exists, the function will refuse to award
-- votes for any task_key whose effect is already covered by another task.
-- This prevents the same profile field from being double-rewarded.
-- =============================================================================
CREATE OR REPLACE FUNCTION award_bonus_votes(
  p_competition_id UUID,
  p_contestant_id UUID,
  p_user_id UUID,
  p_task_key VARCHAR(50)
) RETURNS JSONB AS $$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing UUID;
  v_completion_id UUID;
  v_deprecated_keys TEXT[] := ARRAY['add_bio'];
BEGIN
  -- Block deprecated task keys
  IF p_task_key = ANY(v_deprecated_keys) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task key is deprecated');
  END IF;

  -- Find the task
  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE competition_id = p_competition_id
    AND task_key = p_task_key
    AND enabled = TRUE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or disabled');
  END IF;

  -- Check if already completed (idempotent)
  SELECT id INTO v_existing
  FROM bonus_vote_completions
  WHERE task_id = v_task.id AND contestant_id = p_contestant_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed', 'already_completed', true);
  END IF;

  -- Record the completion
  INSERT INTO bonus_vote_completions (task_id, competition_id, contestant_id, user_id, votes_awarded)
  VALUES (v_task.id, p_competition_id, p_contestant_id, p_user_id, v_task.votes_awarded)
  RETURNING id INTO v_completion_id;

  -- Award the votes to the contestant
  UPDATE contestants
  SET votes = COALESCE(votes, 0) + v_task.votes_awarded
  WHERE id = p_contestant_id;

  -- Update competition total votes
  UPDATE competitions
  SET total_votes = COALESCE(total_votes, 0) + v_task.votes_awarded
  WHERE id = p_competition_id;

  -- Update profile total votes if user is linked
  IF p_user_id IS NOT NULL THEN
    UPDATE profiles
    SET total_votes_received = COALESCE(total_votes_received, 0) + v_task.votes_awarded
    WHERE id = p_user_id;
  END IF;

  -- Log activity
  PERFORM log_competition_activity(
    p_competition_id,
    'vote',
    (SELECT name FROM contestants WHERE id = p_contestant_id) || ' earned ' || v_task.votes_awarded || ' bonus votes for ' || v_task.label,
    p_contestant_id,
    jsonb_build_object('vote_count', v_task.votes_awarded, 'bonus_task', p_task_key, 'is_bonus', true)
  );

  RETURN jsonb_build_object(
    'success', true,
    'completion_id', v_completion_id,
    'votes_awarded', v_task.votes_awarded,
    'task_label', v_task.label
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

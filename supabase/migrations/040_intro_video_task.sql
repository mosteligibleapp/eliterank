-- =============================================================================
-- Migration: Intro Video bonus task + profile column
--
-- Adds a new built-in bonus task "Record an intro video" that contestants
-- can complete by uploading a ≤60s video. On host approval, the video URL
-- is copied to profiles.intro_video_url so it can be shown via a play badge
-- overlay on the contestant's avatar.
-- =============================================================================

-- Profile column holding the approved intro video URL
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Seed the task into all existing competitions
INSERT INTO bonus_vote_tasks (
  competition_id,
  task_key,
  label,
  description,
  votes_awarded,
  sort_order,
  requires_approval,
  proof_label,
  enabled
)
SELECT
  id,
  'intro_video',
  'Record an intro video',
  'Upload a short (up to 60s) video telling voters who you are, where you''re from, what you do, and why you should win',
  15,
  2,
  TRUE,
  'Upload your intro video',
  TRUE
FROM competitions
ON CONFLICT (competition_id, task_key) DO NOTHING;

-- Include in default setup for new competitions
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order, requires_approval, proof_label)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out all profile fields including name, bio, city, and age', 10, 1, FALSE, NULL),
    (p_competition_id, 'intro_video', 'Record an intro video', 'Upload a short (up to 60s) video telling voters who you are, where you''re from, what you do, and why you should win', 15, 2, TRUE, 'Upload your intro video'),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 3, FALSE, NULL),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 4, FALSE, NULL),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 5, FALSE, NULL),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 6, FALSE, NULL)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend review_bonus_submission: on approval for the intro_video task, copy
-- the approved proof_url onto the contestant's profile.
CREATE OR REPLACE FUNCTION review_bonus_submission(
  p_submission_id UUID,
  p_reviewer_id UUID,
  p_action VARCHAR(20),
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sub bonus_vote_submissions%ROWTYPE;
  v_task bonus_vote_tasks%ROWTYPE;
  v_award_result JSONB;
BEGIN
  SELECT * INTO v_sub FROM bonus_vote_submissions WHERE id = p_submission_id;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  SELECT * INTO v_task FROM bonus_vote_tasks WHERE id = v_sub.task_id;

  IF p_action = 'approve' THEN
    UPDATE bonus_vote_submissions
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_submission_id;

    -- Task-specific side effect: publish intro video to the profile
    IF v_task.task_key = 'intro_video' AND v_sub.user_id IS NOT NULL THEN
      UPDATE profiles
      SET intro_video_url = v_sub.proof_url
      WHERE id = v_sub.user_id;
    END IF;

    v_award_result := award_bonus_votes(
      v_sub.competition_id,
      v_sub.contestant_id,
      v_sub.user_id,
      v_task.task_key
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'approved',
      'votes_awarded', v_task.votes_awarded,
      'award_result', v_award_result
    );

  ELSIF p_action = 'reject' THEN
    UPDATE bonus_vote_submissions
    SET status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object('success', true, 'action', 'rejected');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

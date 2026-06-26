-- =============================================================================
-- remove_intro_video
--
-- Lets a contestant take down their own approved intro video and (if they
-- want) record a new one. Clears profiles.intro_video_url so it stops showing
-- publicly, and deletes the intro_video bonus_vote_submissions row so a fresh
-- submission is allowed (submit_bonus_proof blocks resubmission while a
-- submission is still 'approved').
--
-- The bonus_vote_completions row is intentionally KEPT, so the contestant
-- keeps the bonus votes they already earned for the task. A later re-approval
-- won't double-award (award_bonus_votes is idempotent on
-- UNIQUE(task_id, contestant_id)).
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_intro_video(
  p_competition_id UUID,
  p_contestant_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Only the owner may remove their own intro video.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id INTO v_task_id
  FROM bonus_vote_tasks
  WHERE competition_id = p_competition_id
    AND task_key = 'intro_video';

  -- Take the video off the public profile.
  UPDATE profiles SET intro_video_url = NULL WHERE id = p_user_id;

  -- Drop the submission so a new intro video can be submitted for review.
  -- Keep the completion (earned votes) intact.
  IF v_task_id IS NOT NULL THEN
    DELETE FROM bonus_vote_submissions
    WHERE task_id = v_task_id
      AND contestant_id = p_contestant_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION remove_intro_video(UUID, UUID, UUID) TO authenticated;

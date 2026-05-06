-- =============================================================================
-- Vote digest + bonus vote notifications
-- =============================================================================
-- Replaces the per-vote in-app notification with a daily digest, and adds
-- per-event notifications when a contestant earns or is rejected for bonus
-- votes.
--
--   Before this migration:
--     - Every INSERT into votes inserted a `vote_received` row in notifications
--       (very noisy — a contestant could get dozens of bell pings per day).
--     - award_bonus_votes() and review_bonus_submission() awarded votes
--       silently — contestants never learned their intro video was approved
--       or rejected.
--
--   After this migration:
--     - The per-vote trigger is removed. Existing `vote_received` rows are
--       left in place — they'll naturally age out as users mark them read or
--       the bell history rolls over.
--     - send-vote-digest edge function (cron: daily 23:00 UTC, peak engagement
--       hour from prod data) inserts one `vote_digest` row per contestant
--       summarising the last 24h.
--     - award_bonus_votes() inserts a `bonus_awarded` notification on credit.
--     - review_bonus_submission() inserts a `bonus_rejected` notification on
--       reject (approve still flows through award_bonus_votes for the
--       award notification).
--     - Both bonus RPCs now return contestant_user_id so the frontend
--       wrapper can fire a OneSignal push to the contestant's external_id.
-- =============================================================================

-- 1. Kill the per-vote in-app notification trigger. Stops new vote_received
--    rows from being created; existing rows are left untouched.
DROP TRIGGER IF EXISTS trigger_vote_notification ON votes;

-- 2. Add the new notification types to the enum CHECK constraint.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type CHECK (type = ANY (ARRAY[
  'nominated', 'nomination_approved', 'nominee_accepted', 'nominee_declined',
  'new_reward', 'prize_package', 'rank_change', 'vote_received',
  'event_posted', 'system_announcement', 'new_fan',
  'video_prompt', 'video_response',
  'vote_digest', 'bonus_awarded', 'bonus_rejected'
]));

-- 4. award_bonus_votes — add in-app notification on credit, return contestant_user_id.
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
  v_contestant_user_id UUID;
  v_comp_name TEXT;
BEGIN
  -- Find the task
  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE competition_id = p_competition_id
    AND task_key = p_task_key
    AND enabled = TRUE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or disabled');
  END IF;

  -- Idempotency check
  SELECT id INTO v_existing
  FROM bonus_vote_completions
  WHERE task_id = v_task.id AND contestant_id = p_contestant_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed', 'already_completed', true);
  END IF;

  -- Record + award
  INSERT INTO bonus_vote_completions (task_id, competition_id, contestant_id, user_id, votes_awarded)
  VALUES (v_task.id, p_competition_id, p_contestant_id, p_user_id, v_task.votes_awarded)
  RETURNING id INTO v_completion_id;

  UPDATE contestants
  SET votes = COALESCE(votes, 0) + v_task.votes_awarded
  WHERE id = p_contestant_id;

  UPDATE competitions
  SET total_votes = COALESCE(total_votes, 0) + v_task.votes_awarded
  WHERE id = p_competition_id;

  IF p_user_id IS NOT NULL THEN
    UPDATE profiles
    SET total_votes_received = COALESCE(total_votes_received, 0) + v_task.votes_awarded
    WHERE id = p_user_id;
  END IF;

  -- Resolve the contestant's user_id (contestants.user_id is the source of truth;
  -- p_user_id may be null when an admin awards on behalf of a not-yet-claimed entry).
  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = p_contestant_id;

  -- In-app notification (only if the contestant has a user account to receive it).
  IF v_contestant_user_id IS NOT NULL THEN
    SELECT name INTO v_comp_name FROM competitions WHERE id = p_competition_id;
    INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
    VALUES (
      v_contestant_user_id,
      'bonus_awarded',
      '+' || v_task.votes_awarded || ' bonus votes!',
      'You earned ' || v_task.votes_awarded || ' bonus votes for "' || v_task.label || '" in ' || COALESCE(v_comp_name, 'your competition') || '.',
      p_competition_id,
      p_contestant_id,
      jsonb_build_object(
        'votes_awarded', v_task.votes_awarded,
        'task_key', v_task.task_key,
        'task_label', v_task.label
      )
    );
  END IF;

  -- Activity log (unchanged)
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
    'task_label', v_task.label,
    'contestant_user_id', v_contestant_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. review_bonus_submission — notify on rejection (approve path notifies via
-- award_bonus_votes already). Also returns contestant_user_id so the frontend
-- wrapper can dispatch the push.
--
-- This re-defines the function from migration 040_intro_video_task.sql (which
-- last redefined it). We preserve the intro_video → profile.intro_video_url
-- copy behaviour from that migration.
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
  v_contestant_user_id UUID;
  v_comp_name TEXT;
BEGIN
  SELECT * INTO v_sub FROM bonus_vote_submissions WHERE id = p_submission_id;
  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  SELECT * INTO v_task FROM bonus_vote_tasks WHERE id = v_sub.task_id;
  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = v_sub.contestant_id;

  IF p_action = 'approve' THEN
    UPDATE bonus_vote_submissions
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_submission_id;

    -- intro_video task: copy approved proof URL onto the profile
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
      'award_result', v_award_result,
      'contestant_user_id', v_contestant_user_id,
      'task_label', v_task.label
    );

  ELSIF p_action = 'reject' THEN
    UPDATE bonus_vote_submissions
    SET status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_submission_id;

    -- In-app rejection notification
    IF v_contestant_user_id IS NOT NULL THEN
      SELECT name INTO v_comp_name FROM competitions WHERE id = v_sub.competition_id;
      INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
      VALUES (
        v_contestant_user_id,
        'bonus_rejected',
        'Bonus task needs another try',
        'Your submission for "' || v_task.label || '" in ' || COALESCE(v_comp_name, 'your competition') || ' was not approved.'
          || CASE WHEN p_rejection_reason IS NOT NULL AND length(p_rejection_reason) > 0
                  THEN ' Reason: ' || p_rejection_reason
                  ELSE '' END
          || ' You can resubmit.',
        v_sub.competition_id,
        v_sub.contestant_id,
        jsonb_build_object(
          'task_key', v_task.task_key,
          'task_label', v_task.label,
          'submission_id', p_submission_id,
          'rejection_reason', p_rejection_reason
        )
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'rejected',
      'contestant_user_id', v_contestant_user_id,
      'task_label', v_task.label,
      'rejection_reason', p_rejection_reason
    );

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_bonus_votes(UUID, UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION review_bonus_submission(UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- =============================================================================
-- Cron schedule for send-vote-digest — daily at 23:00 UTC
-- =============================================================================
-- 23:00 UTC was the absolute peak vote hour in the trailing 60 days of prod
-- traffic, so the digest lands at the start of the evening engagement window
-- (US Pacific 3pm / Eastern 6pm) — fans see "you got X votes yesterday" right
-- as their voters are about to vote again.
--
-- pg_cron + pg_net must be enabled (Supabase Dashboard → Database → Extensions)
-- and SUPABASE_URL + service role key inlined by an admin (not committed). If
-- you'd rather run it from an external scheduler, POST nightly to:
--   ${SUPABASE_URL}/functions/v1/send-vote-digest
-- with Authorization: Bearer <service_role_key>.

-- -- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- -- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- -- SELECT cron.unschedule('send-vote-digest')
-- --   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-vote-digest');
--
-- -- SELECT cron.schedule(
-- --   'send-vote-digest',
-- --   '0 23 * * *',                 -- daily 23:00 UTC
-- --   $$
-- --   SELECT net.http_post(
-- --     url := current_setting('app.supabase_url') || '/functions/v1/send-vote-digest',
-- --     headers := jsonb_build_object(
-- --       'Content-Type', 'application/json',
-- --       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
-- --     ),
-- --     body := '{}'::jsonb
-- --   );
-- --   $$
-- -- );

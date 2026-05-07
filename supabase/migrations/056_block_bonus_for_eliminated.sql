-- =============================================================================
-- Block bonus-vote awards / submissions for eliminated contestants
-- =============================================================================
-- Companion to migration 055 (which closes the votes-table insert path).
-- Bonus votes don't go through the votes table; they update contestants.votes
-- directly via award_bonus_votes / submit_bonus_proof / increment_contestant_votes.
-- This migration adds an early-return status check to each so eliminated
-- contestants can't earn bonus votes through any path:
--
--   - award_bonus_votes:        auto-awarded tasks, host-managed awards,
--                               nominee-action conversions, host approvals
--                               (review_bonus_submission calls this)
--   - submit_bonus_proof:       contestant-initiated proof submissions
--   - increment_contestant_votes: positive increments only (negative still
--                               allowed so hosts can revoke a stale award)

CREATE OR REPLACE FUNCTION public.award_bonus_votes(
  p_competition_id uuid,
  p_contestant_id uuid,
  p_user_id uuid,
  p_task_key character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing UUID;
  v_completion_id UUID;
  v_contestant_user_id UUID;
  v_comp_name TEXT;
  v_contestant_status TEXT;
BEGIN
  -- Block awards for eliminated contestants. Returning a structured error
  -- (rather than RAISE) keeps the existing RPC contract — callers already
  -- inspect `success` and `error` fields.
  SELECT status INTO v_contestant_status
  FROM contestants
  WHERE id = p_contestant_id;

  IF v_contestant_status = 'eliminated' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contestant is eliminated and cannot earn bonus votes',
      'eliminated', true
    );
  END IF;

  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE competition_id = p_competition_id
    AND task_key = p_task_key
    AND enabled = TRUE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or disabled');
  END IF;

  SELECT id INTO v_existing
  FROM bonus_vote_completions
  WHERE task_id = v_task.id AND contestant_id = p_contestant_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed', 'already_completed', true);
  END IF;

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

  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = p_contestant_id;

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
$function$;

CREATE OR REPLACE FUNCTION public.submit_bonus_proof(
  p_competition_id uuid,
  p_contestant_id uuid,
  p_user_id uuid,
  p_task_id uuid,
  p_proof_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing bonus_vote_submissions%ROWTYPE;
  v_submission_id UUID;
  v_contestant_status TEXT;
BEGIN
  SELECT status INTO v_contestant_status
  FROM contestants
  WHERE id = p_contestant_id;

  IF v_contestant_status = 'eliminated' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Contestant is eliminated and cannot submit bonus task proof',
      'eliminated', true
    );
  END IF;

  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE id = p_task_id
    AND competition_id = p_competition_id
    AND enabled = TRUE
    AND requires_approval = TRUE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or does not require approval');
  END IF;

  SELECT * INTO v_existing
  FROM bonus_vote_submissions
  WHERE task_id = p_task_id AND contestant_id = p_contestant_id;

  IF v_existing.id IS NOT NULL AND v_existing.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  INSERT INTO bonus_vote_submissions (task_id, competition_id, contestant_id, user_id, proof_url, status)
  VALUES (p_task_id, p_competition_id, p_contestant_id, p_user_id, p_proof_url, 'pending')
  ON CONFLICT (task_id, contestant_id)
  DO UPDATE SET
    proof_url = EXCLUDED.proof_url,
    status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object('success', true, 'submission_id', v_submission_id);
END;
$function$;

-- increment_contestant_votes is dual-use: bonus paths add positive counts,
-- but host revoke flows pass a negative count to undo a stale award. We
-- only block the positive-count path so revokes still work even after
-- a contestant is eliminated.
CREATE OR REPLACE FUNCTION public.increment_contestant_votes(
  p_contestant_id uuid,
  p_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contestant_status TEXT;
BEGIN
  IF p_count > 0 THEN
    SELECT status INTO v_contestant_status
    FROM contestants
    WHERE id = p_contestant_id;

    IF v_contestant_status = 'eliminated' THEN
      RAISE EXCEPTION 'Contestant is eliminated and cannot receive new votes'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE contestants
  SET votes = COALESCE(votes, 0) + p_count
  WHERE id = p_contestant_id;
END;
$function$;

-- =============================================================================
-- Migration 104: Master "bonus votes enabled" switch per competition
--
-- Bonus votes are on by default (migration 103), but a host can turn the whole
-- feature off for their competition — up until voting begins (the lock itself
-- is enforced in the host UI). When off:
--   * award_bonus_votes / submit_bonus_proof refuse (defense in depth), and
--   * get_bonus_vote_status returns nothing, so contestant surfaces show no
--     bonus tasks at all.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS bonus_votes_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN competitions.bonus_votes_enabled IS
  'Master switch for the bonus-votes feature. Hosts may turn it off until voting begins.';

-- ── Gate the contestant-facing status RPC ───────────────────────────────────
-- (rebuilds migration 031's definition with a competition-level short-circuit)
CREATE OR REPLACE FUNCTION get_bonus_vote_status(
  p_competition_id UUID,
  p_contestant_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Feature turned off for this competition → no bonus tasks at all.
  IF (SELECT bonus_votes_enabled FROM competitions WHERE id = p_competition_id) = FALSE THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_key', t.task_key,
      'label', t.label,
      'description', t.description,
      'votes_awarded', t.votes_awarded,
      'sort_order', t.sort_order,
      'completed', (c.id IS NOT NULL),
      'completed_at', c.completed_at,
      'is_custom', COALESCE(t.is_custom, false),
      'requires_approval', COALESCE(t.requires_approval, false),
      'host_managed', COALESCE(t.host_managed, false),
      'proof_label', t.proof_label,
      'submission_status', s.status,
      'submission_id', s.id,
      'rejection_reason', s.rejection_reason,
      'proof_url', s.proof_url
    ) ORDER BY t.sort_order, t.created_at
  ) INTO v_result
  FROM bonus_vote_tasks t
  LEFT JOIN bonus_vote_completions c
    ON c.task_id = t.id AND c.contestant_id = p_contestant_id
  LEFT JOIN bonus_vote_submissions s
    ON s.task_id = t.id AND s.contestant_id = p_contestant_id
  WHERE t.competition_id = p_competition_id
    AND t.enabled = TRUE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Gate the award path ─────────────────────────────────────────────────────
-- (rebuilds migration 056's definition, adding the competition-level check)
CREATE OR REPLACE FUNCTION public.award_bonus_votes(
  p_competition_id uuid,
  p_contestant_id uuid,
  p_user_id uuid,
  p_task_key character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing UUID;
  v_completion_id UUID;
  v_contestant_user_id UUID;
  v_comp_name TEXT;
  v_contestant_status TEXT;
BEGIN
  -- Bonus votes turned off for this competition.
  IF (SELECT bonus_votes_enabled FROM competitions WHERE id = p_competition_id) = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bonus votes are turned off for this competition',
      'bonus_disabled', true
    );
  END IF;

  -- Block awards for eliminated contestants.
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

-- ── Gate the proof-submission path ──────────────────────────────────────────
-- (rebuilds migration 056's definition, adding the competition-level check)
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
SET search_path = public
AS $function$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing bonus_vote_submissions%ROWTYPE;
  v_submission_id UUID;
  v_contestant_status TEXT;
BEGIN
  -- Bonus votes turned off for this competition.
  IF (SELECT bonus_votes_enabled FROM competitions WHERE id = p_competition_id) = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bonus votes are turned off for this competition',
      'bonus_disabled', true
    );
  END IF;

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

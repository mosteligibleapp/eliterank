-- =============================================================================
-- Custom Bonus Tasks with Proof Submission & Host Approval
-- Allows hosts to create custom bonus vote tasks that require contestants
-- to submit proof (e.g., a URL) which the host then approves/rejects.
-- =============================================================================

-- =============================================================================
-- Extend bonus_vote_tasks with custom task support
-- =============================================================================
ALTER TABLE bonus_vote_tasks
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS proof_label TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) DEFAULT NULL;

-- =============================================================================
-- TABLE: bonus_vote_submissions
-- Tracks proof submissions for approval-based bonus tasks
-- =============================================================================
CREATE TABLE IF NOT EXISTS bonus_vote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES bonus_vote_tasks(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Proof data
  proof_url TEXT NOT NULL,

  -- Review state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES profiles(id) DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One submission per task per contestant (upsert on resubmission)
  UNIQUE(task_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_submissions_competition_status
  ON bonus_vote_submissions(competition_id, status);
CREATE INDEX IF NOT EXISTS idx_bonus_submissions_contestant
  ON bonus_vote_submissions(contestant_id);

CREATE TRIGGER update_bonus_vote_submissions_updated_at BEFORE UPDATE ON bonus_vote_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS for bonus_vote_submissions
-- =============================================================================
ALTER TABLE bonus_vote_submissions ENABLE ROW LEVEL SECURITY;

-- Contestants can view their own submissions
CREATE POLICY "Users can view own submissions" ON bonus_vote_submissions FOR SELECT
  USING (user_id = auth.uid());

-- Hosts/admins can view all submissions for their competitions
CREATE POLICY "Hosts can view competition submissions" ON bonus_vote_submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM competitions c
    JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = bonus_vote_submissions.competition_id
    AND (p.is_super_admin = true OR c.host_id = auth.uid())
  ));

-- Service role / RPC functions handle inserts/updates (SECURITY DEFINER)
CREATE POLICY "Service role can manage submissions" ON bonus_vote_submissions FOR ALL
  USING (true) WITH CHECK (true);

-- =============================================================================
-- FUNCTION: submit_bonus_proof
-- Contestant submits proof for an approval-based task
-- =============================================================================
CREATE OR REPLACE FUNCTION submit_bonus_proof(
  p_competition_id UUID,
  p_contestant_id UUID,
  p_user_id UUID,
  p_task_id UUID,
  p_proof_url TEXT
) RETURNS JSONB AS $$
DECLARE
  v_task bonus_vote_tasks%ROWTYPE;
  v_existing bonus_vote_submissions%ROWTYPE;
  v_submission_id UUID;
BEGIN
  -- Validate the task exists and requires approval
  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE id = p_task_id
    AND competition_id = p_competition_id
    AND enabled = TRUE
    AND requires_approval = TRUE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or does not require approval');
  END IF;

  -- Check if already approved (can't resubmit after approval)
  SELECT * INTO v_existing
  FROM bonus_vote_submissions
  WHERE task_id = p_task_id AND contestant_id = p_contestant_id;

  IF v_existing.id IS NOT NULL AND v_existing.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  -- Upsert the submission (insert or update if rejected/pending)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_bonus_proof(UUID, UUID, UUID, UUID, TEXT) TO authenticated;

-- =============================================================================
-- FUNCTION: review_bonus_submission
-- Host approves or rejects a submission. On approve, awards votes.
-- =============================================================================
CREATE OR REPLACE FUNCTION review_bonus_submission(
  p_submission_id UUID,
  p_reviewer_id UUID,
  p_action VARCHAR(20),  -- 'approve' or 'reject'
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sub bonus_vote_submissions%ROWTYPE;
  v_task bonus_vote_tasks%ROWTYPE;
  v_award_result JSONB;
BEGIN
  -- Get the submission
  SELECT * INTO v_sub
  FROM bonus_vote_submissions
  WHERE id = p_submission_id;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  -- Get the task for the task_key
  SELECT * INTO v_task
  FROM bonus_vote_tasks
  WHERE id = v_sub.task_id;

  IF p_action = 'approve' THEN
    -- Update submission status
    UPDATE bonus_vote_submissions
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_submission_id;

    -- Award votes using existing function
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

GRANT EXECUTE ON FUNCTION review_bonus_submission(UUID, UUID, VARCHAR, TEXT) TO authenticated;

-- =============================================================================
-- Update get_bonus_vote_status to include custom task fields + submission status
-- =============================================================================
CREATE OR REPLACE FUNCTION get_bonus_vote_status(
  p_competition_id UUID,
  p_contestant_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

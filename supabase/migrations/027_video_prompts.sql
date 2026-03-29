-- =============================================================================
-- Video Prompts: Reality-show interview style video Q&A
-- Hosts create prompts (questions), contestants upload video responses,
-- hosts review and approve/reject.
-- =============================================================================

-- =============================================================================
-- TABLE: video_prompts
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  prompt_text TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_prompts_competition
  ON video_prompts(competition_id, is_active);

CREATE TRIGGER update_video_prompts_updated_at BEFORE UPDATE ON video_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: video_prompt_responses
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES video_prompts(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  video_url TEXT NOT NULL,
  duration_seconds INT,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES profiles(id) DEFAULT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  rejection_reason TEXT,
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(prompt_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_video_responses_competition_status
  ON video_prompt_responses(competition_id, status);
CREATE INDEX IF NOT EXISTS idx_video_responses_contestant
  ON video_prompt_responses(contestant_id);

CREATE TRIGGER update_video_prompt_responses_updated_at BEFORE UPDATE ON video_prompt_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS for video_prompts
-- =============================================================================
ALTER TABLE video_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prompts" ON video_prompts FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role can manage prompts" ON video_prompts FOR ALL
  USING (true) WITH CHECK (true);

-- =============================================================================
-- RLS for video_prompt_responses
-- =============================================================================
ALTER TABLE video_prompt_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses" ON video_prompt_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Hosts can view competition responses" ON video_prompt_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM competitions c
    JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = video_prompt_responses.competition_id
    AND (p.is_super_admin = true OR c.host_id = auth.uid())
  ));

CREATE POLICY "Service role can manage responses" ON video_prompt_responses FOR ALL
  USING (true) WITH CHECK (true);

-- =============================================================================
-- FUNCTION: submit_video_response
-- Contestant submits a video response to a prompt
-- =============================================================================
CREATE OR REPLACE FUNCTION submit_video_response(
  p_prompt_id UUID,
  p_competition_id UUID,
  p_contestant_id UUID,
  p_user_id UUID,
  p_video_url TEXT,
  p_duration_seconds INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_prompt video_prompts%ROWTYPE;
  v_existing video_prompt_responses%ROWTYPE;
  v_response_id UUID;
BEGIN
  -- Validate prompt exists and is active
  SELECT * INTO v_prompt
  FROM video_prompts
  WHERE id = p_prompt_id
    AND competition_id = p_competition_id
    AND is_active = TRUE;

  IF v_prompt.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prompt not found or inactive');
  END IF;

  -- Check if already approved (can't resubmit after approval)
  SELECT * INTO v_existing
  FROM video_prompt_responses
  WHERE prompt_id = p_prompt_id AND contestant_id = p_contestant_id;

  IF v_existing.id IS NOT NULL AND v_existing.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  -- Upsert the response
  INSERT INTO video_prompt_responses (prompt_id, competition_id, contestant_id, user_id, video_url, duration_seconds, status)
  VALUES (p_prompt_id, p_competition_id, p_contestant_id, p_user_id, p_video_url, p_duration_seconds, 'pending')
  ON CONFLICT (prompt_id, contestant_id)
  DO UPDATE SET
    video_url = EXCLUDED.video_url,
    duration_seconds = EXCLUDED.duration_seconds,
    status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  RETURNING id INTO v_response_id;

  RETURN jsonb_build_object('success', true, 'response_id', v_response_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_video_response(UUID, UUID, UUID, UUID, TEXT, INT) TO authenticated;

-- =============================================================================
-- FUNCTION: review_video_response
-- Host approves or rejects a video response
-- =============================================================================
CREATE OR REPLACE FUNCTION review_video_response(
  p_response_id UUID,
  p_reviewer_id UUID,
  p_action VARCHAR(20),  -- 'approve' or 'reject'
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_resp video_prompt_responses%ROWTYPE;
BEGIN
  SELECT * INTO v_resp
  FROM video_prompt_responses
  WHERE id = p_response_id;

  IF v_resp.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Response not found');
  END IF;

  IF v_resp.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already approved');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE video_prompt_responses
    SET status = 'approved',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        is_public = TRUE,
        updated_at = NOW()
    WHERE id = p_response_id;

    RETURN jsonb_build_object('success', true, 'action', 'approved');

  ELSIF p_action = 'reject' THEN
    UPDATE video_prompt_responses
    SET status = 'rejected',
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_response_id;

    RETURN jsonb_build_object('success', true, 'action', 'rejected');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION review_video_response(UUID, UUID, VARCHAR, TEXT) TO authenticated;

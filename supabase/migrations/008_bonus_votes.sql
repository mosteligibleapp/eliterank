-- =============================================================================
-- Bonus Votes System
-- Automatically awards bonus votes to contestants for completing specific tasks
-- =============================================================================

-- =============================================================================
-- TABLE: bonus_vote_tasks
-- Defines the available bonus vote tasks per competition
-- =============================================================================
CREATE TABLE bonus_vote_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,

  -- Task definition
  task_key VARCHAR(50) NOT NULL,  -- 'complete_profile', 'view_how_to_win', 'add_photo', 'add_bio', 'add_social', 'share_profile'
  label TEXT NOT NULL,
  description TEXT,
  votes_awarded INTEGER NOT NULL DEFAULT 5,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(competition_id, task_key)
);

CREATE INDEX idx_bonus_vote_tasks_competition ON bonus_vote_tasks(competition_id);
CREATE TRIGGER update_bonus_vote_tasks_updated_at BEFORE UPDATE ON bonus_vote_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: bonus_vote_completions
-- Records when a contestant completes a bonus vote task
-- =============================================================================
CREATE TABLE bonus_vote_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES bonus_vote_tasks(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Votes awarded
  votes_awarded INTEGER NOT NULL DEFAULT 0,

  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each contestant can only complete each task once
  UNIQUE(task_id, contestant_id)
);

CREATE INDEX idx_bonus_vote_completions_contestant ON bonus_vote_completions(contestant_id);
CREATE INDEX idx_bonus_vote_completions_competition ON bonus_vote_completions(competition_id);
CREATE INDEX idx_bonus_vote_completions_task ON bonus_vote_completions(task_id);

-- =============================================================================
-- FUNCTION: award_bonus_votes
-- Awards bonus votes for a completed task (idempotent - won't double-award)
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

GRANT EXECUTE ON FUNCTION award_bonus_votes(UUID, UUID, UUID, VARCHAR) TO authenticated;

-- =============================================================================
-- FUNCTION: get_bonus_vote_status
-- Returns the bonus vote tasks and completion status for a contestant
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
      'completed_at', c.completed_at
    ) ORDER BY t.sort_order, t.created_at
  ) INTO v_result
  FROM bonus_vote_tasks t
  LEFT JOIN bonus_vote_completions c
    ON c.task_id = t.id AND c.contestant_id = p_contestant_id
  WHERE t.competition_id = p_competition_id
    AND t.enabled = TRUE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_bonus_vote_status(UUID, UUID) TO authenticated;

-- =============================================================================
-- FUNCTION: setup_default_bonus_tasks
-- Creates the default set of bonus vote tasks for a competition
-- =============================================================================
CREATE OR REPLACE FUNCTION setup_default_bonus_tasks(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bonus_vote_tasks (competition_id, task_key, label, description, votes_awarded, sort_order)
  VALUES
    (p_competition_id, 'complete_profile', 'Complete your profile', 'Fill out all profile fields including name, bio, city, and age', 10, 1),
    (p_competition_id, 'add_photo', 'Add a profile photo', 'Upload a profile photo so voters can see you', 5, 2),
    (p_competition_id, 'add_bio', 'Write your bio', 'Tell voters about yourself with a compelling bio', 5, 3),
    (p_competition_id, 'add_social', 'Link a social account', 'Connect your Instagram, Twitter, or TikTok', 5, 4),
    (p_competition_id, 'view_how_to_win', 'Review How to Win info', 'Read through the competition rules and tips', 5, 5),
    (p_competition_id, 'share_profile', 'Share your profile', 'Share your contestant profile link externally', 5, 6)
  ON CONFLICT (competition_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION setup_default_bonus_tasks(UUID) TO authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE bonus_vote_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_vote_completions ENABLE ROW LEVEL SECURITY;

-- Tasks are publicly readable
CREATE POLICY "Bonus vote tasks are viewable by everyone" ON bonus_vote_tasks FOR SELECT USING (true);

-- Hosts and admins can manage tasks
CREATE POLICY "Hosts can manage bonus vote tasks" ON bonus_vote_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM competitions c
    JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = bonus_vote_tasks.competition_id
    AND (p.is_super_admin = true OR c.host_id = auth.uid())
  ));

-- Completions viewable by the contestant or admins
CREATE POLICY "Contestants can view own bonus completions" ON bonus_vote_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bonus completions" ON bonus_vote_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM competitions c
    JOIN profiles p ON p.id = auth.uid()
    WHERE c.id = bonus_vote_completions.competition_id
    AND (p.is_super_admin = true OR c.host_id = auth.uid())
  ));

-- Service role / RPC functions handle inserts (SECURITY DEFINER)
CREATE POLICY "Service role can manage bonus completions" ON bonus_vote_completions FOR ALL
  USING (true) WITH CHECK (true);

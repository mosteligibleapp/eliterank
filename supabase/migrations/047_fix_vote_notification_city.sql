-- Fix on_vote_notification to not rely on city column
-- Uses competition name instead

CREATE OR REPLACE FUNCTION on_vote_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_user_id UUID;
  v_comp_name TEXT;
  v_vote_count INTEGER;
BEGIN
  SELECT user_id INTO v_contestant_user_id FROM contestants WHERE id = NEW.contestant_id;
  IF v_contestant_user_id IS NULL THEN RETURN NEW; END IF;
  v_vote_count := COALESCE(NEW.vote_count, 1);
  SELECT name INTO v_comp_name FROM competitions WHERE id = NEW.competition_id;
  INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
  VALUES (
    v_contestant_user_id, 'vote_received', 'New votes!',
    'You received ' || v_vote_count || ' vote' || CASE WHEN v_vote_count > 1 THEN 's' ELSE '' END || ' in ' || COALESCE(v_comp_name, 'your competition'),
    NEW.competition_id, NEW.contestant_id, jsonb_build_object('vote_count', v_vote_count)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

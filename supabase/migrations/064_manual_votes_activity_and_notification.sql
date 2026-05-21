-- =============================================================================
-- Manual votes appear in the activity feed and notify the contestant
-- =============================================================================
-- Regular votes fire two triggers on the votes table: on_vote_inserted() logs a
-- 'vote' row into competition_activity (the activity feed), and
-- on_vote_notification() inserts a 'vote_received' notification for the
-- contestant. Manual votes should do the same so they show up in the activity
-- feed and send an in-app notification "like the other votes".
--
-- This folds both into the existing process_manual_vote() trigger function
-- (migrations 061/063) — one function, one trigger, no extra triggers needed.
-- The message format, activity type, and notification shape are kept identical
-- to regular votes so the UI renders them the same way.

CREATE OR REPLACE FUNCTION process_manual_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status              TEXT;
  v_contestant_name     TEXT;
  v_contestant_user_id  UUID;
  v_comp_city           TEXT;
BEGIN
  SELECT status, name, user_id
    INTO v_status, v_contestant_name, v_contestant_user_id
    FROM contestants WHERE id = NEW.contestant_id;

  IF v_status = 'eliminated' THEN
    RAISE EXCEPTION 'Contestant is eliminated and cannot receive new votes'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE contestants
    SET votes                = votes + NEW.vote_count,
        lifetime_bonus_votes = lifetime_bonus_votes + NEW.vote_count,
        lifetime_votes       = lifetime_votes + NEW.vote_count
    WHERE id = NEW.contestant_id;

  UPDATE competitions
    SET total_votes = total_votes + NEW.vote_count
    WHERE id = NEW.competition_id;

  -- Activity feed entry — same 'vote' type and message format as regular votes.
  PERFORM log_competition_activity(
    NEW.competition_id, 'vote',
    v_contestant_name || ' received ' || NEW.vote_count
      || ' vote' || CASE WHEN NEW.vote_count > 1 THEN 's' ELSE '' END,
    NEW.contestant_id,
    jsonb_build_object('vote_count', NEW.vote_count, 'added_by', NEW.added_by)
  );

  -- In-app notification for the contestant — mirrors on_vote_notification().
  IF v_contestant_user_id IS NOT NULL THEN
    SELECT city INTO v_comp_city FROM competitions WHERE id = NEW.competition_id;
    INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
    VALUES (
      v_contestant_user_id, 'vote_received', 'New votes!',
      'You received ' || NEW.vote_count
        || ' vote' || CASE WHEN NEW.vote_count > 1 THEN 's' ELSE '' END
        || ' in ' || COALESCE(v_comp_city, 'your competition'),
      NEW.competition_id, NEW.contestant_id,
      jsonb_build_object('vote_count', NEW.vote_count)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION process_manual_vote() IS
  'AFTER INSERT trigger on manual_votes: folds host-added votes into contestants.votes, the lifetime counters, and competitions.total_votes; logs a competition_activity feed entry; and notifies the contestant. Refuses eliminated contestants.';

-- =============================================================================
-- Fix: process_manual_vote() referenced a non-existent competitions.city column
-- =============================================================================
-- Migration 064 mirrored an outdated copy of on_vote_notification() that did
-- SELECT city FROM competitions. The competitions table has no `city` column
-- (it uses city_id), so every manual-vote insert failed with
-- 'column "city" does not exist'. The current on_vote_notification() builds the
-- notification body from the competition's name instead — this matches that.

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
  v_comp_name           TEXT;
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
    SELECT name INTO v_comp_name FROM competitions WHERE id = NEW.competition_id;
    INSERT INTO notifications (user_id, type, title, body, competition_id, contestant_id, metadata)
    VALUES (
      v_contestant_user_id, 'vote_received', 'New votes!',
      'You received ' || NEW.vote_count
        || ' vote' || CASE WHEN NEW.vote_count > 1 THEN 's' ELSE '' END
        || ' in ' || COALESCE(v_comp_name, 'your competition'),
      NEW.competition_id, NEW.contestant_id,
      jsonb_build_object('vote_count', NEW.vote_count)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION process_manual_vote() IS
  'AFTER INSERT trigger on manual_votes: folds host-added votes into contestants.votes, the lifetime counters, and competitions.total_votes; logs a competition_activity feed entry; and notifies the contestant. Refuses eliminated contestants.';

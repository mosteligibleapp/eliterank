-- =============================================================================
-- Apply host-added manual votes to the leaderboard
-- =============================================================================
-- Hosts credit votes to a contestant from the dashboard. Those votes cannot go
-- through the `votes` table: validate_free_vote_count() (migration 051) rejects
-- any client-side insert whose vote_count is not 1 or 2, and chk_vote_count_range
-- caps a single row at 1000. So host-added batches are stored in `manual_votes`.
--
-- This trigger mirrors process_vote(): it folds each manual_votes row into
-- contestants.votes and competitions.total_votes so the contestant's public
-- leaderboard total updates immediately. Eliminated contestants are refused,
-- matching reject_votes_for_eliminated() on the votes table.
--
-- NOTE: any future reconciliation of contestants.votes (see migration 044)
-- must add SUM(manual_votes.vote_count) to its total, or host-added votes
-- will be dropped.

CREATE OR REPLACE FUNCTION process_manual_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM contestants WHERE id = NEW.contestant_id;

  IF v_status = 'eliminated' THEN
    RAISE EXCEPTION 'Contestant is eliminated and cannot receive new votes'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE contestants
    SET votes = votes + NEW.vote_count
    WHERE id = NEW.contestant_id;

  UPDATE competitions
    SET total_votes = total_votes + NEW.vote_count
    WHERE id = NEW.competition_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_manual_vote_insert ON manual_votes;
CREATE TRIGGER on_manual_vote_insert
  AFTER INSERT ON manual_votes
  FOR EACH ROW
  EXECUTE FUNCTION process_manual_vote();

COMMENT ON FUNCTION process_manual_vote() IS
  'AFTER INSERT trigger on manual_votes: folds host-added votes into contestants.votes and competitions.total_votes; refuses eliminated contestants.';

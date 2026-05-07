-- =============================================================================
-- Block votes for eliminated contestants
-- =============================================================================
-- Once a contestant is marked status = 'eliminated' by finalize_voting_round(),
-- no further votes (paid, free, or anonymous) should be accepted on their
-- behalf. Their profile page stays accessible for history/analytics, but the
-- vote insert path is closed.
--
-- Enforced at the database level so every code path is covered uniformly:
-- the Stripe webhook, client-side recordPaidVote, submitFreeVote, and the
-- anonymous-vote API all eventually INSERT into the votes table.

CREATE OR REPLACE FUNCTION reject_votes_for_eliminated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM contestants
  WHERE id = NEW.contestant_id;

  IF v_status = 'eliminated' THEN
    RAISE EXCEPTION 'Contestant is eliminated and cannot receive new votes'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reject_votes_eliminated ON votes;
CREATE TRIGGER trigger_reject_votes_eliminated
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION reject_votes_for_eliminated();

COMMENT ON FUNCTION reject_votes_for_eliminated() IS
  'BEFORE INSERT trigger guard: refuses any new vote row whose contestant is in status=eliminated. Profile pages remain accessible; only the vote insert path is closed.';

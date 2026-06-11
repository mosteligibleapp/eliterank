-- =============================================================================
-- Reject paid votes when the voting round is closed
-- =============================================================================
-- Incident #573: a vote payment confirmed a few seconds AFTER a round's
-- end_date credited votes into an already-finalized round, forcing a manual
-- refund and a manual contestant-elimination correction.
--
-- The window: createVotePaymentIntent() checks the round is open (T0), the
-- round's end_date passes and finalize_voting_round() snapshots the result
-- (T1), then the Stripe payment confirms and the votes get inserted (T2).
-- The credit path had no binding round check, so a payment confirmed at T2
-- silently mutated a finalized result.
--
-- This guard makes the invariant unspoofable at the database level, covering
-- every paid-vote path uniformly: the stripe-webhook (service role) and the
-- client-side optimistic recordPaidVote() (authenticated role) both INSERT a
-- row carrying payment_intent_id. A paid vote may only land while a votable
-- round (voting or finale) is currently open; otherwise it is refused and the
-- stripe-webhook auto-refunds the buyer.
--
-- Free / anonymous votes (payment_intent_id IS NULL) are NOT affected here —
-- they have their own cutoff enforcement (ensure_round_state in submitFreeVote
-- and the hard 400 in api/cast-anonymous-vote.js).

CREATE OR REPLACE FUNCTION reject_paid_votes_when_round_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only guard paid votes; free/anonymous votes carry no payment_intent_id.
  IF NEW.payment_intent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- A paid vote may only be credited while a votable round is open. We check
  -- end_date > NOW() directly (independent of finalized_at) so the guard holds
  -- even in the race where the round's end_date has passed but pull-based
  -- finalization hasn't run yet.
  IF NOT EXISTS (
    SELECT 1
    FROM voting_rounds
    WHERE competition_id = NEW.competition_id
      AND round_type IN ('voting', 'finale')
      AND start_date <= NOW()
      AND end_date > NOW()
  ) THEN
    RAISE EXCEPTION 'Voting round is closed; paid vote rejected for competition %', NEW.competition_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reject_paid_votes_round_closed ON votes;
CREATE TRIGGER trigger_reject_paid_votes_round_closed
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION reject_paid_votes_when_round_closed();

COMMENT ON FUNCTION reject_paid_votes_when_round_closed() IS
  'BEFORE INSERT trigger guard: refuses any paid vote (payment_intent_id IS NOT NULL) when no votable round is currently open for the competition. Prevents a payment confirmed after a round''s end_date from crediting votes into a finalized result (incident #573). Free/anonymous votes are unaffected.';

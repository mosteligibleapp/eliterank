-- ─────────────────────────────────────────────────────────────────────────
-- 080: Reject paid votes once the votable round has closed
-- ─────────────────────────────────────────────────────────────────────────
--
-- Incident (2026-06-09): a vote payment confirmed AFTER the round had ended.
-- The votes were credited into the already-finalized round, which forced us
-- to refund the customer and tell a contestant she'd been eliminated — the
-- post-cutoff votes should never have counted.
--
-- Why a DB trigger (and not just an edge-function check):
--   There are TWO writers to `votes` for a paid purchase —
--     1) the client (recordPaidVote in src/lib/votes.js), which fires the
--        moment Stripe confirms payment in the browser, and
--     2) the stripe-webhook edge function.
--   The client write almost always WINS the race (it has no Stripe network
--   round-trip), so a guard living only in the webhook is bypassed: the
--   client inserts the post-cutoff vote, and the webhook then short-circuits
--   on the existing row. The only place that catches BOTH writers is the
--   database itself. This trigger is that binding, path-independent guard.
--
-- Scope: only PAID votes (payment_intent_id IS NOT NULL). Free votes keep
-- their existing validation (validate_free_vote_count, migration 051) and the
-- anonymous-vote API's own active-round check. We also DO NOT skip
-- service_role here (unlike the free-vote trigger): the stripe-webhook runs as
-- service_role and must be subject to this guard too, so that when it cannot
-- insert it knows to void the held authorization (payments use Stripe manual
-- capture; a refund is only the last-resort fallback if funds were captured).
--
-- Pure read: this trigger never finalizes a round (no side effects in a
-- BEFORE INSERT). It only asks "is a votable round open right now?".
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_paid_vote_round()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Free votes are gated elsewhere; only guard paid (Stripe-backed) votes.
  IF NEW.payment_intent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only enforce for competitions that actually use rounds. If rounds exist,
  -- a paid vote must land inside an open votable one (voting or finale).
  -- Judging / resurrection rounds are not votable; the gap between rounds
  -- counts as closed. Round-less competitions (if any) are unaffected.
  IF EXISTS (
    SELECT 1 FROM voting_rounds WHERE competition_id = NEW.competition_id
  ) AND NOT EXISTS (
    SELECT 1 FROM voting_rounds
    WHERE competition_id = NEW.competition_id
      AND round_type IN ('voting', 'finale')
      AND start_date <= NOW()
      AND end_date > NOW()
  ) THEN
    RAISE EXCEPTION 'Voting is closed for competition % — paid vote rejected', NEW.competition_id
      USING ERRCODE = 'check_violation', HINT = 'voting_round_closed';
  END IF;

  RETURN NEW;
END;
$$;

-- Runs after validate_free_vote_count (alphabetical order: "paid" > "free"),
-- though the two are mutually exclusive in practice (free has no
-- payment_intent_id, paid skips the free-vote count checks via auth.role()).
DROP TRIGGER IF EXISTS votes_validate_paid_vote_round ON votes;
CREATE TRIGGER votes_validate_paid_vote_round
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION validate_paid_vote_round();

-- =============================================================================
-- Verification (run manually after applying):
--
--   -- With NO open votable round for the competition, a paid insert from the
--   -- service role must FAIL with hint 'voting_round_closed':
--   INSERT INTO votes (competition_id, contestant_id, vote_count, amount_paid, payment_intent_id, voter_email)
--     VALUES ('<comp-with-closed-round>', '<contestant-id>', 25, 1000, 'pi_test_closed', 'verify@example.com');
--
--   -- With an open voting/finale round, the same insert must SUCCEED.
--   -- Cleanup: DELETE FROM votes WHERE payment_intent_id = 'pi_test_closed';
-- =============================================================================

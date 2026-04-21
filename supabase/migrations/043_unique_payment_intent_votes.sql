-- =============================================================================
-- Migration: Enforce one vote row per Stripe payment_intent_id
--
-- Paid-vote idempotency previously relied on a SELECT-then-INSERT check in
-- both the client (src/lib/votes.js recordPaidVote) and the webhook
-- (supabase/functions/stripe-webhook). That's a TOCTOU race: if the two
-- arrive close together, both pass the check and both insert, causing the
-- on_vote_insert trigger to fire twice and double the purchased vote count.
--
-- This index makes the race impossible — the second insert errors out with
-- SQLSTATE 23505, which both callers already handle as "already recorded".
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_payment_intent_unique
  ON votes(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

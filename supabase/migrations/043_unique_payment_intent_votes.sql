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

-- Step 1: Clean up any duplicate rows that the old race created. Without this,
-- the CREATE UNIQUE INDEX below will fail. Keep the earliest row per
-- payment_intent_id (it's the one whose trigger fired first and whose
-- activity/notification rows already reference that vote id).
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY payment_intent_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM votes
  WHERE payment_intent_id IS NOT NULL
)
DELETE FROM votes
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 2: Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_payment_intent_unique
  ON votes(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

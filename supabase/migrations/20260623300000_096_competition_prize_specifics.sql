-- =============================================================================
-- Migration 096: prize specifics
-- =============================================================================
-- Captured during onboarding (and editable on the dashboard recap):
--   * cash_prize_amount — total cash prize in whole dollars (NULL = no cash)
--   * has_sponsored_prizes — sponsored goods/services prizes (in-kind)
--
-- prize_review_required is a GENERATED flag: any cash prize over $1,999 needs a
-- review call with EliteRank before approval. Generating it keeps the threshold
-- in one place and lets admin query competitions that need a meeting.
--
-- Note: cash prizes don't implicate the lottery test as long as contestants pay
-- nothing to enter (see issue #531) — which remains the case. This is a
-- business-process + tax-reporting signal (see issue #577), not a legal gate.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS cash_prize_amount NUMERIC;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS has_sponsored_prizes BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitions_cash_prize_amount_check') THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_cash_prize_amount_check
      CHECK (cash_prize_amount IS NULL OR cash_prize_amount >= 0);
  END IF;
END $$;

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS prize_review_required BOOLEAN
  GENERATED ALWAYS AS (cash_prize_amount IS NOT NULL AND cash_prize_amount > 1999) STORED;

COMMENT ON COLUMN competitions.cash_prize_amount IS
  'Total cash prize in whole dollars (NULL = no cash prize).';
COMMENT ON COLUMN competitions.has_sponsored_prizes IS
  'Whether the competition offers sponsored prizes (goods/services / in-kind).';
COMMENT ON COLUMN competitions.prize_review_required IS
  'Generated: true when cash_prize_amount > 1999 — requires a review call with EliteRank before approval.';

-- =============================================================================
-- Migration 097: stop defaulting prize_pool_minimum to $1,000
-- =============================================================================
-- competitions.prize_pool_minimum defaulted to 1000, so self-serve drafts that
-- selected NO cash prize still advertised a phantom $1,000 prize pool on the
-- public page. The host's cash prize is now captured explicitly in
-- cash_prize_amount. The column is NOT NULL, so instead of nulling it we:
--   * change the default to 0 (new competitions start with no prize pool), and
--   * zero out the stale default on self-serve competitions with no cash prize.
--
-- The public page treats a minimum of 0 as "no prize pool". Legacy
-- admin-created competitions (no category_template) keep their value.
-- =============================================================================

ALTER TABLE competitions ALTER COLUMN prize_pool_minimum SET DEFAULT 0;

UPDATE competitions
SET prize_pool_minimum = 0
WHERE category_template IS NOT NULL
  AND cash_prize_amount IS NULL
  AND prize_pool_minimum IS DISTINCT FROM 0;

-- =============================================================================
-- Host payout share: EliteRank platform fee is 15% (hosts keep 85%)
-- =============================================================================
-- competitions.host_payout_percentage previously defaulted to 20.00 (host kept
-- 20%, platform 80%) — a display-only estimate, since no real payouts existed.
-- With Stripe Connect (migration 082) this value now drives the actual
-- application fee on each vote charge, so it must reflect the real economics:
-- EliteRank takes 15%, hosts keep 85%.
--
-- New competitions default to 85.00. Existing rows still sitting at the old
-- default (20.00) are migrated to 85.00 — those were never an intentional
-- host-specific rate, just the old platform default. Any competition with a
-- deliberately customized rate (anything other than 20.00) is left untouched.

ALTER TABLE competitions
  ALTER COLUMN host_payout_percentage SET DEFAULT 85.00;

UPDATE competitions
SET host_payout_percentage = 85.00
WHERE host_payout_percentage = 20.00;

COMMENT ON COLUMN competitions.host_payout_percentage IS
  'Host''s share of vote revenue (default 85%). EliteRank''s platform fee is the remainder (15%), taken as the Stripe application_fee on each destination charge. See migration 082 / create-payment-intent.';

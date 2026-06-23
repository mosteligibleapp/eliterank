-- =============================================================================
-- Migration 082: Competition platform fee for direct-charge payments (§5.4, §2)
-- =============================================================================
-- Adds the per-competition platform fee that EliteRank takes as a Stripe
-- `application_fee_amount` on each direct-charge paid-vote transaction (§2.1).
-- The host's connected account is the merchant of record and keeps the
-- remainder (100 - platform_fee_pct); EliteRank never pools the funds
-- (Invariant 1).
--
-- Default 15% (host keeps 85%). The compliance doc references a per-category
-- lever (§6.14); this column makes it configurable per competition. It is NOT
-- a cut of any prize pool (§1.4) — it is purely the platform's processing fee
-- on vote revenue.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS platform_fee_pct DECIMAL(5,2) NOT NULL DEFAULT 15.00
    CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 100);

COMMENT ON COLUMN competitions.platform_fee_pct IS
  'EliteRank application fee (%) taken on each direct-charge paid-vote transaction (§2, §6.14). Host connected account keeps the remainder. Not a cut of any prize pool (§1.4).';

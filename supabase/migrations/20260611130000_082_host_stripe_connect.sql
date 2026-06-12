-- =============================================================================
-- Host Stripe Connect (Express) — payout accounts
-- =============================================================================
-- EliteRank becomes the platform Stripe account. Each host connects their own
-- Stripe Express account so their share of vote revenue is paid out directly
-- to them, while EliteRank keeps its cut as an application fee.
--
-- The connected account is attached to the HOST PROFILE (competitions.host_id):
-- a host onboards their own payout account once, and every competition they
-- host routes its host-share transfer there. "Most Eligible" is decoupled the
-- same way every other host is — its host profile onboards Most Eligible's
-- Stripe account under the EliteRank platform.
--
-- These flags are the cached projection of the connected account's state.
-- They are kept in sync by:
--   * stripe-connect-onboard (on the 'status' action), and
--   * the stripe-connect-webhook handling `account.updated`.
-- create-payment-intent only routes a host-share transfer when
-- stripe_charges_enabled is true, so a half-onboarded host never blocks votes
-- (the charge simply stays on the platform account until they finish).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at      TIMESTAMPTZ;

-- One Stripe connected account maps to exactly one profile.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
  ON profiles(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN profiles.stripe_account_id IS
  'Stripe Connect (Express) connected account id (acct_…) for this host''s payouts. NULL until they begin onboarding.';
COMMENT ON COLUMN profiles.stripe_charges_enabled IS
  'Cached account.charges_enabled. create-payment-intent only routes the host-share transfer when TRUE.';
COMMENT ON COLUMN profiles.stripe_payouts_enabled IS
  'Cached account.payouts_enabled — whether Stripe will pay this host out to their bank.';
COMMENT ON COLUMN profiles.stripe_details_submitted IS
  'Cached account.details_submitted — whether the host finished the Express onboarding form.';

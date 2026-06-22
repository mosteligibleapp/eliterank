-- =============================================================================
-- Migration 081: Stripe Connect Express onboarding (Phase 0, §5.1)
-- =============================================================================
-- Adds the data the platform needs to onboard a HOST ORGANIZATION (the Sponsor
-- of record, §1.1) onto Stripe Connect Express so it can later receive funds as
-- the merchant of record via direct charges (§2.1, §5.4).
--
-- This migration is the ONBOARDING foundation only. It does NOT change the vote
-- payment flow — `create-payment-intent` still charges the platform account.
-- The direct-charge retrofit (Invariant 1) is a separate, later step that
-- depends on these fields existing and an org being `kyc_status = 'verified'`.
--
-- INVARIANT 15 (§13.4): EliteRank NEVER stores raw identity identifiers. SSNs,
-- EINs, government-ID images and identity documents live ONLY in Stripe KYC.
-- This schema deliberately stores `kyc_status` + non-sensitive Connect metadata
-- and NOTHING else. Do not add a raw SSN/EIN column here — that would make
-- EliteRank an Illinois PIPA SSN-custodian.
-- =============================================================================

-- The person allowed to manage Connect onboarding for the organization.
-- Authorization for the connect-onboard edge function checks this (or, for
-- legacy orgs where it is still NULL, falls back to "is a host of a competition
-- under this org" and claims ownership on first connect).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Stripe Connect Express account id (acct_...). Stripe is the custodian of the
-- underlying tax ID + identity documents — we only keep the account handle.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Read back from Stripe; never self-attested. Drives whether the org may host /
-- be charged on as merchant of record.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'failed'));

-- Capability flags mirrored from the Stripe account (account.updated webhook +
-- sync_status). `charges_enabled` gates direct charges; `payouts_enabled` gates
-- Stripe disbursing held funds to the host's bank.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Whether the host has finished the Stripe hosted-onboarding form (details
-- submitted) even if Stripe is still verifying.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

-- First time the org reached `kyc_status = 'verified'`.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS connect_onboarded_at TIMESTAMPTZ;

-- One Stripe account per org. Partial unique index so the many legacy orgs with
-- NULL account ids don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_stripe_connect_account_id
  ON organizations (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations (owner_id);

COMMENT ON COLUMN organizations.stripe_connect_account_id IS
  'Stripe Connect Express account (acct_...). Stripe is sole custodian of the raw tax ID / identity docs (Invariant 15, §13.4).';
COMMENT ON COLUMN organizations.kyc_status IS
  'KYC state read back from Stripe (never self-attested): not_started | pending | verified | failed (§1.1).';

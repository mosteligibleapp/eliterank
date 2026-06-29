-- =============================================================================
-- Migration 105: managed (company-run) organizations + super-admin as manager
-- =============================================================================
-- Some competitions are run by the platform company itself (e.g. Most Eligible).
-- For these, the legal Host Agreement is signed off-platform and payouts settle
-- to the company's own Stripe account (hosts are paid out off-platform), so the
-- on-platform Host-Agreement and Stripe-Connect/KYC gates don't apply.
--
-- Two changes:
--   1. organizations.is_managed — marks a "house"/company-run org. Competitions
--      under a managed org bypass the agreement-signed and Stripe-KYC launch
--      gates (submit_for_approval / publish_to_public). Backfilled true for the
--      Most Eligible org(s).
--   2. _is_competition_manager — super admins are now treated as a manager of
--      every competition, so they can submit-for-approval, publish, and use the
--      host-management RPCs from either the super-admin dashboard or a host
--      dashboard, with full editing capabilities.
-- =============================================================================

-- 1. Managed-org flag ---------------------------------------------------------
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_managed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.is_managed IS
  'True for company-run ("house") orgs whose Host Agreement is signed off-platform and whose payouts settle to the company Stripe account. Competitions under a managed org skip the on-platform agreement + Stripe-KYC launch gates.';

-- Most Eligible and EliteRank competitions are run by the company itself.
-- (Runs before the protect-is_managed trigger, which is added in migration 106.)
UPDATE organizations SET is_managed = true
  WHERE name ILIKE '%most eligible%' OR name ILIKE '%elite%rank%';

-- 2. Super admins are managers of every competition ---------------------------
CREATE OR REPLACE FUNCTION _is_competition_manager(p_competition_id UUID, p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- Super admins (EliteRank staff) manage every competition.
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = p_uid AND p.is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM competitions c
      LEFT JOIN organizations o ON o.id = c.organization_id
      WHERE c.id = p_competition_id AND (
        c.host_id = p_uid OR o.owner_id = p_uid
        OR EXISTS (SELECT 1 FROM competition_co_hosts ch WHERE ch.competition_id = c.id AND ch.user_id = p_uid)
      )
    );
$$;

-- 3. Managed orgs satisfy the agreement gate (signed off-platform) ------------
CREATE OR REPLACE FUNCTION _competition_agreement_signed(p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = p_competition_id
      AND (o.is_managed OR o.master_agreement_version IS NOT NULL)
  );
$$;

-- 4. Managed orgs satisfy the publish launch gates (payouts off-platform) -----
CREATE OR REPLACE FUNCTION _competition_launch_gates_met(p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = p_competition_id
      AND (
        o.is_managed
        OR (o.master_agreement_version IS NOT NULL
            AND o.kyc_status = 'verified'
            AND o.charges_enabled = true)
      )
  );
$$;

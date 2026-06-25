-- =============================================================================
-- Migration 083: Promoter / Master (Host) Agreement acceptance
-- =============================================================================
-- The host onboarding flow requires the Sponsor-of-record ORGANIZATION to accept
-- the Promoter / Master Agreement BEFORE connecting Stripe, and a competition
-- cannot be published until its org has both (a) accepted the current agreement
-- and (b) completed Stripe Connect KYC.
--
-- This stores acceptance as an immutable, versioned, hashed, timestamped audit
-- trail (one row per acceptance event) plus a denormalized "current acceptance"
-- snapshot on the organization for cheap gating reads.
--
-- The agreement TEXT lives in the app (src/lib/hostAgreement.js); we persist the
-- version + a SHA-256 hash of the exact text the org accepted, so we can always
-- prove which wording was agreed to even after the text is revised.
-- =============================================================================

-- Immutable audit trail: every acceptance event.
CREATE TABLE IF NOT EXISTS organization_agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL DEFAULT 'promoter_master'
    CHECK (agreement_type IN ('promoter_master')),
  agreement_version TEXT NOT NULL,
  agreement_hash TEXT NOT NULL,            -- SHA-256 hex of the exact accepted text
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_org_agreement_acceptances_org
  ON organization_agreement_acceptances (organization_id, agreement_type, accepted_at DESC);

COMMENT ON TABLE organization_agreement_acceptances IS
  'Immutable, versioned, hashed, timestamped log of Promoter/Master Agreement acceptances per organization.';

-- Denormalized current-acceptance snapshot on the org for fast publish/onboard gating.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS master_agreement_version TEXT;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS master_agreement_accepted_at TIMESTAMPTZ;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS master_agreement_accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN organizations.master_agreement_version IS
  'Version of the Promoter/Master Agreement currently accepted by this org (matches src/lib/hostAgreement.js).';

-- RLS: org owner / host / co-host can read their org's acceptance history.
ALTER TABLE organization_agreement_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org managers can read agreement acceptances"
  ON organization_agreement_acceptances;
CREATE POLICY "org managers can read agreement acceptances"
  ON organization_agreement_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_agreement_acceptances.organization_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.organization_id = organization_agreement_acceptances.organization_id
        AND c.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts ch
      JOIN competitions c ON c.id = ch.competition_id
      WHERE c.organization_id = organization_agreement_acceptances.organization_id
        AND ch.user_id = auth.uid()
    )
  );

-- =============================================================================
-- accept_master_agreement(): record acceptance for an org the caller manages.
-- SECURITY DEFINER so it can write the audit row + org snapshot atomically after
-- authorizing the caller as owner / host / co-host of the org (mirrors the
-- connect-onboard authorization model).
-- =============================================================================
CREATE OR REPLACE FUNCTION accept_master_agreement(
  p_organization_id UUID,
  p_version TEXT,
  p_hash TEXT,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_authorized BOOLEAN;
  v_org organizations;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_version IS NULL OR length(trim(p_version)) = 0
     OR p_hash IS NULL OR length(trim(p_hash)) = 0 THEN
    RAISE EXCEPTION 'version and hash are required';
  END IF;

  SELECT (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_organization_id AND o.owner_id = v_uid)
    OR EXISTS (SELECT 1 FROM competitions c WHERE c.organization_id = p_organization_id AND c.host_id = v_uid)
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts ch
      JOIN competitions c ON c.id = ch.competition_id
      WHERE c.organization_id = p_organization_id AND ch.user_id = v_uid
    )
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to accept the agreement for this organization';
  END IF;

  INSERT INTO organization_agreement_acceptances (
    organization_id, agreement_type, agreement_version, agreement_hash,
    accepted_by, ip_address, user_agent
  ) VALUES (
    p_organization_id, 'promoter_master', p_version, p_hash,
    v_uid, p_ip, p_user_agent
  );

  UPDATE organizations
  SET master_agreement_version = p_version,
      master_agreement_accepted_at = now(),
      master_agreement_accepted_by = v_uid
  WHERE id = p_organization_id
  RETURNING * INTO v_org;

  RETURN v_org;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_master_agreement(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

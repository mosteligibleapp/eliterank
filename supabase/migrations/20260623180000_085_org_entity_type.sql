-- =============================================================================
-- Migration 085: organization entity type
-- =============================================================================
-- The host-create flow asks whether the Sponsor of record is an individual or an
-- organization, and for organizations which kind (company / non-profit / agency).
-- Store that on the org and let create_host_organization set it.
-- =============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS org_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_org_type_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_org_type_check
      CHECK (org_type IS NULL OR org_type IN ('individual', 'company', 'non_profit', 'agency'));
  END IF;
END $$;

COMMENT ON COLUMN organizations.org_type IS
  'Sponsor-of-record entity type: individual | company | non_profit | agency.';

-- Recreate create_host_organization to accept the entity type.
DROP FUNCTION IF EXISTS create_host_organization(TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_host_organization(
  p_name TEXT,
  p_slug TEXT,
  p_type TEXT DEFAULT 'organization'
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org organizations;
  v_type TEXT := NULLIF(p_type, '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0
     OR p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'name and slug are required';
  END IF;
  IF v_type IS NOT NULL AND v_type NOT IN ('individual', 'company', 'non_profit', 'agency') THEN
    v_type := NULL;  -- ignore unknown values rather than fail
  END IF;

  INSERT INTO organizations (name, slug, owner_id, org_type)
  VALUES (trim(p_name), p_slug, v_uid, v_type)
  RETURNING * INTO v_org;

  UPDATE profiles SET is_host = true WHERE id = v_uid;

  RETURN v_org;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'An organization with that name already exists. Try a different name.';
END;
$$;

GRANT EXECUTE ON FUNCTION create_host_organization(TEXT, TEXT, TEXT) TO authenticated;

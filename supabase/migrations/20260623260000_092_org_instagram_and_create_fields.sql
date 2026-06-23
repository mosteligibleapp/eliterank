-- =============================================================================
-- Migration 092: org instagram + logo/website/instagram on create
-- =============================================================================
-- New orgs collect name · type · logo (per the flow) plus website and Instagram.
-- Adds organizations.instagram and extends create_host_organization to set
-- logo_url / website_url / instagram at creation.
-- =============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS instagram TEXT;

DROP FUNCTION IF EXISTS create_host_organization(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_host_organization(
  p_name TEXT,
  p_slug TEXT,
  p_type TEXT DEFAULT 'organization',
  p_logo_url TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_instagram TEXT DEFAULT NULL
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
    v_type := NULL;
  END IF;

  INSERT INTO organizations (name, slug, owner_id, org_type, logo_url, website_url, instagram)
  VALUES (
    trim(p_name), p_slug, v_uid, v_type,
    NULLIF(trim(coalesce(p_logo_url, '')), ''),
    NULLIF(trim(coalesce(p_website_url, '')), ''),
    NULLIF(trim(coalesce(p_instagram, '')), '')
  )
  RETURNING * INTO v_org;

  UPDATE profiles SET is_host = true WHERE id = v_uid;

  RETURN v_org;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'An organization with that name already exists. Try a different name.';
END;
$$;

GRANT EXECUTE ON FUNCTION create_host_organization(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

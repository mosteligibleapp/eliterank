-- =============================================================================
-- Migration 086: category template + host leads (configure wizard support)
-- =============================================================================
-- Supports the self-serve create wizard:
--   * competitions.category_template — the host-facing Page-1 template (Pageant,
--     Talent, Dating, ... or a free-text "Other"). category_id still maps to the
--     fixed lookup when one fits; the template captures intent even when it
--     doesn't.
--   * host_leads — the "Learn more → info packet / schedule a call" lead capture
--     for hosts who aren't ready to self-serve yet.
--   * create_host_competition relaxed to "draft, editable until launch": only org
--     + slug are required; everything else is optional and enforced at publish
--     (admin-approved). Adds category_template passthrough.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS category_template TEXT;

COMMENT ON COLUMN competitions.category_template IS
  'Host-facing category template chosen in the create wizard (may be a free-text "Other" value); category_id maps to the fixed lookup when one fits.';

-- ── host_leads ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS host_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lead_type TEXT NOT NULL DEFAULT 'info_packet'
    CHECK (lead_type IN ('info_packet', 'schedule_call')),
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE host_leads ENABLE ROW LEVEL SECURITY;

-- A user can see the leads they submitted; super admins see all.
DROP POLICY IF EXISTS "host_leads_select_own" ON host_leads;
CREATE POLICY "host_leads_select_own" ON host_leads
  FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

-- submit_host_lead: capture a host lead (works for any authenticated user).
CREATE OR REPLACE FUNCTION submit_host_lead(
  p_lead_type TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS host_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row host_leads;
BEGIN
  IF p_lead_type NOT IN ('info_packet', 'schedule_call') THEN
    RAISE EXCEPTION 'invalid lead type';
  END IF;
  INSERT INTO host_leads (user_id, lead_type, name, email, phone, message)
  VALUES (auth.uid(), p_lead_type, NULLIF(trim(coalesce(p_name,'')),''),
          NULLIF(trim(coalesce(p_email,'')),''), NULLIF(trim(coalesce(p_phone,'')),''),
          NULLIF(trim(coalesce(p_message,'')),''))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_host_lead(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── create_host_competition (relaxed: draft editable until launch) ───────────
CREATE OR REPLACE FUNCTION create_host_competition(p_payload JSONB)
RETURNS competitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org_id UUID := NULLIF(p_payload->>'organization_id', '')::uuid;
  v_authorized BOOLEAN;
  v_price NUMERIC;
  v_comp competitions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;
  IF NULLIF(trim(coalesce(p_payload->>'slug', '')), '') IS NULL THEN
    RAISE EXCEPTION 'slug is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = v_org_id AND o.owner_id = v_uid
  ) INTO v_authorized;
  IF NOT v_authorized THEN
    UPDATE organizations SET owner_id = v_uid WHERE id = v_org_id AND owner_id IS NULL;
    SELECT EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = v_org_id AND o.owner_id = v_uid
    ) INTO v_authorized;
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to create competitions for this organization';
  END IF;

  v_price := COALESCE(NULLIF(p_payload->>'price_per_vote', '')::numeric, 1.00);
  IF v_price < 0.25 OR v_price > 100 THEN
    RAISE EXCEPTION 'price_per_vote must be between 0.25 and 100';
  END IF;

  INSERT INTO competitions (
    organization_id, city_id, category_id, demographic_id, category_template,
    name, slug, season, description,
    status, entry_type, has_events, number_of_winners, selection_criteria,
    eligibility_radius_miles, min_contestants, max_contestants,
    host_id, price_per_vote, use_price_bundler
  ) VALUES (
    v_org_id,
    NULLIF(p_payload->>'city_id', '')::uuid,
    NULLIF(p_payload->>'category_id', '')::uuid,
    NULLIF(p_payload->>'demographic_id', '')::uuid,
    NULLIF(trim(coalesce(p_payload->>'category_template', '')), ''),
    NULLIF(trim(coalesce(p_payload->>'name', '')), ''),
    p_payload->>'slug',
    COALESCE(NULLIF(p_payload->>'season', '')::int, EXTRACT(YEAR FROM now())::int),
    NULLIF(trim(coalesce(p_payload->>'description', '')), ''),
    'draft',
    COALESCE(NULLIF(p_payload->>'entry_type', ''), 'nominations'),
    COALESCE(NULLIF(p_payload->>'has_events', '')::boolean, true),
    COALESCE(NULLIF(p_payload->>'number_of_winners', '')::int, 5),
    COALESCE(NULLIF(p_payload->>'selection_criteria', ''), 'votes'),
    COALESCE(NULLIF(p_payload->>'eligibility_radius_miles', '')::int, 100),
    COALESCE(NULLIF(p_payload->>'min_contestants', '')::int, 40),
    NULLIF(p_payload->>'max_contestants', '')::int,
    v_uid,
    v_price,
    COALESCE(NULLIF(p_payload->>'use_price_bundler', '')::boolean, false)
  ) RETURNING * INTO v_comp;

  UPDATE profiles SET is_host = true WHERE id = v_uid;

  RETURN v_comp;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A competition already exists for this organization, city, category, demographic and season.';
END;
$$;

GRANT EXECUTE ON FUNCTION create_host_competition(JSONB) TO authenticated;

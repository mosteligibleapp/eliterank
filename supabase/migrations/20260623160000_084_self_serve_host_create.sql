-- =============================================================================
-- Migration 084: Self-serve host competition creation (creator = host)
-- =============================================================================
-- Lets a host create their OWN organization and competition DRAFT without an
-- admin. The creator automatically becomes the host (no "assign host" step), and
-- these RPCs are the SAFE, locked path:
--
--   * status is FORCED to 'draft' — hosts cannot self-publish (publishing stays
--     admin-approved per product decision).
--   * host_payout_percentage is NEVER accepted from the client — it stays the
--     platform-controlled column default. (Closes the gap where permissive
--     competitions RLS would otherwise let a self-host set their own cut.)
--   * host_id is forced to the caller; org binding is authorized (caller owns
--     the org, or claims an ownerless one).
--
-- Additive only: existing competitions and the admin create/publish path are
-- untouched. A follow-up migration will tighten the raw competitions RLS so the
-- locked RPCs become the only non-admin write path.
-- =============================================================================

-- ── create_host_organization ────────────────────────────────────────────────
-- A host creates (or, for "solo" hosts, we auto-create) an organization they own.
CREATE OR REPLACE FUNCTION create_host_organization(p_name TEXT, p_slug TEXT)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_org organizations;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0
     OR p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'name and slug are required';
  END IF;

  INSERT INTO organizations (name, slug, owner_id)
  VALUES (trim(p_name), p_slug, v_uid)
  RETURNING * INTO v_org;

  UPDATE profiles SET is_host = true WHERE id = v_uid;

  RETURN v_org;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'An organization with that name already exists. Try a different name.';
END;
$$;

GRANT EXECUTE ON FUNCTION create_host_organization(TEXT, TEXT) TO authenticated;

-- ── create_host_competition ─────────────────────────────────────────────────
-- Insert a competition DRAFT with the caller as host. Platform-owned fields
-- (status, host_payout_percentage) are forced; the host controls the rest.
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
  IF NULLIF(p_payload->>'city_id', '') IS NULL
     OR NULLIF(p_payload->>'category_id', '') IS NULL
     OR NULLIF(p_payload->>'demographic_id', '') IS NULL THEN
    RAISE EXCEPTION 'city, category and demographic are required';
  END IF;

  -- Authorize: caller owns the org, or it's ownerless and they claim it.
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

  -- Host may set the vote price (per the config flow), clamped to a sane range.
  -- host_payout_percentage is deliberately NOT settable here.
  v_price := COALESCE(NULLIF(p_payload->>'price_per_vote', '')::numeric, 1.00);
  IF v_price < 0.25 OR v_price > 100 THEN
    RAISE EXCEPTION 'price_per_vote must be between 0.25 and 100';
  END IF;

  INSERT INTO competitions (
    organization_id, city_id, category_id, demographic_id,
    name, slug, season, description,
    status, entry_type, has_events, number_of_winners, selection_criteria,
    eligibility_radius_miles, min_contestants, max_contestants,
    host_id, price_per_vote, use_price_bundler
  ) VALUES (
    v_org_id,
    (p_payload->>'city_id')::uuid,
    (p_payload->>'category_id')::uuid,
    (p_payload->>'demographic_id')::uuid,
    NULLIF(trim(coalesce(p_payload->>'name', '')), ''),
    p_payload->>'slug',
    COALESCE(NULLIF(p_payload->>'season', '')::int, EXTRACT(YEAR FROM now())::int),
    NULLIF(trim(coalesce(p_payload->>'description', '')), ''),
    'draft',                                                       -- forced
    COALESCE(NULLIF(p_payload->>'entry_type', ''), 'nominations'),
    COALESCE(NULLIF(p_payload->>'has_events', '')::boolean, true),
    COALESCE(NULLIF(p_payload->>'number_of_winners', '')::int, 5),
    COALESCE(NULLIF(p_payload->>'selection_criteria', ''), 'votes'),
    COALESCE(NULLIF(p_payload->>'eligibility_radius_miles', '')::int, 100),
    COALESCE(NULLIF(p_payload->>'min_contestants', '')::int, 40),
    NULLIF(p_payload->>'max_contestants', '')::int,
    v_uid,                                                         -- creator = host
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

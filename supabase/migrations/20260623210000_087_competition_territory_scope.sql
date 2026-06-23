-- =============================================================================
-- Migration 087: competition territory scope
-- =============================================================================
-- Eligibility territory is a scope, not just a radius: city-wide (anchor city +
-- radius), state-wide (the anchor city's state), or US-wide (all US cities +
-- Toronto). create_host_competition accepts it; eligibility_radius_miles still
-- applies for the city scope.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS territory_scope TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitions_territory_scope_check') THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_territory_scope_check
      CHECK (territory_scope IS NULL OR territory_scope IN ('city', 'state', 'us'));
  END IF;
END $$;

COMMENT ON COLUMN competitions.territory_scope IS
  'Eligibility territory: city (anchor city + radius) | state (anchor city''s state) | us (all US cities + Toronto).';

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
  v_scope TEXT := NULLIF(p_payload->>'territory_scope', '');
  v_comp competitions;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization_id is required'; END IF;
  IF NULLIF(trim(coalesce(p_payload->>'slug', '')), '') IS NULL THEN RAISE EXCEPTION 'slug is required'; END IF;

  SELECT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_org_id AND o.owner_id = v_uid) INTO v_authorized;
  IF NOT v_authorized THEN
    UPDATE organizations SET owner_id = v_uid WHERE id = v_org_id AND owner_id IS NULL;
    SELECT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_org_id AND o.owner_id = v_uid) INTO v_authorized;
  END IF;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Not authorized to create competitions for this organization'; END IF;

  v_price := COALESCE(NULLIF(p_payload->>'price_per_vote', '')::numeric, 1.00);
  IF v_price < 0.25 OR v_price > 100 THEN RAISE EXCEPTION 'price_per_vote must be between 0.25 and 100'; END IF;
  IF v_scope IS NOT NULL AND v_scope NOT IN ('city', 'state', 'us') THEN v_scope := NULL; END IF;

  INSERT INTO competitions (
    organization_id, city_id, category_id, demographic_id, category_template, territory_scope,
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
    v_scope,
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
    v_uid, v_price,
    COALESCE(NULLIF(p_payload->>'use_price_bundler', '')::boolean, false)
  ) RETURNING * INTO v_comp;

  UPDATE profiles SET is_host = true WHERE id = v_uid;
  RETURN v_comp;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A competition already exists for this organization, city, category, demographic and season.';
END;
$$;

GRANT EXECUTE ON FUNCTION create_host_competition(JSONB) TO authenticated;

-- =============================================================================
-- Migration 099: move Stripe KYC from the submit gate to the publish gate
-- =============================================================================
-- KYC (SSN/EIN identity verification) only matters for payouts, which don't
-- happen until a competition is live. Requiring it before submit-for-approval
-- added the most invasive step before EliteRank had even reviewed the concept.
--
-- New gating:
--   submit_for_approval  → Host Agreement signed + core rules entered
--   publish_to_public    → Host Agreement signed + Stripe KYC verified
-- =============================================================================

CREATE OR REPLACE FUNCTION _competition_agreement_signed(p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = p_competition_id
      AND o.master_agreement_version IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION submit_for_approval(p_competition_id UUID)
RETURNS competitions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_c competitions;
BEGIN
  IF NOT _is_competition_manager(p_competition_id, v_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_c FROM competitions WHERE id = p_competition_id;
  IF v_c.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft can be submitted for approval'; END IF;
  IF NOT _competition_agreement_signed(p_competition_id) THEN
    RAISE EXCEPTION 'Sign the Host Agreement before submitting for approval';
  END IF;
  IF NULLIF(trim(coalesce(v_c.name,'')),'') IS NULL
     OR (v_c.category_id IS NULL AND NULLIF(trim(coalesce(v_c.category_template,'')),'') IS NULL)
     OR v_c.eligibility_age_min IS NULL THEN
    RAISE EXCEPTION 'Enter the competition rules (name, category, eligibility) before submitting';
  END IF;
  UPDATE competitions SET status='pending_approval', submitted_for_approval_at=now()
    WHERE id=p_competition_id RETURNING * INTO v_c;
  RETURN v_c;
END; $$;

CREATE OR REPLACE FUNCTION publish_to_public(p_competition_id UUID)
RETURNS competitions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_c competitions;
BEGIN
  IF NOT _is_competition_manager(p_competition_id, v_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_c FROM competitions WHERE id = p_competition_id;
  IF v_c.status <> 'approved' THEN RAISE EXCEPTION 'Only an approved competition can be published'; END IF;
  IF NOT _competition_launch_gates_met(p_competition_id) THEN
    RAISE EXCEPTION 'Complete Stripe identity verification (KYC) before publishing to the public';
  END IF;
  UPDATE competitions SET status='publish', published_at=now()
    WHERE id=p_competition_id RETURNING * INTO v_c;
  RETURN v_c;
END; $$;

GRANT EXECUTE ON FUNCTION submit_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_to_public(UUID) TO authenticated;

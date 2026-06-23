-- =============================================================================
-- Migration 094: competition approval lifecycle
-- =============================================================================
-- Extends the status state machine to match the host launch flow:
--   draft → pending_approval → approved → publish (entry) → live → completed
--
-- Host actions (gated, host/co-host/owner authorized):
--   submit_for_approval(draft → pending_approval) — requires the Host Agreement
--     signed, Stripe verified, and core rules entered.
--   publish_to_public(approved → publish) — host goes live after approval.
-- EliteRank action:
--   approve_competition(pending_approval → approved) — super admin only.
-- =============================================================================

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'competitions'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%' AND pg_get_constraintdef(oid) ILIKE '%draft%'
  LOOP
    EXECUTE 'ALTER TABLE competitions DROP CONSTRAINT ' || quote_ident(c.conname);
  END LOOP;
END $$;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_status_check
  CHECK (status IN ('draft','pending_approval','approved','publish','live','archive','completed','upcoming','nomination','voting','finals'));

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION _is_competition_manager(p_competition_id UUID, p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c
    LEFT JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = p_competition_id AND (
      c.host_id = p_uid OR o.owner_id = p_uid
      OR EXISTS (SELECT 1 FROM competition_co_hosts ch WHERE ch.competition_id = c.id AND ch.user_id = p_uid)
    )
  );
$$;

CREATE OR REPLACE FUNCTION _competition_launch_gates_met(p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions c JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = p_competition_id
      AND o.master_agreement_version IS NOT NULL
      AND o.kyc_status = 'verified' AND o.charges_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION submit_for_approval(p_competition_id UUID)
RETURNS competitions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_c competitions;
BEGIN
  IF NOT _is_competition_manager(p_competition_id, v_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_c FROM competitions WHERE id = p_competition_id;
  IF v_c.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft can be submitted for approval'; END IF;
  IF NOT _competition_launch_gates_met(p_competition_id) THEN
    RAISE EXCEPTION 'Sign the Host Agreement and complete Stripe verification first';
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

CREATE OR REPLACE FUNCTION approve_competition(p_competition_id UUID)
RETURNS competitions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_c competitions;
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'Only EliteRank can approve competitions'; END IF;
  UPDATE competitions SET status='approved', approved_at=now()
    WHERE id=p_competition_id AND status='pending_approval' RETURNING * INTO v_c;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Competition is not pending approval'; END IF;
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
    RAISE EXCEPTION 'Host Agreement + Stripe verification must still be in place to publish';
  END IF;
  UPDATE competitions SET status='publish', published_at=now()
    WHERE id=p_competition_id RETURNING * INTO v_c;
  RETURN v_c;
END; $$;

GRANT EXECUTE ON FUNCTION submit_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_competition(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_to_public(UUID) TO authenticated;

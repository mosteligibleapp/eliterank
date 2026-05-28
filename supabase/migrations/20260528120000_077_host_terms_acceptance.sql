-- Record per-competition host acknowledgment of the Host Obligations clause
-- (TermsPage.jsx §13 + ContestTermsPage.jsx §2).
--
-- A host (or co-host) must accept the host terms before they can publish or
-- otherwise operate a competition. The acceptance is logged on the competition
-- row so it is auditable per-competition and per-version. Re-acceptance is
-- required if the version string in the terms pages changes.

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS host_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_terms_accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS host_terms_version text;

COMMENT ON COLUMN public.competitions.host_terms_accepted_at IS
  'Timestamp at which the assigned host (or co-host) clicked through the Host Obligations acknowledgment for this competition. NULL = not yet accepted; dashboard is gated until set.';
COMMENT ON COLUMN public.competitions.host_terms_accepted_by IS
  'profiles.id of the user who accepted the host terms for this competition.';
COMMENT ON COLUMN public.competitions.host_terms_version IS
  'Version string of the host terms accepted, matched against the Last Updated date in TermsPage / ContestTermsPage. If the platform publishes a newer version, hosts must re-accept.';

-- RPC: accept the host terms for a competition. Only the assigned host or
-- a co-host (or a super-admin) may call this. The version is supplied by the
-- client so we can require re-acceptance when terms change.
CREATE OR REPLACE FUNCTION public.accept_host_terms(
  p_competition_id uuid,
  p_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_authorized boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_version IS NULL OR length(trim(p_version)) = 0 THEN
    RAISE EXCEPTION 'host terms version is required';
  END IF;

  -- Authorized if: primary host, co-host, or super admin
  SELECT
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = p_competition_id
        AND c.host_id = v_user_id
    )
    OR EXISTS (
      SELECT 1 FROM competition_co_hosts cch
      WHERE cch.competition_id = p_competition_id
        AND cch.user_id = v_user_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = v_user_id
        AND p.is_super_admin = true
    )
  INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'not authorized to accept host terms for this competition';
  END IF;

  UPDATE competitions
  SET
    host_terms_accepted_at = now(),
    host_terms_accepted_by = v_user_id,
    host_terms_version = p_version
  WHERE id = p_competition_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_host_terms(uuid, text) TO authenticated;

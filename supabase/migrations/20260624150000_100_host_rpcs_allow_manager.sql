-- =============================================================================
-- Migration 100: let the competition manager (host) manage hosts/co-hosts
-- =============================================================================
-- assign/remove host and add/remove co-host were super-admin only. In the
-- self-serve model the host should be able to set a different forward-facing
-- host and add co-hosts themselves. Relax the auth check to allow a super
-- admin OR the competition manager (host / co-host / org owner), via
-- _is_competition_manager (defined in migration 094).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_competition_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_host_id uuid;
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  IF NOT (is_super_admin() OR _is_competition_manager(p_competition_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile % not found', p_user_id USING ERRCODE = 'P0002';
  END IF;

  SELECT host_id INTO v_old_host_id FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.competitions SET host_id = p_user_id, updated_at = now() WHERE id = p_competition_id;
  UPDATE public.profiles SET is_host = true, updated_at = now() WHERE id = p_user_id;

  IF v_old_host_id IS NOT NULL AND v_old_host_id <> p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM public.competitions WHERE host_id = v_old_host_id) THEN
      UPDATE public.profiles SET is_host = false, updated_at = now() WHERE id = v_old_host_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_competition_host(
  p_competition_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_host_id uuid;
BEGIN
  IF p_competition_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id is required';
  END IF;

  IF NOT (is_super_admin() OR _is_competition_manager(p_competition_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT host_id INTO v_old_host_id FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.competitions SET host_id = null, updated_at = now() WHERE id = p_competition_id;

  IF v_old_host_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.competitions WHERE host_id = v_old_host_id) THEN
      UPDATE public.profiles SET is_host = false, updated_at = now() WHERE id = v_old_host_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_competition_co_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host_id uuid;
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  IF NOT (is_super_admin() OR _is_competition_manager(p_competition_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile % not found', p_user_id USING ERRCODE = 'P0002';
  END IF;

  SELECT host_id INTO v_host_id FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  IF v_host_id = p_user_id THEN RETURN; END IF;

  INSERT INTO public.competition_co_hosts (competition_id, user_id, created_by)
  VALUES (p_competition_id, p_user_id, auth.uid())
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  UPDATE public.profiles SET is_host = true, updated_at = now()
  WHERE id = p_user_id AND COALESCE(is_host, false) = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_competition_co_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  IF NOT (is_super_admin() OR _is_competition_manager(p_competition_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.competition_co_hosts
  WHERE competition_id = p_competition_id AND user_id = p_user_id;

  IF NOT EXISTS (SELECT 1 FROM public.competitions WHERE host_id = p_user_id)
     AND NOT EXISTS (SELECT 1 FROM public.competition_co_hosts WHERE user_id = p_user_id) THEN
    UPDATE public.profiles SET is_host = false, updated_at = now() WHERE id = p_user_id;
  END IF;
END;
$$;

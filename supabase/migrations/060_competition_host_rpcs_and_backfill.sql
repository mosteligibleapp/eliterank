-- Atomic host assignment / removal for competitions, plus backfill of
-- existing drift between competitions.host_id and profiles.is_host.

CREATE OR REPLACE FUNCTION public.assign_competition_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_host_id uuid;
  v_is_super_admin boolean;
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_super_admin, false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile % not found', p_user_id USING ERRCODE = 'P0002';
  END IF;

  SELECT host_id INTO v_old_host_id
  FROM public.competitions
  WHERE id = p_competition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.competitions
  SET host_id = p_user_id,
      updated_at = now()
  WHERE id = p_competition_id;

  UPDATE public.profiles
  SET is_host = true,
      updated_at = now()
  WHERE id = p_user_id;

  IF v_old_host_id IS NOT NULL AND v_old_host_id <> p_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.competitions
      WHERE host_id = v_old_host_id
    ) THEN
      UPDATE public.profiles
      SET is_host = false,
          updated_at = now()
      WHERE id = v_old_host_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_competition_host(
  p_competition_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_host_id uuid;
  v_is_super_admin boolean;
BEGIN
  IF p_competition_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id is required';
  END IF;

  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_super_admin, false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT host_id INTO v_old_host_id
  FROM public.competitions
  WHERE id = p_competition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.competitions
  SET host_id = null,
      updated_at = now()
  WHERE id = p_competition_id;

  IF v_old_host_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.competitions WHERE host_id = v_old_host_id
    ) THEN
      UPDATE public.profiles
      SET is_host = false,
          updated_at = now()
      WHERE id = v_old_host_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_competition_host(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_competition_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_competition_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_competition_host(uuid) TO authenticated;

-- Backfill existing drift
UPDATE public.profiles p
SET is_host = false, updated_at = now()
WHERE p.is_host = true
  AND NOT EXISTS (SELECT 1 FROM public.competitions c WHERE c.host_id = p.id);

UPDATE public.profiles p
SET is_host = true, updated_at = now()
WHERE p.is_host = false
  AND EXISTS (SELECT 1 FROM public.competitions c WHERE c.host_id = p.id);

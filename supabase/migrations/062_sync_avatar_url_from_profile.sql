-- Sync denormalized contestants/nominees/judges.avatar_url from the linked
-- profile's avatar_url. Mirrors migration 061 (which syncs `name`) but for
-- avatars.
--
-- Policy decision: profile photo always wins for linked rows. Host-uploaded
-- photos written directly to contestants.avatar_url are no longer preserved
-- when the linked user updates their profile picture — and the backfill in
-- this migration overwrites existing host-uploaded overrides with the
-- linked user's profile photo.

CREATE OR REPLACE FUNCTION public.sync_avatar_url_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A profile clearing its avatar shouldn't blank out the denormalized
  -- columns; the existing value is better than nothing for downstream UI.
  IF NEW.avatar_url IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.contestants
     SET avatar_url = NEW.avatar_url
   WHERE user_id = NEW.id
     AND avatar_url IS DISTINCT FROM NEW.avatar_url;

  UPDATE public.nominees
     SET avatar_url = NEW.avatar_url
   WHERE user_id = NEW.id
     AND avatar_url IS DISTINCT FROM NEW.avatar_url;

  UPDATE public.judges
     SET avatar_url = NEW.avatar_url
   WHERE user_id = NEW.id
     AND avatar_url IS DISTINCT FROM NEW.avatar_url;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_avatar_url_from_profile_trigger ON public.profiles;

CREATE TRIGGER sync_avatar_url_from_profile_trigger
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  EXECUTE FUNCTION public.sync_avatar_url_from_profile();

-- One-shot backfill: per the "profile photo always wins" policy, write the
-- profile avatar onto every linked row where they differ. For Aryam and the
-- 5 other contestants with host-uploaded overrides, this swaps to the live
-- profile photo. For the 84 contestants with NULL avatar_url it just
-- materializes the value the UI already falls back to.
UPDATE public.contestants c
   SET avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE c.user_id = p.id
   AND p.avatar_url IS NOT NULL
   AND c.avatar_url IS DISTINCT FROM p.avatar_url;

UPDATE public.nominees n
   SET avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE n.user_id = p.id
   AND p.avatar_url IS NOT NULL
   AND n.avatar_url IS DISTINCT FROM p.avatar_url;

UPDATE public.judges j
   SET avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE j.user_id = p.id
   AND p.avatar_url IS NOT NULL
   AND j.avatar_url IS DISTINCT FROM p.avatar_url;

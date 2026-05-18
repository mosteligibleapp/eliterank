-- Keep denormalized `name` columns in sync with the linked profile.
--
-- contestants, nominees, and judges each store a denormalized `name`
-- column captured at entry time. Without this trigger the column goes
-- stale whenever the linked user edits first_name/last_name on profiles,
-- which surfaces as the wrong name on every view that reads the table
-- directly (edge functions, exports, raw SQL, plus any UI surface that
-- forgets to re-resolve from the joined profile).
--
-- Trigger only propagates when the resolved name is non-empty. Rows
-- without a user_id (e.g. nominees who have not claimed an account yet)
-- are left alone — for those rows the denormalized column is still the
-- canonical source.

CREATE OR REPLACE FUNCTION public.sync_display_name_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_name text;
BEGIN
  resolved_name := NULLIF(
    TRIM(BOTH ' ' FROM COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')),
    ''
  );

  -- Skip propagation when the profile has no usable name. The existing
  -- denormalized value is better than blanking out NOT NULL columns.
  IF resolved_name IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.contestants
     SET name = resolved_name
   WHERE user_id = NEW.id
     AND name IS DISTINCT FROM resolved_name;

  UPDATE public.nominees
     SET name = resolved_name
   WHERE user_id = NEW.id
     AND name IS DISTINCT FROM resolved_name;

  UPDATE public.judges
     SET name = resolved_name
   WHERE user_id = NEW.id
     AND name IS DISTINCT FROM resolved_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_display_name_from_profile_trigger ON public.profiles;

CREATE TRIGGER sync_display_name_from_profile_trigger
  AFTER UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.first_name IS DISTINCT FROM NEW.first_name
    OR OLD.last_name IS DISTINCT FROM NEW.last_name
  )
  EXECUTE FUNCTION public.sync_display_name_from_profile();

-- One-shot backfill: heal currently stale rows using the same rule the
-- trigger applies going forward.
WITH resolved AS (
  SELECT
    p.id AS user_id,
    NULLIF(
      TRIM(BOTH ' ' FROM COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
      ''
    ) AS name
  FROM public.profiles p
)
UPDATE public.contestants c
   SET name = r.name
  FROM resolved r
 WHERE c.user_id = r.user_id
   AND r.name IS NOT NULL
   AND c.name IS DISTINCT FROM r.name;

WITH resolved AS (
  SELECT
    p.id AS user_id,
    NULLIF(
      TRIM(BOTH ' ' FROM COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
      ''
    ) AS name
  FROM public.profiles p
)
UPDATE public.nominees n
   SET name = r.name
  FROM resolved r
 WHERE n.user_id = r.user_id
   AND r.name IS NOT NULL
   AND n.name IS DISTINCT FROM r.name;

WITH resolved AS (
  SELECT
    p.id AS user_id,
    NULLIF(
      TRIM(BOTH ' ' FROM COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
      ''
    ) AS name
  FROM public.profiles p
)
UPDATE public.judges j
   SET name = r.name
  FROM resolved r
 WHERE j.user_id = r.user_id
   AND r.name IS NOT NULL
   AND j.name IS DISTINCT FROM r.name;

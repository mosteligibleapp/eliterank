-- Add a `hidden` flag to judges so previewing as a judge (or testing the
-- scoring UI) doesn't surface that judge on the public competition page.
--
-- The flag is consumed by `get_competition_judges`, which is the only RPC the
-- public competition page uses to render the "Meet the Judges" section.
-- Host-side dashboards still see every judge (hidden or not) because they
-- query the `judges` table directly with their own RLS policies.

ALTER TABLE public.judges
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_competition_judges(p_competition_id uuid)
 RETURNS TABLE(id uuid, competition_id uuid, user_id uuid, name text, title text, bio text, avatar_url text, instagram text, sort_order integer, created_at timestamp with time zone, profile jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    j.id,
    j.competition_id,
    j.user_id,
    j.name,
    j.title,
    j.bio,
    j.avatar_url,
    j.instagram,
    j.sort_order,
    j.created_at,
    CASE
      WHEN j.user_id IS NULL THEN NULL
      ELSE (
        SELECT jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_url', p.avatar_url,
          'bio', p.bio,
          'occupation', p.occupation,
          'city', p.city,
          'instagram', p.instagram,
          'twitter', p.twitter,
          'linkedin', p.linkedin,
          'interests', p.interests,
          'gallery', p.gallery
        )
        FROM profiles p
        WHERE p.id = j.user_id
      )
    END AS profile
  FROM judges j
  WHERE j.competition_id = p_competition_id
    AND j.hidden = false
  ORDER BY j.sort_order NULLS LAST, j.created_at;
$function$;

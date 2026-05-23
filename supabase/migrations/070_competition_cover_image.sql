-- =============================================================================
-- Migration 066: Competition cover image
--
-- Adds a `cover_image` column to the competitions table so hosts can attach a
-- branded cover photo. This is what gets composited into share previews
-- (iMessage / Instagram DMs / etc.) and used as the hero on the public
-- competition card.
--
-- Also provisions the `competition-images` storage bucket and backfills the
-- Most Eligible Bachelorettes Chicago row from the URL that was previously
-- hardcoded in src/utils/cityImages.js.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Storage bucket for cover photos (idempotent — bucket may already exist in prod
-- via Supabase dashboard, but staging/dev needs it provisioned).
INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-images', 'competition-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read, authenticated write (any signed-in user; admin app already
-- restricts who can hit the upload UI).
DO $$ BEGIN
  CREATE POLICY "Public competition image read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'competition-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload competition images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'competition-images' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update competition images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'competition-images' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill the one competition whose cover lived in cityImages.js. Points at a
-- resized version of the original (the source upload at 9504×6336 exceeded
-- Supabase image transform's 25MP limit, so we ship a 2400px-wide variant in
-- the repo at /public/covers/). Hosts can replace it from the admin UI later.
-- Matches by name + Chicago city association so we don't accidentally stamp
-- it on a different city's "Most Eligible Bachelorettes" if one ever exists.
UPDATE competitions c
SET cover_image = 'https://eliterank.co/covers/chicago-women-2026.jpg'
WHERE c.cover_image IS NULL
  AND LOWER(c.name) LIKE '%most eligible bachelorettes%'
  AND (
    LOWER(COALESCE(c.city, '')) = 'chicago'
    OR EXISTS (
      SELECT 1 FROM cities ci
      WHERE ci.id = c.city_id AND LOWER(ci.name) = 'chicago'
    )
  );

-- =============================================================================
-- Migration 070: Competition cover image
--
-- Adds a `cover_image` column to the competitions table so hosts can attach a
-- branded cover photo. This is what gets composited into share previews
-- (iMessage / Instagram DMs / etc.) and used as the hero on the public
-- competition card.
--
-- Also provisions the `competition-images` storage bucket. Writes are
-- restricted to super admins (the admin app is the only writer today).
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Storage bucket for cover photos (idempotent — bucket may already exist in prod
-- via Supabase dashboard, but staging/dev needs it provisioned).
INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-images', 'competition-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for the bucket (covers are shown on the public competition card
-- and embedded in share previews).
DO $$ BEGIN
  CREATE POLICY "Public competition image read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'competition-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Writes are restricted to super admins — only the admin app uploads covers
-- today, so any other authenticated path is unintended.
DO $$ BEGIN
  CREATE POLICY "Super admins can upload competition images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'competition-images' AND is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Super admins can update competition images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'competition-images' AND is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Super admins can delete competition images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'competition-images' AND is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entry Flow Schema Updates
-- Adds avatar_url and relationship columns to nominees table
-- Creates Supabase Storage bucket for nomination photos

-- Add avatar_url to nominees for photo uploads
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add relationship column for third-party nominations
-- Values: 'friend', 'coworker', 'family', 'other'
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS relationship TEXT;

-- Add age column to nominees (stored as integer, displayed on profile)
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS age INTEGER;

-- Create storage bucket for nomination/avatar photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow anyone to upload avatars (nominations don't require auth)
CREATE POLICY "Anyone can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

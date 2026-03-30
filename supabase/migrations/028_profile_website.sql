-- Add website field to profiles for custom link
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- ============================================================================
-- Migration: Profiles as Source of Truth
--
-- This migration refactors the data model so that profiles table is the
-- single source of truth for all user identity data. Contestants, judges,
-- and hosts all reference profiles rather than duplicating data.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to profiles table
-- ============================================================================

-- Add age column to profiles (was only on contestants)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add occupation column to profiles (was only on contestants)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Add linkedin column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- Add tiktok column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- ============================================================================
-- STEP 2: Create stub profiles for contestants without user accounts
-- ============================================================================

-- Insert profiles for contestants who don't have a linked user_id
-- These "stub" profiles can be claimed later when the person signs up
INSERT INTO profiles (id, email, first_name, last_name, bio, city, avatar_url, instagram, twitter, linkedin, interests, age, occupation, created_at, updated_at)
SELECT
    gen_random_uuid() as id,
    c.email,
    SPLIT_PART(c.name, ' ', 1) as first_name,
    CASE
        WHEN POSITION(' ' IN c.name) > 0
        THEN SUBSTRING(c.name FROM POSITION(' ' IN c.name) + 1)
        ELSE ''
    END as last_name,
    c.bio,
    c.city,
    c.avatar_url,
    c.instagram,
    c.twitter,
    c.linkedin,
    c.interests,
    c.age,
    c.occupation,
    c.created_at,
    NOW() as updated_at
FROM contestants c
WHERE c.user_id IS NULL
ON CONFLICT (email) DO NOTHING;

-- Update contestants to link to the newly created profiles
UPDATE contestants c
SET user_id = p.id
FROM profiles p
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL
  AND c.email = p.email;

-- For contestants without email, create profiles with a generated placeholder email
INSERT INTO profiles (id, first_name, last_name, bio, city, avatar_url, instagram, twitter, linkedin, interests, age, occupation, created_at, updated_at)
SELECT
    gen_random_uuid() as id,
    SPLIT_PART(c.name, ' ', 1) as first_name,
    CASE
        WHEN POSITION(' ' IN c.name) > 0
        THEN SUBSTRING(c.name FROM POSITION(' ' IN c.name) + 1)
        ELSE ''
    END as last_name,
    c.bio,
    c.city,
    c.avatar_url,
    c.instagram,
    c.twitter,
    c.linkedin,
    c.interests,
    c.age,
    c.occupation,
    c.created_at,
    NOW() as updated_at
FROM contestants c
WHERE c.user_id IS NULL
  AND (c.email IS NULL OR c.email = '');

-- Link remaining orphan contestants by matching on name (best effort)
-- This creates the link after the profiles were inserted
WITH new_profiles AS (
    SELECT p.id as profile_id, c.id as contestant_id
    FROM contestants c
    JOIN profiles p ON (
        SPLIT_PART(c.name, ' ', 1) = p.first_name
        AND (
            CASE
                WHEN POSITION(' ' IN c.name) > 0
                THEN SUBSTRING(c.name FROM POSITION(' ' IN c.name) + 1)
                ELSE ''
            END
        ) = COALESCE(p.last_name, '')
        AND c.created_at::date = p.created_at::date
    )
    WHERE c.user_id IS NULL
)
UPDATE contestants c
SET user_id = np.profile_id
FROM new_profiles np
WHERE c.id = np.contestant_id;

-- ============================================================================
-- STEP 3: Create stub profiles for judges without user accounts
-- ============================================================================

-- Insert profiles for judges who don't have a linked user_id
INSERT INTO profiles (id, email, first_name, last_name, bio, avatar_url, instagram, twitter, linkedin, occupation, created_at, updated_at)
SELECT
    gen_random_uuid() as id,
    j.email,
    SPLIT_PART(j.name, ' ', 1) as first_name,
    CASE
        WHEN POSITION(' ' IN j.name) > 0
        THEN SUBSTRING(j.name FROM POSITION(' ' IN j.name) + 1)
        ELSE ''
    END as last_name,
    j.bio,
    j.avatar_url,
    j.instagram,
    j.twitter,
    j.linkedin,
    j.title as occupation,
    j.created_at,
    NOW() as updated_at
FROM judges j
WHERE j.user_id IS NULL
  AND j.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Update judges to link to the newly created profiles
UPDATE judges j
SET user_id = p.id
FROM profiles p
WHERE j.user_id IS NULL
  AND j.email IS NOT NULL
  AND j.email = p.email;

-- For judges without email, create profiles
INSERT INTO profiles (id, first_name, last_name, bio, avatar_url, instagram, twitter, linkedin, occupation, created_at, updated_at)
SELECT
    gen_random_uuid() as id,
    SPLIT_PART(j.name, ' ', 1) as first_name,
    CASE
        WHEN POSITION(' ' IN j.name) > 0
        THEN SUBSTRING(j.name FROM POSITION(' ' IN j.name) + 1)
        ELSE ''
    END as last_name,
    j.bio,
    j.avatar_url,
    j.instagram,
    j.twitter,
    j.linkedin,
    j.title as occupation,
    j.created_at,
    NOW() as updated_at
FROM judges j
WHERE j.user_id IS NULL
  AND (j.email IS NULL OR j.email = '');

-- Link remaining orphan judges by matching on name
WITH new_judge_profiles AS (
    SELECT p.id as profile_id, j.id as judge_id
    FROM judges j
    JOIN profiles p ON (
        SPLIT_PART(j.name, ' ', 1) = p.first_name
        AND (
            CASE
                WHEN POSITION(' ' IN j.name) > 0
                THEN SUBSTRING(j.name FROM POSITION(' ' IN j.name) + 1)
                ELSE ''
            END
        ) = COALESCE(p.last_name, '')
        AND j.created_at::date = p.created_at::date
    )
    WHERE j.user_id IS NULL
)
UPDATE judges j
SET user_id = njp.profile_id
FROM new_judge_profiles njp
WHERE j.id = njp.judge_id;

-- ============================================================================
-- STEP 4: Add user_id column to judges if it doesn't exist
-- ============================================================================
ALTER TABLE judges ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: Create views for backward compatibility (optional)
-- These views present contestants/judges with their profile data merged
-- ============================================================================

-- View for contestants with full profile data
CREATE OR REPLACE VIEW contestants_with_profiles AS
SELECT
    c.id,
    c.competition_id,
    c.user_id,
    c.status,
    c.votes,
    c.rank,
    c.trend,
    c.created_at,
    c.updated_at,
    -- Profile data (prefer contestant data for backwards compatibility, fall back to profile)
    COALESCE(c.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
    COALESCE(c.age, p.age) as age,
    COALESCE(c.occupation, p.occupation) as occupation,
    COALESCE(c.bio, p.bio) as bio,
    COALESCE(c.avatar_url, p.avatar_url) as avatar_url,
    COALESCE(c.instagram, p.instagram) as instagram,
    COALESCE(c.twitter, p.twitter) as twitter,
    COALESCE(c.linkedin, p.linkedin) as linkedin,
    COALESCE(c.city, p.city) as city,
    COALESCE(c.interests, p.interests) as interests,
    p.gallery,
    p.cover_image,
    p.tiktok,
    p.email
FROM contestants c
LEFT JOIN profiles p ON c.user_id = p.id;

-- View for judges with full profile data
CREATE OR REPLACE VIEW judges_with_profiles AS
SELECT
    j.id,
    j.competition_id,
    j.user_id,
    j.title,
    j.sort_order,
    j.created_at,
    j.updated_at,
    -- Profile data
    COALESCE(j.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
    COALESCE(j.bio, p.bio) as bio,
    COALESCE(j.avatar_url, p.avatar_url) as avatar_url,
    COALESCE(j.instagram, p.instagram) as instagram,
    COALESCE(j.twitter, p.twitter) as twitter,
    COALESCE(j.linkedin, p.linkedin) as linkedin,
    p.city,
    p.interests,
    p.gallery,
    p.cover_image,
    p.occupation,
    p.email
FROM judges j
LEFT JOIN profiles p ON j.user_id = p.id;

-- ============================================================================
-- STEP 6: Add helpful indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contestants_user_id ON contestants(user_id);
CREATE INDEX IF NOT EXISTS idx_judges_user_id ON judges(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================================
-- Note: We're keeping the redundant columns in contestants/judges for now
-- to ensure backward compatibility. A future migration can remove them
-- once all code is updated to use the profile joins exclusively.
-- ============================================================================

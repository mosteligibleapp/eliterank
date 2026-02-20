-- ============================================================================
-- Migration: Profiles as Source of Truth
--
-- Architecture:
-- - profiles = Person's identity + lifetime aggregate stats (competition-agnostic)
-- - contestants = Their role + performance in a SPECIFIC competition
-- - judges = Their role in a SPECIFIC competition
--
-- This migration links existing contestants/judges to their profiles by email.
-- No stub/placeholder profiles are created - only real profiles.
-- ============================================================================

-- ============================================================================
-- STEP 1: Link contestants to existing profiles by email match
-- ============================================================================
UPDATE contestants c
SET user_id = p.id
FROM profiles p
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL
  AND c.email != ''
  AND LOWER(TRIM(c.email)) = LOWER(TRIM(p.email));

-- ============================================================================
-- STEP 2: Add indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contestants_user_id ON contestants(user_id);
CREATE INDEX IF NOT EXISTS idx_judges_user_id ON judges(user_id);

-- ============================================================================
-- STEP 3: Create helper views for querying with profile data merged
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
    c.eliminated_in_round,
    c.advancement_status,
    c.current_round,
    -- Identity: prefer contestant data, fall back to profile
    COALESCE(c.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
    COALESCE(c.age, p.age) as age,
    p.occupation,
    COALESCE(c.bio, p.bio) as bio,
    COALESCE(c.avatar_url, p.avatar_url) as avatar_url,
    COALESCE(c.instagram, p.instagram) as instagram,
    p.twitter,
    p.linkedin,
    COALESCE(c.city, p.city) as city,
    p.interests,
    p.gallery,
    p.cover_image,
    p.tiktok,
    COALESCE(c.email, p.email) as email,
    COALESCE(c.phone, p.phone) as phone,
    -- Lifetime stats from profile
    p.total_votes_received,
    p.total_competitions,
    p.wins,
    p.best_placement
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
    -- Identity: prefer judge data, fall back to profile
    COALESCE(j.name, CONCAT(p.first_name, ' ', p.last_name)) as name,
    COALESCE(j.bio, p.bio) as bio,
    COALESCE(j.avatar_url, p.avatar_url) as avatar_url,
    p.instagram,
    p.twitter,
    p.linkedin,
    p.city,
    p.interests,
    p.gallery,
    p.cover_image,
    p.occupation,
    p.email
FROM judges j
LEFT JOIN profiles p ON j.user_id = p.id;

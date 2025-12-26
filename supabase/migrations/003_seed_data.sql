-- Seed Data for EliteRank
-- Run this after 002_rls_policies.sql

-- ============================================
-- SEED ORGANIZATIONS
-- ============================================
INSERT INTO organizations (id, name, slug, logo, tagline, description, cover_image) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Most Eligible',
  'most-eligible',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=100&h=100&fit=crop',
  'Find Your City''s Most Eligible Singles',
  'The premier competition platform showcasing the most eligible singles in major cities across the country. Our mission is to celebrate accomplished, inspiring individuals while creating meaningful connections.',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop'
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Elite Professionals',
  'elite-professionals',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
  'Celebrating Excellence in Professional Achievement',
  'Recognizing outstanding professionals who are making a difference in their industries and communities.',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=400&fit=crop'
);

-- ============================================
-- NOTE: Competitions require a valid host_id (user profile)
-- These will be created when users sign up and create competitions
-- ============================================

-- Example of how to add a competition once a host exists:
-- INSERT INTO competitions (host_id, organization_id, city, season, status, phase)
-- VALUES (
--   'user-uuid-here',
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'New York',
--   2026,
--   'voting',
--   'voting'
-- );

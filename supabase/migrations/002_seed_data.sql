-- =============================================================================
-- EliteRank Seed Data
-- Run this after 001_consolidated_schema.sql
-- =============================================================================

-- =============================================================================
-- CATEGORIES (Competition types)
-- =============================================================================
INSERT INTO categories (name, slug, active) VALUES
  ('Dating', 'dating', TRUE),
  ('Business', 'business', TRUE),
  ('Talent', 'talent', TRUE),
  ('Fitness', 'fitness', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- DEMOGRAPHICS (Audience segmentation)
-- =============================================================================
INSERT INTO demographics (label, slug, gender, age_min, age_max, active) VALUES
  ('Open (All)', 'open', NULL, NULL, NULL, TRUE),
  ('Women 21-39', 'women-21-39', 'female', 21, 39, TRUE),
  ('Women 40+', 'women-40-plus', 'female', 40, NULL, TRUE),
  ('Men 21-39', 'men-21-39', 'male', 21, 39, TRUE),
  ('Men 40+', 'men-40-plus', 'male', 40, NULL, TRUE),
  ('LGBTQ+ 21-39', 'lgbtq-plus-21-39', 'LGBTQ+', 21, 39, TRUE),
  ('LGBTQ+ 40+', 'lgbtq-plus-40-plus', 'LGBTQ+', 40, NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
INSERT INTO organizations (
  name, 
  slug, 
  description,
  default_about_tagline,
  default_about_description,
  default_about_traits,
  default_age_range,
  default_requirement,
  default_theme_primary,
  default_theme_voting,
  default_theme_resurrection
) VALUES (
  'Most Eligible',
  'most-eligible',
  'The premier singles competition celebrating dynamic, successful, and eligible singles across America.',
  'The premier singles competition',
  'A celebration of the city''s most dynamic, successful, and eligible singles. Where ambition meets charm, and community crowns its champions.',
  ARRAY['Ambitious professionals', 'Community leaders', 'Social innovators', 'Culture shapers'],
  '21-45',
  'Single & city-based',
  '#d4af37',
  '#f472b6',
  '#8b5cf6'
) ON CONFLICT (slug) DO UPDATE SET
  default_about_tagline = EXCLUDED.default_about_tagline,
  default_about_description = EXCLUDED.default_about_description,
  default_about_traits = EXCLUDED.default_about_traits;

-- =============================================================================
-- SAMPLE CITIES (Major US cities)
-- =============================================================================
INSERT INTO cities (name, state, slug) VALUES
  ('Chicago', 'IL', 'chicago-il'),
  ('New York', 'NY', 'new-york-ny'),
  ('Los Angeles', 'CA', 'los-angeles-ca'),
  ('Miami', 'FL', 'miami-fl'),
  ('Austin', 'TX', 'austin-tx'),
  ('Denver', 'CO', 'denver-co'),
  ('Nashville', 'TN', 'nashville-tn'),
  ('Atlanta', 'GA', 'atlanta-ga'),
  ('Seattle', 'WA', 'seattle-wa'),
  ('Boston', 'MA', 'boston-ma'),
  ('San Francisco', 'CA', 'san-francisco-ca'),
  ('Dallas', 'TX', 'dallas-tx'),
  ('Phoenix', 'AZ', 'phoenix-az'),
  ('Philadelphia', 'PA', 'philadelphia-pa'),
  ('San Diego', 'CA', 'san-diego-ca'),
  ('Charlotte', 'NC', 'charlotte-nc'),
  ('Portland', 'OR', 'portland-or'),
  ('Minneapolis', 'MN', 'minneapolis-mn'),
  ('Las Vegas', 'NV', 'las-vegas-nv'),
  ('Detroit', 'MI', 'detroit-mi')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- APP SETTINGS
-- =============================================================================
INSERT INTO app_settings (key, value) VALUES
  ('hall_of_winners', '{
    "year": 2025,
    "totalAwarded": "$75K+",
    "winners": []
  }'::jsonb),
  ('site_config', '{
    "maintenanceMode": false,
    "registrationOpen": true,
    "votingEnabled": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================
-- To set up a super admin, run:
-- SELECT set_super_admin('your-email@example.com');
--
-- To create a competition, use the admin UI or insert directly:
-- INSERT INTO competitions (...) VALUES (...);
-- =============================================================================

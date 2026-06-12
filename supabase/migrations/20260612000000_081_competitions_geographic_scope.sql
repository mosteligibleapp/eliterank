-- =============================================================================
-- COMPETITIONS: GEOGRAPHIC SCOPE (city / state / national / worldwide) + SEED AUSTIN
-- =============================================================================
-- A competition is normally tied to a single city (city_id). This adds a scope
-- selector so a competition can instead be statewide, nationwide (USA), or
-- global. Depending on scope:
--   city       -> city_id set, state_code null
--   state      -> state_code set (2-letter code), city_id null
--   national   -> city_id and state_code null
--   worldwide  -> city_id and state_code null
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS geographic_scope TEXT NOT NULL DEFAULT 'city'
  CHECK (geographic_scope IN ('city', 'state', 'national', 'worldwide'));

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS state_code TEXT;

-- Add Austin, TX as a selectable city.
INSERT INTO cities (name, state, slug) VALUES
  ('Austin', 'TX', 'austin-tx')
ON CONFLICT DO NOTHING;

-- Add 18+ demographics for Women and Men.
INSERT INTO demographics (label, slug, gender, age_min, age_max, active) VALUES
  ('Women 18+', 'women-18-plus', 'female', 18, NULL, TRUE),
  ('Men 18+', 'men-18-plus', 'male', 18, NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Add Pets and Pageant categories.
INSERT INTO categories (name, slug, active) VALUES
  ('Pets', 'pets', TRUE),
  ('Pageant', 'pageant', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- COMPETITIONS: GEOGRAPHIC SCOPE (city vs USA vs Worldwide) + SEED AUSTIN
-- =============================================================================
-- A competition is normally tied to a single city (city_id). This adds the
-- ability to run nationwide ("usa") or global ("worldwide") competitions that
-- are not bound to one city. For those, city_id is left NULL and the scope is
-- recorded here instead.
-- =============================================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS geographic_scope TEXT NOT NULL DEFAULT 'city'
  CHECK (geographic_scope IN ('city', 'usa', 'worldwide'));

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

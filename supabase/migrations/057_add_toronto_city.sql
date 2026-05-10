-- =============================================================================
-- ADD TORONTO, CANADA TO CITIES
-- =============================================================================
INSERT INTO cities (name, state, slug) VALUES
  ('Toronto', 'ON', 'toronto-on')
ON CONFLICT DO NOTHING;

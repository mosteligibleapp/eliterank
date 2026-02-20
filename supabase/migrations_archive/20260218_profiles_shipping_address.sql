-- ============================================================================
-- SHIPPING ADDRESS ON PROFILES
-- Stores a default shipping address on the user's profile so they
-- don't have to re-enter it for every reward claim.
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shipping_address JSONB;

COMMENT ON COLUMN profiles.shipping_address IS 'Default shipping address JSON: {street, apt, city, state, zip}';

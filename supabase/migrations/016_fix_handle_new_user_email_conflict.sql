-- =============================================================================
-- MIGRATION 016: Fix handle_new_user to handle email conflicts
-- =============================================================================
-- Migration 015 added ON CONFLICT (id) but profiles.email also has a UNIQUE
-- constraint. When an auth user is created for an email that already has a
-- profile row (from a previous ghost user or orphaned record), the INSERT
-- crashes on the email uniqueness violation — rolling back the entire
-- auth.users INSERT and leaving no auth user at all.
--
-- Fix: delete the conflicting profile row first (it's orphaned since we're
-- creating a brand-new auth user with a different UUID), then insert.
-- Also handle the ON CONFLICT (id) case for retries.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any orphaned profile row that has the same email but a different id.
  -- This happens when a previous createUser partially failed, leaving a profile
  -- without a matching auth.users row.
  DELETE FROM profiles
  WHERE email = NEW.email
    AND id != NEW.id;

  INSERT INTO profiles (id, email, first_name, last_name, onboarded_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    CASE
      WHEN NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password != ''
        THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    onboarded_at = COALESCE(profiles.onboarded_at, EXCLUDED.onboarded_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

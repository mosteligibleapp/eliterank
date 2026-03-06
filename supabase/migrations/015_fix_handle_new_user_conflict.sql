-- =============================================================================
-- MIGRATION 015: Fix handle_new_user trigger to handle duplicate profiles
-- =============================================================================
-- When admin.createUser() is called for a user whose profile already exists
-- (e.g. pre-created by send-nomination-invite, then the edge function retries),
-- the INSERT INTO profiles fails with a unique constraint violation, which
-- causes auth.users INSERT to fail too ("Database error creating new user").
--
-- Fix: use ON CONFLICT (id) DO UPDATE to merge instead of crash.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

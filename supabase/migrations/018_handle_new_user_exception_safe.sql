-- =============================================================================
-- MIGRATION 018: Make handle_new_user trigger exception-safe
-- =============================================================================
-- The trigger is still causing "Database error creating new user" / "Database
-- error saving new user" errors in production. Both admin.createUser() and
-- signInWithOtp() roll back when the trigger raises any exception — preventing
-- the auth user from being created at all.
--
-- Fix: wrap the profile upsert in an EXCEPTION block so that trigger failures
-- never prevent user creation. A missing profile is recoverable; a missing
-- auth user is not (it blocks login entirely).
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any orphaned profile row that has the same email but a different id.
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
EXCEPTION WHEN OTHERS THEN
  -- Log the error but never block user creation.
  -- A missing profile row is recoverable; a missing auth.users row is not.
  RAISE WARNING 'handle_new_user failed for user % (%): % [SQLSTATE=%]',
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

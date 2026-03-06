-- =============================================================================
-- MIGRATION 019: Bulletproof handle_new_user trigger
-- =============================================================================
-- DEPLOY THIS TO PRODUCTION via Supabase SQL Editor.
--
-- The handle_new_user trigger is crashing and rolling back auth.users INSERTs,
-- causing "Database error creating new user" on every signUp / createUser call.
-- This version wraps everything in EXCEPTION WHEN OTHERS so the trigger NEVER
-- blocks user creation. A missing profile is fixable; a missing auth user is not.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Remove any orphaned profile with the same email but different user id.
  --    This prevents UNIQUE(email) violations in step 2.
  DELETE FROM profiles
  WHERE email = NEW.email
    AND id != NEW.id;

  -- 2. Upsert the profile row.
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
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name  = COALESCE(EXCLUDED.last_name, profiles.last_name),
    onboarded_at = COALESCE(profiles.onboarded_at, EXCLUDED.onboarded_at);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- NEVER block user creation. Log the error for debugging, but return NEW
  -- so the auth.users INSERT commits successfully.
  RAISE WARNING 'handle_new_user failed for user % (%): % [SQLSTATE=%]',
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

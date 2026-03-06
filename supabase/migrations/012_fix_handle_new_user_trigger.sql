-- =============================================================================
-- MIGRATION: Fix handle_new_user trigger for nominee claim flow
-- Date: 2026-02-27
-- Description: Fixes the trigger that fails when a profile already exists
--              (e.g., third-party nominees claiming their nomination)
-- =============================================================================

-- The old trigger does a bare INSERT which fails on conflict.
-- This updated version uses ON CONFLICT to gracefully handle existing profiles.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Update email if it changed (e.g., user verified a different email)
    email = COALESCE(EXCLUDED.email, profiles.email),
    -- Only update names if they were provided and profile doesn't have them
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also handle email conflicts (different user ID, same email)
-- This can happen if a profile was created via a different path
-- We'll create a separate handler for this edge case

CREATE OR REPLACE FUNCTION handle_new_user_safe()
RETURNS TRIGGER AS $$
DECLARE
  existing_profile_id UUID;
BEGIN
  -- Check if profile already exists with this email
  SELECT id INTO existing_profile_id 
  FROM profiles 
  WHERE email = NEW.email 
  LIMIT 1;
  
  IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
    -- Profile exists with different ID - this is an edge case
    -- (user might have been pre-created via admin or another flow)
    -- Log warning but don't fail - the user can be linked later
    RAISE WARNING 'Profile with email % already exists with different ID. Auth user: %, Profile: %', 
                  NEW.email, NEW.id, existing_profile_id;
    -- Still create a profile for this auth user (with null email temporarily)
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NULL,  -- Will need manual reconciliation
      COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name'),
      NEW.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- Normal case: either no existing profile, or ID matches
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name'),
      NEW.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
      last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the trigger to use the safe version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_safe();

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== HANDLE_NEW_USER FIX APPLIED ===';
  RAISE NOTICE 'The trigger now handles:';
  RAISE NOTICE '  - Profiles that already exist (ON CONFLICT DO UPDATE)';
  RAISE NOTICE '  - Email conflicts with different user IDs (warns but proceeds)';
  RAISE NOTICE '  - full_name metadata fallback for first_name';
END $$;

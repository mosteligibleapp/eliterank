-- =============================================================================
-- MIGRATION 021: Enhance handle_new_user to populate full profile from metadata
-- =============================================================================
-- DEPLOY THIS TO PRODUCTION via Supabase SQL Editor.
--
-- Self-nominated users pass avatar_url, bio, city, age, instagram, and phone
-- through auth metadata.  The previous trigger only read first_name/last_name,
-- leaving the profile nearly empty when the client-side UPDATE was blocked by
-- RLS (e.g. email confirmation enabled and no session yet).
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Remove any orphaned profile with the same email but different user id.
  --    This prevents UNIQUE(email) violations in step 2.
  DELETE FROM profiles
  WHERE email = NEW.email
    AND id != NEW.id;

  -- 2. Upsert the profile row with all available metadata.
  INSERT INTO profiles (
    id, email, first_name, last_name,
    avatar_url, bio, city, age, instagram, phone,
    onboarded_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'city',
    (NEW.raw_user_meta_data->>'age')::int,
    NEW.raw_user_meta_data->>'instagram',
    NEW.raw_user_meta_data->>'phone',
    CASE
      WHEN NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password != ''
        THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    first_name   = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name    = COALESCE(EXCLUDED.last_name, profiles.last_name),
    avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    bio          = COALESCE(EXCLUDED.bio, profiles.bio),
    city         = COALESCE(EXCLUDED.city, profiles.city),
    age          = COALESCE(EXCLUDED.age, profiles.age),
    instagram    = COALESCE(EXCLUDED.instagram, profiles.instagram),
    phone        = COALESCE(EXCLUDED.phone, profiles.phone),
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

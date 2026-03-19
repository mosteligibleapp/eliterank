-- =============================================================================
-- MIGRATION 023: Sync nominee data to profile in handle_new_user trigger
-- =============================================================================
-- When a self-nominee creates an account, the client-side profile update
-- (avatar_url, bio, city, age, instagram, phone) fails due to RLS when
-- there's no session (email confirmation enabled). The trigger already
-- links the nominee record — now it also copies the nominee's card data
-- to the profile so the profile isn't empty after signup.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nominee_id UUID;
BEGIN
  -- 1. Remove any orphaned profile with the same email but different user id.
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

  -- 3. Link nominee record if nominee_id was passed in user metadata.
  v_nominee_id := (NEW.raw_user_meta_data->>'nominee_id')::uuid;

  IF v_nominee_id IS NOT NULL THEN
    UPDATE nominees
    SET user_id = NEW.id,
        claimed_at = COALESCE(claimed_at, NOW())
    WHERE id = v_nominee_id
      AND user_id IS NULL;

    -- 4. Copy nominee card data to profile (avatar, bio, location, etc.)
    --    Only update fields that are non-null on the nominee and null/empty
    --    on the profile, so we don't overwrite any existing profile data.
    UPDATE profiles p
    SET
      avatar_url = COALESCE(p.avatar_url, n.avatar_url),
      bio        = COALESCE(p.bio, n.bio),
      city       = COALESCE(p.city, n.city),
      age        = COALESCE(p.age, n.age),
      instagram  = COALESCE(p.instagram, n.instagram),
      phone      = COALESCE(p.phone, n.phone),
      updated_at = NOW()
    FROM nominees n
    WHERE p.id = NEW.id
      AND n.id = v_nominee_id;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user % (%): % [SQLSTATE=%]',
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

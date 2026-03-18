-- =============================================================================
-- MIGRATION 022: Link nominee record in handle_new_user trigger
-- =============================================================================
-- When a self-nominee creates an account, the client-side update to set
-- user_id on the nominee record can be blocked by RLS (no session when
-- email confirmation is enabled). The trigger runs as SECURITY DEFINER
-- so it can always write. We use the nominee_id from user metadata.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
  --    This ensures the nominee gets linked even when the client-side
  --    update is blocked by RLS (e.g. email confirmation with no session).
  IF NEW.raw_user_meta_data->>'nominee_id' IS NOT NULL THEN
    UPDATE nominees
    SET user_id = NEW.id,
        claimed_at = COALESCE(claimed_at, NOW())
    WHERE id = (NEW.raw_user_meta_data->>'nominee_id')::uuid
      AND user_id IS NULL;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user % (%): % [SQLSTATE=%]',
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION 040: Backfill orphan profiles + isolate handle_new_user steps
-- =============================================================================
-- Some auth.users rows exist without a matching profiles row. The
-- handle_new_user trigger (migration 023) wraps its entire body in
-- EXCEPTION WHEN OTHERS, so a failure in the nominee link or metadata
-- copy silently aborted the profile insert while the auth.users row
-- still committed.
--
-- This migration:
--   1. Backfills a profile row for every existing orphan auth.users row
--      using whatever metadata we have, skipping any rows whose email
--      is already held by a different profile (rare data-corruption
--      case — left for manual resolution rather than destructive auto-
--      cleanup in a migration).
--   2. Splits handle_new_user into two isolated blocks so the profile
--      insert (Step A) cannot be taken down by a failure in the nominee
--      sync (Step B). Step A also has a last-resort bare-minimum insert
--      so a profile row is always created, even if the full insert hits
--      an unexpected error.
--
-- Idempotent: re-running is a no-op. The backfill uses LEFT JOIN +
-- ON CONFLICT (id) DO NOTHING, and the trigger replacement is CREATE
-- OR REPLACE.
-- =============================================================================

-- 1. Backfill missing profiles for existing orphan auth.users rows.
DO $$
DECLARE
  v_inserted INT;
  v_email_conflict INT;
BEGIN
  WITH ins AS (
    INSERT INTO profiles (id, email, first_name, last_name, onboarded_at)
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data->>'first_name',
      u.raw_user_meta_data->>'last_name',
      CASE
        WHEN u.encrypted_password IS NOT NULL AND u.encrypted_password != ''
          THEN u.created_at
        ELSE NULL
      END
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.email IS NOT NULL
      -- Skip rows whose email is already held by a different profile.
      -- Those are a separate data-integrity issue and should be fixed
      -- by hand, not by a destructive delete in a migration.
      AND NOT EXISTS (
        SELECT 1 FROM profiles p2 WHERE p2.email = u.email
      )
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;

  SELECT COUNT(*) INTO v_email_conflict
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND u.email IS NOT NULL
    AND EXISTS (SELECT 1 FROM profiles p2 WHERE p2.email = u.email);

  RAISE NOTICE 'Migration 040: backfilled % orphan profile(s); skipped % row(s) due to email collision.',
    v_inserted, v_email_conflict;
END $$;

-- 2. Rewrite handle_new_user so the profile insert is isolated from the
--    nominee sync. Both blocks swallow errors so auth.users creation is
--    never blocked, but a failure in Step B cannot roll back Step A.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nominee_id UUID;
BEGIN
  -- Step A: Profile insert. Must leave a row behind for every auth user.
  BEGIN
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
      email        = EXCLUDED.email,
      first_name   = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name    = COALESCE(EXCLUDED.last_name, profiles.last_name),
      onboarded_at = COALESCE(profiles.onboarded_at, EXCLUDED.onboarded_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile upsert failed for % (%): % [SQLSTATE=%]',
      NEW.id, NEW.email, SQLERRM, SQLSTATE;

    -- Last-resort bare-minimum insert so the orphan case disappears even
    -- when the full upsert above hits an unexpected error.
    BEGIN
      INSERT INTO profiles (id, email)
      VALUES (NEW.id, NEW.email)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user minimal profile insert failed for % (%): % [SQLSTATE=%]',
        NEW.id, NEW.email, SQLERRM, SQLSTATE;
    END;
  END;

  -- Step B: Optional nominee linking + data sync. Isolated so a failure
  -- here cannot roll back the profile from Step A.
  BEGIN
    v_nominee_id := (NEW.raw_user_meta_data->>'nominee_id')::uuid;

    IF v_nominee_id IS NOT NULL THEN
      UPDATE nominees
      SET user_id    = NEW.id,
          claimed_at = COALESCE(claimed_at, NOW())
      WHERE id = v_nominee_id
        AND user_id IS NULL;

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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user nominee sync failed for % (%): % [SQLSTATE=%]',
      NEW.id, NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

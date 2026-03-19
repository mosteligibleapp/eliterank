-- =============================================================================
-- MIGRATION 024: Rename profiles → users, add roles enum array
-- =============================================================================
-- Consolidates user identity into a single `users` table with:
--   • id FK to auth.users(id) (already existed)
--   • roles user_role[] array replacing boolean is_super_admin
--   • Updated handle_new_user trigger for the new table name
--   • Updated RLS policies
-- =============================================================================

-- 1. Create the user_role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'fan',
    'nominee',
    'contestant',
    'winner',
    'host',
    'admin',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Rename profiles → users
ALTER TABLE IF EXISTS profiles RENAME TO users;

-- 3. Add roles column with default {fan}
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT '{fan}';

-- 4. Migrate existing role data
--    • is_super_admin = true → add 'super_admin' to roles
UPDATE users SET roles = '{super_admin,fan}' WHERE is_super_admin = true;

--    • Users who are contestants in any competition → add 'contestant'
UPDATE users SET roles = array_append(roles, 'contestant')
WHERE id IN (SELECT DISTINCT user_id FROM contestants WHERE user_id IS NOT NULL)
  AND NOT ('contestant' = ANY(roles));

--    • Users who are nominees → add 'nominee'
UPDATE users SET roles = array_append(roles, 'nominee')
WHERE id IN (SELECT DISTINCT user_id FROM nominees WHERE user_id IS NOT NULL)
  AND NOT ('nominee' = ANY(roles));

--    • Users who are winners → add 'winner'
UPDATE users SET roles = array_append(roles, 'winner')
WHERE id IN (SELECT DISTINCT user_id FROM contestants WHERE user_id IS NOT NULL AND status = 'winner')
  AND NOT ('winner' = ANY(roles));

--    • Users who host competitions → add 'host'
UPDATE users SET roles = array_append(roles, 'host')
WHERE id IN (SELECT DISTINCT host_id FROM competitions WHERE host_id IS NOT NULL)
  AND NOT ('host' = ANY(roles));

-- 5. Drop the old is_super_admin column (roles is now source of truth)
ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;

-- 6. Rename indexes and triggers that reference 'profiles'
ALTER INDEX IF EXISTS idx_profiles_username RENAME TO idx_users_username;

-- Drop and recreate the updated_at trigger with new name
DROP TRIGGER IF EXISTS update_profiles_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Update RLS policies (drop old, create new on users table)
DROP POLICY IF EXISTS "profiles_select" ON users;
DROP POLICY IF EXISTS "profiles_update" ON users;
DROP POLICY IF EXISTS "profiles_insert" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update" ON users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- 8. Create index on roles for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

-- 9. Update handle_new_user trigger to use users table and set roles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_nominee_id UUID;
  v_roles user_role[];
BEGIN
  -- Default role
  v_roles := '{fan}';

  -- 1. Remove any orphaned user row with the same email but different user id.
  DELETE FROM users
  WHERE email = NEW.email
    AND id != NEW.id;

  -- 2. Upsert the user row.
  INSERT INTO users (id, email, first_name, last_name, roles, onboarded_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_roles,
    CASE
      WHEN NEW.encrypted_password IS NOT NULL AND NEW.encrypted_password != ''
        THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name  = COALESCE(EXCLUDED.last_name, users.last_name),
    onboarded_at = COALESCE(users.onboarded_at, EXCLUDED.onboarded_at);

  -- 3. Link nominee record if nominee_id was passed in user metadata.
  v_nominee_id := (NEW.raw_user_meta_data->>'nominee_id')::uuid;

  IF v_nominee_id IS NOT NULL THEN
    UPDATE nominees
    SET user_id = NEW.id,
        claimed_at = COALESCE(claimed_at, NOW())
    WHERE id = v_nominee_id
      AND user_id IS NULL;

    -- Add 'nominee' role if not already present
    UPDATE users
    SET roles = CASE
      WHEN NOT ('nominee' = ANY(roles)) THEN array_append(roles, 'nominee')
      ELSE roles
    END
    WHERE id = NEW.id;

    -- 4. Copy nominee card data to user (avatar, bio, location, etc.)
    UPDATE users u
    SET
      avatar_url = COALESCE(u.avatar_url, n.avatar_url),
      bio        = COALESCE(u.bio, n.bio),
      city       = COALESCE(u.city, n.city),
      age        = COALESCE(u.age, n.age),
      instagram  = COALESCE(u.instagram, n.instagram),
      phone      = COALESCE(u.phone, n.phone),
      updated_at = NOW()
    FROM nominees n
    WHERE u.id = NEW.id
      AND n.id = v_nominee_id;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user % (%): % [SQLSTATE=%]',
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create a backward-compatible view so any straggler queries still work
--     (can be dropped in a future migration once all code is updated)
CREATE OR REPLACE VIEW profiles AS
  SELECT
    *,
    'super_admin' = ANY(roles) AS is_super_admin
  FROM users;

-- Make the view updatable so existing INSERT/UPDATE/DELETE queries work
CREATE OR REPLACE RULE profiles_insert AS ON INSERT TO profiles
  DO INSTEAD
  INSERT INTO users (id, email, username, first_name, last_name, bio, city, phone,
    avatar_url, cover_image, instagram, twitter, linkedin, tiktok, age, occupation,
    interests, gallery, total_votes_received, total_competitions, wins, best_placement,
    shipping_address, roles, onboarded_at, bonus_actions, created_at, updated_at)
  VALUES (
    NEW.id, NEW.email, NEW.username, NEW.first_name, NEW.last_name, NEW.bio, NEW.city,
    NEW.phone, NEW.avatar_url, NEW.cover_image, NEW.instagram, NEW.twitter, NEW.linkedin,
    NEW.tiktok, NEW.age, NEW.occupation, NEW.interests, NEW.gallery,
    NEW.total_votes_received, NEW.total_competitions, NEW.wins, NEW.best_placement,
    NEW.shipping_address,
    CASE WHEN NEW.is_super_admin THEN '{super_admin,fan}'::user_role[] ELSE '{fan}'::user_role[] END,
    NEW.onboarded_at, NEW.bonus_actions, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  );

CREATE OR REPLACE RULE profiles_update AS ON UPDATE TO profiles
  DO INSTEAD
  UPDATE users SET
    email = NEW.email,
    username = NEW.username,
    first_name = NEW.first_name,
    last_name = NEW.last_name,
    bio = NEW.bio,
    city = NEW.city,
    phone = NEW.phone,
    avatar_url = NEW.avatar_url,
    cover_image = NEW.cover_image,
    instagram = NEW.instagram,
    twitter = NEW.twitter,
    linkedin = NEW.linkedin,
    tiktok = NEW.tiktok,
    age = NEW.age,
    occupation = NEW.occupation,
    interests = NEW.interests,
    gallery = NEW.gallery,
    total_votes_received = NEW.total_votes_received,
    total_competitions = NEW.total_competitions,
    wins = NEW.wins,
    best_placement = NEW.best_placement,
    shipping_address = NEW.shipping_address,
    onboarded_at = NEW.onboarded_at,
    bonus_actions = NEW.bonus_actions,
    updated_at = NOW()
  WHERE users.id = OLD.id;

CREATE OR REPLACE RULE profiles_delete AS ON DELETE TO profiles
  DO INSTEAD
  DELETE FROM users WHERE users.id = OLD.id;

-- =============================================================================
-- MIGRATION 013: Add onboarded_at to profiles
-- =============================================================================
-- Profiles pre-created via admin.createUser() (e.g. nominee invites) should NOT
-- count as real users until the person actually sets a password and completes
-- the claim flow.  The new `onboarded_at` column is NULL for ghost/pre-created
-- profiles and set to a timestamp once the user finishes account setup.
-- =============================================================================

-- 1. Add the column (nullable, no default — new rows start NULL)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- 2. Backfill: treat every existing profile as onboarded.  The pre-create
--    feature is new, so all current profiles belong to real sign-ups.
UPDATE profiles SET onboarded_at = created_at WHERE onboarded_at IS NULL;

-- 3. Update the auto-create trigger.  When a user is created with a password
--    (normal signUp), set onboarded_at immediately.  When created WITHOUT a
--    password (admin.createUser for invites), leave it NULL.
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate db_stats to only count onboarded users
DROP VIEW IF EXISTS db_stats;
CREATE VIEW db_stats
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE onboarded_at IS NOT NULL) AS total_users,
  (SELECT COUNT(*) FROM competitions WHERE status = 'live') AS live_competitions,
  (SELECT COUNT(*) FROM contestants WHERE status = 'active') AS active_contestants,
  (SELECT COUNT(*) FROM nominees WHERE status = 'pending') AS pending_nominees,
  (SELECT COUNT(*) FROM votes) AS total_votes,
  (SELECT COUNT(*) FROM votes WHERE created_at >= CURRENT_DATE) AS votes_today,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) AS database_size;

-- =============================================================================
-- 052: Allow super admins to update any profile
-- Required so the super-admin dashboard can toggle is_host on/off for any user.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;

CREATE POLICY "profiles_update_super_admin" ON profiles
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

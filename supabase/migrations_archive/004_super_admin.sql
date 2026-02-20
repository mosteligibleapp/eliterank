-- Super Admin Setup for EliteRank
-- Run this after 003_seed_data.sql

-- ============================================
-- FUNCTION TO SET SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION set_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET is_super_admin = true WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION TO REMOVE SUPER ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION remove_super_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET is_super_admin = false WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW FOR SUPER ADMIN DASHBOARD
-- ============================================
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM competitions) as total_competitions,
  (SELECT COUNT(*) FROM contestants) as total_contestants,
  (SELECT COUNT(*) FROM votes) as total_votes,
  (SELECT COALESCE(SUM(total_revenue), 0) FROM competitions) as total_revenue,
  (SELECT COUNT(*) FROM organizations) as total_organizations;

-- ============================================
-- SUPER ADMIN POLICIES FOR FULL ACCESS
-- ============================================
-- Super admins can view all nominees
CREATE POLICY "Super admins can view all nominees"
  ON nominees FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all nominees
CREATE POLICY "Super admins can manage all nominees"
  ON nominees FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can view all votes
CREATE POLICY "Super admins can view all votes"
  ON votes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all contestants
CREATE POLICY "Super admins can manage all contestants"
  ON contestants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all judges
CREATE POLICY "Super admins can manage all judges"
  ON judges FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all sponsors
CREATE POLICY "Super admins can manage all sponsors"
  ON sponsors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all events
CREATE POLICY "Super admins can manage all events"
  ON events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Super admins can manage all announcements
CREATE POLICY "Super admins can manage all announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================
-- USAGE:
-- To make a user a super admin, run:
-- SELECT set_super_admin('user@email.com');
--
-- To remove super admin, run:
-- SELECT remove_super_admin('user@email.com');
-- ============================================

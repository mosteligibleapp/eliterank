-- Allow hosts to update their own organization's branding fields
-- Previously only super admins could update organizations (via organizations_all policy)

CREATE POLICY "hosts_update_own_org" ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.organization_id = organizations.id
        AND c.host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.organization_id = organizations.id
        AND c.host_id = (SELECT auth.uid())
    )
  );

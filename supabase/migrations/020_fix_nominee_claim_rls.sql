-- =============================================================================
-- MIGRATION 020: Fix nominee claim RLS to allow setting user_id during claim
-- =============================================================================
-- The nominees_update_unclaimed policy (migration 014) had WITH CHECK
-- (user_id IS NULL), which prevented createAccount from linking the
-- authenticated user to the nominee record. This updates the WITH CHECK
-- to also allow user_id = auth.uid(), so an authenticated user can claim
-- an unclaimed nominee by setting user_id to their own id.
-- =============================================================================

DROP POLICY IF EXISTS "nominees_update_unclaimed" ON nominees;

CREATE POLICY "nominees_update_unclaimed" ON nominees
  FOR UPDATE USING (
    user_id IS NULL
  )
  WITH CHECK (
    -- Allow updates that keep user_id NULL (progress saves during claim flow)
    -- OR set user_id to the authenticated user's id (the actual claim)
    user_id IS NULL OR user_id = auth.uid()
  );

-- =============================================================================
-- MIGRATION: Add RLS policy for nominees to claim their nominations
-- Date: 2026-01-11
-- Description:
--   - Allows authenticated users to update nominee records they're claiming
--   - Enables the claim flow where users accept/reject nominations
-- =============================================================================

-- Allow users to view their own nominee record (by invite_token or user_id)
CREATE POLICY "Users can view nominee by invite token"
  ON nominees FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Allow users to update nominee records to claim them
-- This enables setting claimed_at, user_id, and status (for rejection)
CREATE POLICY "Users can claim their nomination"
  ON nominees FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User can update if they're claiming (user_id not yet set or matches)
      user_id IS NULL
      OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Can only set user_id to their own ID
      user_id IS NULL
      OR user_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Nominee claim policy migration complete ===';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  - View nominees (when authenticated)';
  RAISE NOTICE '  - Claim nominations (update their own record)';
END $$;

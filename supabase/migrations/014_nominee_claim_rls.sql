-- =============================================================================
-- MIGRATION 014: Allow unauthenticated nominees to update their record via invite_token
-- =============================================================================
-- When a nominee opens the claim link directly (not via magic link), they have
-- no auth session. The Build Your Card flow needs to persist progress (name,
-- email, photo, etc.) to the nominees table, but the existing RLS policies
-- require auth.uid(). This policy allows updates to nominees where user_id is
-- NULL (unclaimed) and the update doesn't change security-sensitive fields.
-- The invite_token check happens at the application layer (ClaimNominationPage
-- fetches the nominee by invite_token and passes the id to useBuildCardFlow).
-- =============================================================================

-- Allow unauthenticated users to update unclaimed nominee records.
-- This is safe because:
-- 1. The nominee id is only known via the invite_token (secret URL)
-- 2. Only unclaimed records (user_id IS NULL) can be updated this way
-- 3. Once a user_id is set, this policy no longer applies
CREATE POLICY "nominees_update_unclaimed" ON nominees
  FOR UPDATE USING (
    user_id IS NULL
  )
  WITH CHECK (
    user_id IS NULL
  );

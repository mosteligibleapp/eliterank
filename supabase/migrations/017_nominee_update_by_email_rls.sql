-- =============================================================================
-- MIGRATION 017: Allow authenticated users to update nominees matching their email
-- =============================================================================
-- When a logged-in user sees the AcceptNominationModal (e.g. after logging in
-- with an existing account that has a pending nomination), they need to update
-- the nominee record to accept or decline. But:
--
--   - nominees_update_own requires auth.uid() = user_id, which fails when
--     the nominee's user_id hasn't been linked yet (NULL).
--   - nominees_update_unclaimed allows updates when user_id IS NULL, but its
--     WITH CHECK also requires user_id IS NULL after the update — so setting
--     user_id to link the nominee is blocked.
--
-- Fix: allow authenticated users to update nominees where the nominee's email
-- matches the user's verified auth email. This covers accept, decline, and
-- general claim operations for logged-in users.
-- =============================================================================

CREATE POLICY "nominees_update_by_email" ON nominees
  FOR UPDATE USING (
    (SELECT auth.jwt()->>'email') IS NOT NULL
    AND LOWER(email) = LOWER((SELECT auth.jwt()->>'email'))
  );

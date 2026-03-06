-- =============================================================================
-- MIGRATION 017: Allow unauthenticated users to insert nominations
-- =============================================================================
-- Migration 006 changed the nominees INSERT policy from WITH CHECK (true) to
-- WITH CHECK (auth.uid() IS NOT NULL). This broke the public NominationForm
-- which allows unauthenticated users to nominate someone (third-party) or
-- themselves. The original schema (001) had WITH CHECK (true).
--
-- Fix: drop the auth-required policy and re-create it to allow anyone to
-- insert nominations, matching the original intent.
-- =============================================================================

DROP POLICY IF EXISTS "nominees_insert" ON nominees;
DROP POLICY IF EXISTS "Anyone can create nominations" ON nominees;

CREATE POLICY "nominees_insert" ON nominees
  FOR INSERT WITH CHECK (true);

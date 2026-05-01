-- =============================================================================
-- Migration 053: Reuse interest_submissions for /launch sales leads
--
-- The /launch form is just another shape of "someone is interested in doing
-- something with us" — same as the existing interest_submissions inbox.
-- Rather than spinning up a parallel table, we extend interest_submissions:
--
--   - competition_id becomes nullable (launch leads aren't tied to a comp yet)
--   - interest_type adds 'launching'
--   - three new optional columns (org_name, website_url, pitch) to capture
--     the bits the lead form asks that aren't already covered by name / email
--     / target_launch_timeframe / message
--
-- The migration is idempotent. It also drops the orphan competition_submissions
-- table from an earlier draft of this branch (no-op if you never applied it).
-- =============================================================================

-- 1. Drop the orphan table from the earlier draft (safe if it was never applied).
DROP TABLE IF EXISTS competition_submissions;
DROP TYPE  IF EXISTS competition_submission_status;

-- 2. competition_id must be nullable for unaffiliated launch leads.
ALTER TABLE interest_submissions ALTER COLUMN competition_id DROP NOT NULL;

-- 3. Allow the new 'launching' interest_type.
ALTER TABLE interest_submissions DROP CONSTRAINT IF EXISTS interest_submissions_interest_type_check;
ALTER TABLE interest_submissions
  ADD CONSTRAINT interest_submissions_interest_type_check
  CHECK (interest_type IN ('hosting', 'sponsoring', 'competing', 'judging', 'fan', 'launching'));

-- 4. Three new optional columns specific to launch leads.
ALTER TABLE interest_submissions
  ADD COLUMN IF NOT EXISTS org_name    TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS pitch       TEXT;

-- 5. Patch the UPDATE policy so super admins can still review launch leads.
-- The original policy from 001 required a competition row to match, which
-- fails when competition_id IS NULL. Mirror the SELECT policy from 005 by
-- OR-ing in the bare super-admin check.
DROP POLICY IF EXISTS "Interest submissions updatable by admins" ON interest_submissions;
CREATE POLICY "Interest submissions updatable by admins" ON interest_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
    OR EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = interest_submissions.competition_id
        AND c.host_id = auth.uid()
    )
  );

-- 6. Index for the Launch Leads admin viewer (filters by interest_type, sorts
--    by created_at DESC).
CREATE INDEX IF NOT EXISTS idx_interest_submissions_type_created
  ON interest_submissions(interest_type, created_at DESC);

COMMENT ON COLUMN interest_submissions.org_name    IS 'Optional company / organization name (used for launching leads)';
COMMENT ON COLUMN interest_submissions.website_url IS 'Optional website or social handle (used for launching leads)';
COMMENT ON COLUMN interest_submissions.pitch       IS 'Free-text answer to "What are you looking to launch?" (used for launching leads)';

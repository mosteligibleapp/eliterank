-- =============================================================================
-- Migration 053: Competition launch / sales lead submissions
-- Captures top-of-funnel leads from the public /launch form. A sales person
-- follows up to qualify and discuss a competition concept.
--
-- This migration is idempotent — safe to re-run after earlier shapes that
-- collected wizard-style onboarding data (which has been moved to a future
-- post-sale onboarding flow).
-- =============================================================================

-- Status enum (safe-create)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competition_submission_status') THEN
    CREATE TYPE competition_submission_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS competition_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                competition_submission_status NOT NULL DEFAULT 'pending',

  contact_name          TEXT NOT NULL,
  contact_email         TEXT NOT NULL,
  org_name              TEXT,
  website_url           TEXT,
  pitch                 TEXT NOT NULL,
  start_timeframe       TEXT NOT NULL,
  notes                 TEXT,

  reviewed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  internal_notes        TEXT
);

-- ----------------------------------------------------------------------------
-- Reconcile schema for any environment that ran an earlier wizard-shaped 053.
-- Each statement is safe on a fresh DB and on partially-migrated environments.
-- ----------------------------------------------------------------------------

-- Drop wizard-era columns that are no longer collected on the sales lead form.
ALTER TABLE competition_submissions
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS social_platforms,
  DROP COLUMN IF EXISTS campaign_hashtag,
  DROP COLUMN IF EXISTS min_followers,
  DROP COLUMN IF EXISTS vote_price_usd,
  DROP COLUMN IF EXISTS sponsor_tiers,
  DROP COLUMN IF EXISTS num_winners,
  DROP COLUMN IF EXISTS cash_pool_usd,
  DROP COLUMN IF EXISTS in_kind_prizes,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS venue,
  DROP COLUMN IF EXISTS num_rounds,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS org_is_new,
  DROP COLUMN IF EXISTS is_new_to_hosting,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS category_other,
  DROP COLUMN IF EXISTS competition_name,
  DROP COLUMN IF EXISTS scope,
  DROP COLUMN IF EXISTS gender_eligibility,
  DROP COLUMN IF EXISTS age_min,
  DROP COLUMN IF EXISTS age_max,
  DROP COLUMN IF EXISTS no_age_restrictions,
  DROP COLUMN IF EXISTS social_url,
  DROP COLUMN IF EXISTS revenue_models;

ALTER TABLE competition_submissions
  DROP CONSTRAINT IF EXISTS competition_submissions_dates_chk,
  DROP CONSTRAINT IF EXISTS competition_submissions_age_chk;

-- Make sure the lean set of columns exists with the right shape, regardless
-- of which earlier shape the table is in.
ALTER TABLE competition_submissions
  ADD COLUMN IF NOT EXISTS pitch           TEXT,
  ADD COLUMN IF NOT EXISTS website_url     TEXT,
  ADD COLUMN IF NOT EXISTS start_timeframe TEXT;

-- Tighten / relax NOT NULL where needed. We can only add NOT NULL safely
-- when there are no rows missing the value — these are dev-only changes for
-- a feature that hasn't shipped, so it's acceptable to enforce immediately.
ALTER TABLE competition_submissions ALTER COLUMN contact_name DROP DEFAULT;
ALTER TABLE competition_submissions ALTER COLUMN contact_name SET NOT NULL;
ALTER TABLE competition_submissions ALTER COLUMN org_name DROP NOT NULL;
ALTER TABLE competition_submissions ALTER COLUMN pitch SET NOT NULL;
ALTER TABLE competition_submissions ALTER COLUMN start_timeframe SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competition_submissions_email   ON competition_submissions(contact_email);
CREATE INDEX IF NOT EXISTS idx_competition_submissions_status  ON competition_submissions(status);
CREATE INDEX IF NOT EXISTS idx_competition_submissions_created ON competition_submissions(created_at DESC);

ALTER TABLE competition_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a competition launch" ON competition_submissions;
CREATE POLICY "Anyone can submit a competition launch"
  ON competition_submissions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can view competition submissions" ON competition_submissions;
CREATE POLICY "Super admins can view competition submissions"
  ON competition_submissions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

DROP POLICY IF EXISTS "Super admins can update competition submissions" ON competition_submissions;
CREATE POLICY "Super admins can update competition submissions"
  ON competition_submissions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

DROP POLICY IF EXISTS "Super admins can delete competition submissions" ON competition_submissions;
CREATE POLICY "Super admins can delete competition submissions"
  ON competition_submissions
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

COMMENT ON TABLE  competition_submissions IS 'Public /launch sales-lead submissions. Sales follow-up + super-admin review.';
COMMENT ON COLUMN competition_submissions.status IS 'pending → in_review → approved | rejected';
COMMENT ON COLUMN competition_submissions.pitch IS 'Free-text answer to "What are you looking to launch?"';
COMMENT ON COLUMN competition_submissions.start_timeframe IS 'Bucket: asap, 1-3-months, 3-6-months, 6-plus-months';
COMMENT ON COLUMN competition_submissions.website_url IS 'Their website or social handle (no validation beyond URL-ish format)';

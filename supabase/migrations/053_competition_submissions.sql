-- =============================================================================
-- Migration 053: Competition launch submissions
-- Stores public-facing /launch wizard submissions from prospective host orgs.
-- Submissions land as 'pending' and are reviewed by super admins.
--
-- This migration is idempotent — safe to re-run if the schema was applied
-- with an earlier shape during development.
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

  contact_name          TEXT,
  contact_email         TEXT NOT NULL,
  org_name              TEXT NOT NULL,
  is_new_to_hosting     BOOLEAN NOT NULL DEFAULT TRUE,

  category              TEXT NOT NULL,
  category_other        TEXT,

  competition_name      TEXT,
  scope                 TEXT NOT NULL,

  gender_eligibility    TEXT[] NOT NULL DEFAULT '{}',
  age_min               INT,
  age_max               INT,
  no_age_restrictions   BOOLEAN NOT NULL DEFAULT FALSE,

  website_url           TEXT,
  social_url            TEXT,

  revenue_models        TEXT[] NOT NULL DEFAULT '{}',

  start_timeframe       TEXT NOT NULL,

  notes                 TEXT,

  reviewed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  internal_notes        TEXT
);

-- ----------------------------------------------------------------------------
-- Reconcile schema for any environment that ran an earlier shape of 053.
-- All statements use IF EXISTS / IF NOT EXISTS so they're safe on a fresh DB.
-- ----------------------------------------------------------------------------

-- Rename org_is_new → is_new_to_hosting if the old column still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_submissions'
      AND column_name = 'org_is_new'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_submissions'
      AND column_name = 'is_new_to_hosting'
  ) THEN
    ALTER TABLE competition_submissions RENAME COLUMN org_is_new TO is_new_to_hosting;
  END IF;
END $$;

-- Drop columns from earlier drafts that we no longer collect.
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
  DROP COLUMN IF EXISTS end_date;

-- Drop check constraint that referenced the removed date columns.
ALTER TABLE competition_submissions
  DROP CONSTRAINT IF EXISTS competition_submissions_dates_chk;

-- Add the new columns if a partial earlier shape exists.
ALTER TABLE competition_submissions
  ADD COLUMN IF NOT EXISTS is_new_to_hosting BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scope             TEXT,
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS social_url        TEXT,
  ADD COLUMN IF NOT EXISTS start_timeframe   TEXT;

-- competition_name was NOT NULL in the first draft; relax it.
ALTER TABLE competition_submissions
  ALTER COLUMN competition_name DROP NOT NULL;

-- Re-attach the age check constraint on the canonical name.
ALTER TABLE competition_submissions
  DROP CONSTRAINT IF EXISTS competition_submissions_age_chk;
ALTER TABLE competition_submissions
  ADD CONSTRAINT competition_submissions_age_chk
    CHECK (no_age_restrictions OR (age_min IS NOT NULL AND age_max IS NOT NULL AND age_max >= age_min));

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

COMMENT ON TABLE  competition_submissions IS 'Public /launch wizard submissions. Reviewed by super admins; can be converted to a live competition.';
COMMENT ON COLUMN competition_submissions.status IS 'pending → in_review → approved | rejected';
COMMENT ON COLUMN competition_submissions.is_new_to_hosting IS 'TRUE = new to organizing competitions; FALSE = has been running them elsewhere';
COMMENT ON COLUMN competition_submissions.scope IS 'Geographic reach: local, city-wide, state-wide, national, international';
COMMENT ON COLUMN competition_submissions.gender_eligibility IS 'Free-form chips: Women, Men, All genders, Non-binary inclusive';
COMMENT ON COLUMN competition_submissions.revenue_models IS 'Subset of: Paid voting, Sponsorships, Event tickets, Entry fees, Merchandise, Charity-based, Not sure yet';
COMMENT ON COLUMN competition_submissions.start_timeframe IS 'Bucket: asap, 1-3-months, 3-6-months, 6-12-months, 12-plus-months';

-- =============================================================================
-- Migration 053: Competition launch submissions
-- Stores public-facing /launch wizard submissions from prospective host orgs.
-- Submissions land as 'pending' and are reviewed by super admins.
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

  -- Step 1: Org & contact
  contact_name          TEXT,
  contact_email         TEXT NOT NULL,
  org_name              TEXT NOT NULL,
  org_is_new            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Step 2: Category
  category              TEXT NOT NULL,
  category_other        TEXT,

  -- Step 3: Name
  competition_name      TEXT NOT NULL,
  tagline               TEXT,

  -- Step 4: Eligibility
  gender_eligibility    TEXT[] NOT NULL DEFAULT '{}',
  age_min               INT,
  age_max               INT,
  no_age_restrictions   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Step 5: Social (skippable)
  social_platforms      TEXT[] NOT NULL DEFAULT '{}',
  campaign_hashtag      TEXT,
  min_followers         INT,

  -- Step 6: Revenue
  revenue_models        TEXT[] NOT NULL DEFAULT '{}',
  vote_price_usd        NUMERIC(10, 2),
  sponsor_tiers         TEXT,

  -- Step 7: Winning
  num_winners           INT NOT NULL DEFAULT 1,
  cash_pool_usd         NUMERIC(12, 2),
  in_kind_prizes        TEXT[] NOT NULL DEFAULT '{}',

  -- Step 8: City
  city                  TEXT NOT NULL,
  venue                 TEXT,

  -- Step 9: Launch
  num_rounds            INT NOT NULL DEFAULT 6,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,

  -- Step 10: Notes
  notes                 TEXT,

  -- Review metadata
  reviewed_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  internal_notes        TEXT,

  CONSTRAINT competition_submissions_dates_chk
    CHECK (end_date > start_date),
  CONSTRAINT competition_submissions_age_chk
    CHECK (no_age_restrictions OR (age_min IS NOT NULL AND age_max IS NOT NULL AND age_max >= age_min))
);

CREATE INDEX IF NOT EXISTS idx_competition_submissions_email   ON competition_submissions(contact_email);
CREATE INDEX IF NOT EXISTS idx_competition_submissions_status  ON competition_submissions(status);
CREATE INDEX IF NOT EXISTS idx_competition_submissions_created ON competition_submissions(created_at DESC);

ALTER TABLE competition_submissions ENABLE ROW LEVEL SECURITY;

-- Public can submit anonymously (top-of-funnel, no auth required)
DROP POLICY IF EXISTS "Anyone can submit a competition launch" ON competition_submissions;
CREATE POLICY "Anyone can submit a competition launch"
  ON competition_submissions
  FOR INSERT
  WITH CHECK (true);

-- Only super admins can read submissions
DROP POLICY IF EXISTS "Super admins can view competition submissions" ON competition_submissions;
CREATE POLICY "Super admins can view competition submissions"
  ON competition_submissions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- Only super admins can update (status changes, internal notes)
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

-- Only super admins can delete
DROP POLICY IF EXISTS "Super admins can delete competition submissions" ON competition_submissions;
CREATE POLICY "Super admins can delete competition submissions"
  ON competition_submissions
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

COMMENT ON TABLE  competition_submissions IS 'Public /launch wizard submissions. Reviewed by super admins; can be converted to a live competition.';
COMMENT ON COLUMN competition_submissions.status IS 'pending → in_review → approved | rejected';
COMMENT ON COLUMN competition_submissions.gender_eligibility IS 'Free-form chips: Women, Men, All genders, Non-binary inclusive';
COMMENT ON COLUMN competition_submissions.revenue_models IS 'Subset of: Paid voting, Sponsorships, Event tickets, Entry fees, Merchandise';

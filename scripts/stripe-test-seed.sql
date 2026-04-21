-- =============================================================================
-- Stripe Vote Flow — Test Seed Data
-- =============================================================================
-- Creates a hidden test competition + one contestant with an active voting
-- round so you can end-to-end test the Stripe payment flow before real
-- voting opens.
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste and run this entire script
--   3. The final SELECT prints the test URL to visit
--   4. Vote $1 on "Test Contestant" with a real card (live mode)
--   5. Verify a row lands in the `votes` table with `payment_intent_id` set
--   6. Refund yourself in Stripe Dashboard → Payments
--   7. When done, run the CLEANUP block at the bottom to remove the test data
--
-- SAFE TO RE-RUN: uses ON CONFLICT so it won't create duplicates.
-- =============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_competition_id UUID;
  v_contestant_id UUID;
BEGIN
  -- 1. Find or create the "Most Eligible" organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'most-eligible' LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, description)
    VALUES ('Most Eligible', 'most-eligible', 'Most Eligible brand')
    RETURNING id INTO v_org_id;
    RAISE NOTICE 'Created organization: most-eligible (%)', v_org_id;
  ELSE
    RAISE NOTICE 'Using existing organization: most-eligible (%)', v_org_id;
  END IF;

  -- 2. Create (or reuse) the test competition
  --    slug MUST contain a 4-digit year so the URL router recognizes it
  --    as a competition slug (see src/utils/slugs.js:isCompetitionSlug)
  SELECT id INTO v_competition_id
  FROM competitions
  WHERE slug = 'stripe-test-2026'
  LIMIT 1;

  IF v_competition_id IS NULL THEN
    INSERT INTO competitions (
      organization_id,
      name,
      slug,
      status,
      phase,
      price_per_vote,
      vote_price,
      use_price_bundler,
      min_contestants,
      number_of_winners,
      description,
      season
    )
    VALUES (
      v_org_id,
      'Stripe Test Competition',
      'stripe-test-2026',
      'live',
      'voting',
      1.00,
      1.00,
      FALSE,
      10,
      1,
      'Hidden test competition for end-to-end Stripe vote flow verification. Safe to delete after testing.',
      2026
    )
    RETURNING id INTO v_competition_id;
    RAISE NOTICE 'Created test competition (%)', v_competition_id;
  ELSE
    RAISE NOTICE 'Using existing test competition (%)', v_competition_id;
  END IF;

  -- 3. Create (or reuse) the test contestant
  SELECT id INTO v_contestant_id
  FROM contestants
  WHERE competition_id = v_competition_id AND slug = 'test-contestant'
  LIMIT 1;

  IF v_contestant_id IS NULL THEN
    INSERT INTO contestants (
      competition_id,
      name,
      slug,
      status,
      bio,
      city
    )
    VALUES (
      v_competition_id,
      'Test Contestant',
      'test-contestant',
      'active',
      'Placeholder contestant for Stripe payment flow verification.',
      'Test City'
    )
    RETURNING id INTO v_contestant_id;
    RAISE NOTICE 'Created test contestant (%)', v_contestant_id;
  ELSE
    RAISE NOTICE 'Using existing test contestant (%)', v_contestant_id;
  END IF;

  -- 4. Create (or refresh) an active voting round
  --    start_date in the past, end_date 7 days from now = voting is OPEN
  IF EXISTS (
    SELECT 1 FROM voting_rounds
    WHERE competition_id = v_competition_id AND round_order = 1
  ) THEN
    UPDATE voting_rounds
    SET start_date = NOW() - INTERVAL '1 hour',
        end_date = NOW() + INTERVAL '7 days'
    WHERE competition_id = v_competition_id AND round_order = 1;
    RAISE NOTICE 'Refreshed voting round dates';
  ELSE
    INSERT INTO voting_rounds (
      competition_id,
      title,
      round_order,
      round_type,
      start_date,
      end_date,
      contestants_advance
    )
    VALUES (
      v_competition_id,
      'Test Round',
      1,
      'voting',
      NOW() - INTERVAL '1 hour',
      NOW() + INTERVAL '7 days',
      1
    );
    RAISE NOTICE 'Created active voting round';
  END IF;
END $$;

-- =============================================================================
-- Print the test URL
-- =============================================================================
SELECT
  'https://YOUR-DOMAIN.com/most-eligible/stripe-test-2026/e/test-contestant' AS test_url,
  'Replace YOUR-DOMAIN with your live Vercel domain' AS note;

-- =============================================================================
-- CLEANUP (run this after testing to remove the test data)
-- =============================================================================
-- Uncomment and run to tear down:
--
-- DELETE FROM votes WHERE competition_id = (SELECT id FROM competitions WHERE slug = 'stripe-test-2026');
-- DELETE FROM competitions WHERE slug = 'stripe-test-2026';
-- -- voting_rounds and contestants cascade via ON DELETE CASCADE

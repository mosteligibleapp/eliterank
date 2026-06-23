-- =============================================================================
-- Migration 095: planned launch timeframe
-- =============================================================================
-- Captured during onboarding: roughly how far out the host plans to launch.
-- This is a planning signal (sets expectations + tells EliteRank how much
-- review runway there is) — NOT the concrete nomination/voting dates, which are
-- set later, just before publishing to the public.
--
-- We deliberately don't offer a "less than 4 weeks" option: launching in under
-- a month isn't recommended, so the shortest selectable window is 1-2 months.
-- =============================================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS planned_launch_timeframe TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competitions_planned_launch_timeframe_check') THEN
    ALTER TABLE competitions
      ADD CONSTRAINT competitions_planned_launch_timeframe_check
      CHECK (planned_launch_timeframe IS NULL OR planned_launch_timeframe IN ('6_plus_months', '3_6_months', '1_2_months'));
  END IF;
END $$;

COMMENT ON COLUMN competitions.planned_launch_timeframe IS
  'Host''s planned launch window set at onboarding: 6_plus_months | 3_6_months | 1_2_months. Planning signal only; actual dates are set before publish.';

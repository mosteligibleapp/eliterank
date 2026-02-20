-- Migration: Align database schema with application code
-- Date: 2025-12-31
--
-- This migration updates constraints, adds indexes, and removes unused columns.
-- NOTE: Did NOT add city/phone columns to contestants or phone to nominees.

-- ============================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contestants_updated_at') THEN
        CREATE TRIGGER update_contestants_updated_at
            BEFORE UPDATE ON contestants
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_nominees_updated_at') THEN
        CREATE TRIGGER update_nominees_updated_at
            BEFORE UPDATE ON nominees
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_competitions_updated_at') THEN
        CREATE TRIGGER update_competitions_updated_at
            BEFORE UPDATE ON competitions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_competition_settings_updated_at') THEN
        CREATE TRIGGER update_competition_settings_updated_at
            BEFORE UPDATE ON competition_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contestants_competition_id ON contestants(competition_id);
CREATE INDEX IF NOT EXISTS idx_contestants_user_id ON contestants(user_id);
CREATE INDEX IF NOT EXISTS idx_contestants_votes ON contestants(votes DESC);

CREATE INDEX IF NOT EXISTS idx_nominees_competition_id ON nominees(competition_id);
CREATE INDEX IF NOT EXISTS idx_nominees_user_id ON nominees(user_id);
CREATE INDEX IF NOT EXISTS idx_nominees_status ON nominees(status);

CREATE INDEX IF NOT EXISTS idx_votes_competition_id ON votes(competition_id);
CREATE INDEX IF NOT EXISTS idx_votes_contestant_id ON votes(contestant_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);

CREATE INDEX IF NOT EXISTS idx_voting_rounds_competition_id ON voting_rounds(competition_id);

-- ============================================
-- NOMINEES TABLE UPDATES
-- ============================================

-- Update nominated_by constraint to include 'admin' for manual entries
ALTER TABLE nominees DROP CONSTRAINT IF EXISTS nominees_nominated_by_check;
ALTER TABLE nominees ADD CONSTRAINT nominees_nominated_by_check
  CHECK (nominated_by IN ('self', 'third_party', 'admin'));

-- ============================================
-- REMOVE UNUSED COLUMNS FROM competition_settings
-- ============================================

ALTER TABLE competition_settings DROP COLUMN IF EXISTS voting_start;
ALTER TABLE competition_settings DROP COLUMN IF EXISTS voting_end;
ALTER TABLE competition_settings DROP COLUMN IF EXISTS vote_weight;
ALTER TABLE competition_settings DROP COLUMN IF EXISTS judge_weight;

-- ============================================
-- REMOVE UNUSED COLUMNS FROM profiles
-- ============================================

ALTER TABLE profiles DROP COLUMN IF EXISTS hobbies;
ALTER TABLE profiles DROP COLUMN IF EXISTS tiktok;
ALTER TABLE profiles DROP COLUMN IF EXISTS linkedin;

-- ============================================
-- REMOVE UNUSED COLUMNS FROM nominees
-- ============================================

ALTER TABLE nominees DROP COLUMN IF EXISTS interests;
ALTER TABLE nominees DROP COLUMN IF EXISTS profile_complete;
ALTER TABLE nominees DROP COLUMN IF EXISTS invite_token;
ALTER TABLE nominees DROP COLUMN IF EXISTS invite_sent_at;

-- ============================================
-- REMOVE UNUSED COLUMNS FROM contestants
-- ============================================

ALTER TABLE contestants DROP COLUMN IF EXISTS occupation;
ALTER TABLE contestants DROP COLUMN IF EXISTS interests;

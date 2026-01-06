-- =============================================================================
-- MIGRATION: Nomination Flow Updates
-- Date: 2026-01-06
-- Description:
--   - Adds phone column to profiles and contestants
--   - Adds nomination_reason and claimed_at to nominees
--   - Updates status enums for nominees and contestants
--   - Adds converted_to_contestant boolean flag
--   - Adds invite_token for magic link claims
-- =============================================================================

-- =============================================================================
-- STEP 1: Add phone column to profiles
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- =============================================================================
-- STEP 2: Add phone and city columns to contestants
-- =============================================================================
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE contestants ADD COLUMN IF NOT EXISTS city TEXT;

-- =============================================================================
-- STEP 3: Add new columns to nominees
-- =============================================================================
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS nomination_reason TEXT;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS converted_to_contestant BOOLEAN DEFAULT FALSE;

-- Add phone column to nominees if not exists
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add invite tracking columns for magic link
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid();
ALTER TABLE nominees ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;

-- Make email nullable for nominees (contact can be email OR phone)
ALTER TABLE nominees ALTER COLUMN email DROP NOT NULL;

-- Create unique index on invite_token for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_nominees_invite_token ON nominees(invite_token) WHERE invite_token IS NOT NULL;

-- =============================================================================
-- STEP 4: Update nominees status constraint
-- =============================================================================
-- Drop existing constraint and add new one
ALTER TABLE nominees DROP CONSTRAINT IF EXISTS nominees_status_check;
ALTER TABLE nominees ADD CONSTRAINT nominees_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));

-- Update any existing statuses to valid values
UPDATE nominees SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'rejected', 'expired');

-- =============================================================================
-- STEP 5: Update contestants status constraint
-- =============================================================================
-- Drop existing constraint and add new one
ALTER TABLE contestants DROP CONSTRAINT IF EXISTS contestants_status_check;
ALTER TABLE contestants ADD CONSTRAINT contestants_status_check
  CHECK (status IN ('active', 'eliminated', 'winner'));

-- Update any existing statuses to valid values
UPDATE contestants SET status = 'active' WHERE status NOT IN ('active', 'eliminated', 'winner');

-- =============================================================================
-- STEP 6: Update unique constraint on nominees to allow email OR phone
-- =============================================================================
-- Drop old unique constraint that required email
ALTER TABLE nominees DROP CONSTRAINT IF EXISTS nominees_competition_id_email_key;

-- Create new unique constraint - a person can only be nominated once per competition
-- We identify them by email if provided, or by name+phone if no email
CREATE UNIQUE INDEX IF NOT EXISTS idx_nominees_unique_per_competition
  ON nominees (competition_id, COALESCE(email, phone || name));

-- =============================================================================
-- STEP 7: Create index for nomination claims lookup
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nominees_pending ON nominees(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nominees_claimed_at ON nominees(claimed_at) WHERE claimed_at IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    has_phone_profiles BOOLEAN;
    has_phone_contestants BOOLEAN;
    has_nomination_reason BOOLEAN;
    has_claimed_at BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) INTO has_phone_profiles;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contestants' AND column_name = 'phone'
    ) INTO has_phone_contestants;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nominees' AND column_name = 'nomination_reason'
    ) INTO has_nomination_reason;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'nominees' AND column_name = 'claimed_at'
    ) INTO has_claimed_at;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'profiles.phone exists: %', has_phone_profiles;
    RAISE NOTICE 'contestants.phone exists: %', has_phone_contestants;
    RAISE NOTICE 'nominees.nomination_reason exists: %', has_nomination_reason;
    RAISE NOTICE 'nominees.claimed_at exists: %', has_claimed_at;

    IF has_phone_profiles AND has_phone_contestants AND has_nomination_reason AND has_claimed_at THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

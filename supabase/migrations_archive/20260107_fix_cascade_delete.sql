-- =============================================================================
-- MIGRATION: Fix Cascade Delete on host_id
-- Date: 2026-01-07
-- Description: Changes host_id foreign key from CASCADE to SET NULL
--              This prevents deleting a host from wiping all their competitions
-- =============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE competitions
DROP CONSTRAINT IF EXISTS competitions_host_id_fkey;

-- Make host_id nullable (if it isn't already)
ALTER TABLE competitions
ALTER COLUMN host_id DROP NOT NULL;

-- Re-add the foreign key with SET NULL instead of CASCADE
ALTER TABLE competitions
ADD CONSTRAINT competitions_host_id_fkey
FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    constraint_action TEXT;
BEGIN
    SELECT confdeltype INTO constraint_action
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'competitions'
    AND a.attname = 'host_id'
    AND c.contype = 'f';

    IF constraint_action = 'n' THEN
        RAISE NOTICE '=== SUCCESS: host_id now uses SET NULL (not CASCADE) ===';
    ELSIF constraint_action = 'c' THEN
        RAISE WARNING '=== FAILED: host_id still uses CASCADE ===';
    ELSE
        RAISE NOTICE 'Constraint action: %', constraint_action;
    END IF;
END $$;

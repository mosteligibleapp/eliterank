-- =============================================================================
-- MIGRATION: Activity Logging Function
-- Date: 2026-01-08
-- Description:
--   - Create helper function to log competition activity events
--   - Grant execute permissions to authenticated users and service role
-- =============================================================================

-- =============================================================================
-- STEP 1: Create the activity logging function
-- =============================================================================
CREATE OR REPLACE FUNCTION log_competition_activity(
  p_competition_id uuid,
  p_activity_type text,
  p_message text,
  p_contestant_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO competition_activity (
    competition_id,
    activity_type,
    message,
    contestant_id,
    metadata
  )
  VALUES (
    p_competition_id,
    p_activity_type,
    p_message,
    p_contestant_id,
    p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 2: Grant execute permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION log_competition_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_competition_activity TO service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'log_competition_activity'
        AND n.nspname = 'public'
    ) INTO function_exists;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'log_competition_activity function exists: %', function_exists;

    IF function_exists THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

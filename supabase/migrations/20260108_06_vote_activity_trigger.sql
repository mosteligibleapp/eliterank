-- =============================================================================
-- MIGRATION: Vote Activity Trigger
-- Date: 2026-01-08
-- Description:
--   - Create trigger to automatically log activity when votes are cast
--   - Logs contestant name, vote count, and payment metadata
-- =============================================================================

-- =============================================================================
-- STEP 1: Create the trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION on_vote_inserted()
RETURNS TRIGGER AS $$
DECLARE
  v_contestant_name text;
  v_vote_count integer;
BEGIN
  -- Get contestant name
  SELECT name INTO v_contestant_name
  FROM contestants
  WHERE id = NEW.contestant_id;

  -- Get vote count from the new record
  v_vote_count := COALESCE(NEW.vote_count, 1);

  -- Log the activity
  PERFORM log_competition_activity(
    NEW.competition_id,
    'vote',
    v_contestant_name || ' received ' || v_vote_count || ' vote' ||
      CASE WHEN v_vote_count > 1 THEN 's' ELSE '' END,
    NEW.contestant_id,
    jsonb_build_object(
      'vote_count', v_vote_count,
      'voter_id', NEW.voter_id,
      'amount_paid', COALESCE(NEW.amount_paid, 0)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 2: Drop existing trigger if exists and create new one
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_vote_activity ON votes;

CREATE TRIGGER trigger_vote_activity
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION on_vote_inserted();

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    function_exists BOOLEAN;
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'on_vote_inserted'
        AND n.nspname = 'public'
    ) INTO function_exists;

    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'trigger_vote_activity'
    ) INTO trigger_exists;

    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'on_vote_inserted function exists: %', function_exists;
    RAISE NOTICE 'trigger_vote_activity trigger exists: %', trigger_exists;

    IF function_exists AND trigger_exists THEN
        RAISE NOTICE '=== MIGRATION SUCCESSFUL ===';
    ELSE
        RAISE WARNING '=== MIGRATION INCOMPLETE - CHECK ABOVE ===';
    END IF;
END $$;

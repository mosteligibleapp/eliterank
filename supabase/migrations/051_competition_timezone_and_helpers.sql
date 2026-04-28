-- =============================================================================
-- Migration: Competition timezone + double-vote-day server-side helpers
--
-- Tightens the double-vote-day feature shipped in 050_competition_double_days:
--   * Adds a per-competition `timezone` column so "today" means the host's
--     calendar day, not UTC's.
--   * Centralizes "is today a double day?" in a single Postgres function so
--     the three vote paths (free, anonymous, paid) all consult one source.
--   * Adds a CHECK + BEFORE INSERT trigger on votes that prevents a logged-in
--     client from inserting an arbitrary vote_count via the supabase-js
--     client. Service-role inserts (anonymous-vote API, stripe webhook)
--     bypass the trigger because they compute vote_count themselves and are
--     trusted server code.
--   * Adds competition_double_days to the realtime publication so the voter
--     UI can react when a host changes the schedule mid-session.
-- =============================================================================

-- 1) Per-competition timezone -----------------------------------------------
-- Default 'UTC' preserves existing behavior. Hosts opt in via SetupTab.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- 2) Validate timezone at write time so a typo doesn't blow up at vote time.
-- We validate via a trigger rather than a CHECK constraint because tzdata is
-- technically not IMMUTABLE (Postgres updates it), and pg_dump/restore would
-- choke on a CHECK that references a non-immutable function.
CREATE OR REPLACE FUNCTION validate_competition_timezone()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM NOW() AT TIME ZONE NEW.timezone;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid IANA timezone: %', NEW.timezone
      USING ERRCODE = 'check_violation';
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competitions_validate_timezone ON competitions;
CREATE TRIGGER competitions_validate_timezone
  BEFORE INSERT OR UPDATE OF timezone ON competitions
  FOR EACH ROW EXECUTE FUNCTION validate_competition_timezone();

-- 3) today_for_competition(uuid) ---------------------------------------------
-- Returns the calendar date in the competition's local timezone. Single
-- source of truth for "today" anywhere in the vote flow.
CREATE OR REPLACE FUNCTION today_for_competition(p_competition_id UUID)
RETURNS DATE AS $$
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
    (SELECT timezone FROM competitions WHERE id = p_competition_id),
    'UTC'
  ))::DATE;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION today_for_competition(UUID) TO anon, authenticated, service_role;

-- 4) is_double_vote_day(uuid) -----------------------------------------------
-- True iff the competition's local "today" has a row in competition_double_days.
CREATE OR REPLACE FUNCTION is_double_vote_day(p_competition_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM competition_double_days
    WHERE competition_id = p_competition_id
      AND date = today_for_competition(p_competition_id)
  );
$$ LANGUAGE sql STABLE SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION is_double_vote_day(UUID) TO anon, authenticated, service_role;

-- 5) Hard cap on vote_count --------------------------------------------------
-- Catches absurd values from any path. 1000 matches the limit already
-- enforced in createVotePaymentIntent on the client.
ALTER TABLE votes DROP CONSTRAINT IF EXISTS chk_vote_count_range;
ALTER TABLE votes ADD CONSTRAINT chk_vote_count_range
  CHECK (vote_count BETWEEN 1 AND 1000);

-- 6) Free-vote validation trigger -------------------------------------------
-- Gates on auth.role() rather than on `payment_intent_id IS NULL` because a
-- logged-in client could otherwise spoof a fake payment_intent_id from the
-- supabase-js client to dodge validation. Both server-side trusted paths
-- (anonymous-vote API, stripe webhook) use the service_role key.
CREATE OR REPLACE FUNCTION validate_free_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Trusted server-side inserts compute vote_count themselves (paid: priced
  -- by stripe metadata, anonymous: 1 or 2 based on the same is_double_vote_day
  -- check we'd run here). Skip validation.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Authenticated/anon clients: free votes are 1, doubled to 2 only when
  -- today is a scheduled double-vote day for this competition.
  IF NEW.vote_count NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Free votes must have vote_count of 1 or 2 (got %)', NEW.vote_count
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.vote_count = 2 AND NOT is_double_vote_day(NEW.competition_id) THEN
    RAISE EXCEPTION 'vote_count = 2 requires an active double-vote day for competition %', NEW.competition_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS votes_validate_free_vote_count ON votes;
CREATE TRIGGER votes_validate_free_vote_count
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION validate_free_vote_count();

-- 7) Realtime publication ----------------------------------------------------
-- The voter UI subscribes to changes on this table so the (2x) badge stays
-- in sync when a host adds/removes a date mid-session. New tables are not
-- automatically added to supabase_realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'competition_double_days'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE competition_double_days;
  END IF;
END $$;

-- =============================================================================
-- Verification (run manually after applying):
--
--   SELECT today_for_competition('<comp-id>');
--   SELECT is_double_vote_day('<comp-id>');
--
--   -- Bad timezone should fail with "Invalid IANA timezone":
--   UPDATE competitions SET timezone = 'NotAZone' WHERE id = '<comp-id>';
--
--   -- As an authenticated user, this should fail (vote_count out of range):
--   INSERT INTO votes (voter_id, competition_id, contestant_id, vote_count, amount_paid)
--     VALUES (auth.uid(), '<comp-id>', '<contestant-id>', 5, 0);
--
--   -- Service-role inserts with vote_count > 2 must SUCCEED (paid-vote path):
--   -- Run this from a service-role connection (e.g., SQL Editor with the
--   -- "service_role" toggle on, or `psql` using the service role JWT).
--   INSERT INTO votes (competition_id, contestant_id, vote_count, amount_paid, payment_intent_id, voter_email)
--     VALUES ('<comp-id>', '<contestant-id>', 25, 1000, 'pi_test_verify_service_role', 'verify@example.com');
--   -- Cleanup:
--   DELETE FROM votes WHERE payment_intent_id = 'pi_test_verify_service_role';
-- =============================================================================

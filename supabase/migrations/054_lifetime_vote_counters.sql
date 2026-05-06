-- =============================================================================
-- Lifetime vote counters
-- =============================================================================
-- contestants.votes is the in-round display total. When a round resets it (via
-- 053's votes_reset_at_start), we lose visibility into how many votes a
-- contestant earned across the whole competition.
--
-- This migration adds four never-reset counters to contestants:
--   lifetime_paid_votes  : paid votes (votes.vote_count where amount_paid > 0)
--   lifetime_free_votes  : free daily votes (votes.vote_count where amount_paid = 0)
--   lifetime_bonus_votes : bonus task awards (bonus_vote_completions.votes_awarded)
--   lifetime_votes       : sum of all three; the per-contestant competition total
--
-- Triggers keep them fresh on every vote insert and bonus completion. Backfill
-- at the bottom seeds existing rows from the source-of-truth ledgers.

ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS lifetime_paid_votes  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_free_votes  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_bonus_votes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_votes       INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN contestants.lifetime_paid_votes IS
  'All paid votes (amount_paid > 0) ever attributed to this contestant. Never reset between rounds.';
COMMENT ON COLUMN contestants.lifetime_free_votes IS
  'All free daily votes (amount_paid = 0) ever attributed to this contestant. Never reset between rounds.';
COMMENT ON COLUMN contestants.lifetime_bonus_votes IS
  'All bonus votes ever awarded to this contestant. Never reset between rounds.';
COMMENT ON COLUMN contestants.lifetime_votes IS
  'lifetime_paid_votes + lifetime_free_votes + lifetime_bonus_votes; per-contestant competition total. Never reset between rounds.';

-- ---------------------------------------------------------------------------
-- Triggers: keep lifetime_* in sync as new vote rows arrive.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION on_vote_lifetime_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := COALESCE(NEW.vote_count, 0);
  v_is_paid BOOLEAN := COALESCE(NEW.amount_paid, 0) > 0;
BEGIN
  IF v_count = 0 THEN
    RETURN NEW;
  END IF;

  IF v_is_paid THEN
    UPDATE contestants
    SET lifetime_paid_votes = lifetime_paid_votes + v_count,
        lifetime_votes      = lifetime_votes      + v_count
    WHERE id = NEW.contestant_id;
  ELSE
    UPDATE contestants
    SET lifetime_free_votes = lifetime_free_votes + v_count,
        lifetime_votes      = lifetime_votes      + v_count
    WHERE id = NEW.contestant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_vote_lifetime ON votes;
CREATE TRIGGER trigger_vote_lifetime
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION on_vote_lifetime_increment();

CREATE OR REPLACE FUNCTION on_bonus_vote_lifetime_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contestants
  SET lifetime_bonus_votes = lifetime_bonus_votes + COALESCE(NEW.votes_awarded, 0),
      lifetime_votes       = lifetime_votes       + COALESCE(NEW.votes_awarded, 0)
  WHERE id = NEW.contestant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bonus_vote_lifetime ON bonus_vote_completions;
CREATE TRIGGER trigger_bonus_vote_lifetime
  AFTER INSERT ON bonus_vote_completions
  FOR EACH ROW
  EXECUTE FUNCTION on_bonus_vote_lifetime_increment();

-- ---------------------------------------------------------------------------
-- Backfill from source-of-truth ledgers.
-- ---------------------------------------------------------------------------
-- The triggers above only fire on future inserts, so seed every existing
-- contestant from the votes / bonus_vote_completions tables. This is an
-- absolute SET (not an increment); re-running it would not double-count.

UPDATE contestants c
SET lifetime_paid_votes  = sub.paid,
    lifetime_free_votes  = sub.free,
    lifetime_bonus_votes = sub.bonus,
    lifetime_votes       = sub.paid + sub.free + sub.bonus
FROM (
  SELECT
    c2.id,
    COALESCE(v.paid, 0)  AS paid,
    COALESCE(v.free, 0)  AS free,
    COALESCE(b.bonus, 0) AS bonus
  FROM contestants c2
  LEFT JOIN (
    SELECT
      contestant_id,
      COALESCE(SUM(vote_count) FILTER (WHERE COALESCE(amount_paid, 0) > 0), 0) AS paid,
      COALESCE(SUM(vote_count) FILTER (WHERE COALESCE(amount_paid, 0) = 0), 0) AS free
    FROM votes
    GROUP BY contestant_id
  ) v ON v.contestant_id = c2.id
  LEFT JOIN (
    SELECT contestant_id, SUM(votes_awarded) AS bonus
    FROM bonus_vote_completions
    GROUP BY contestant_id
  ) b ON b.contestant_id = c2.id
) sub
WHERE c.id = sub.id;

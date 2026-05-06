-- =============================================================================
-- Lifetime vote counters
-- =============================================================================
-- contestants.votes is the in-round display total. When a round resets it (via
-- 053's votes_reset_at_start), we lose visibility into how many votes a
-- contestant earned across the whole competition.
--
-- This migration adds three never-reset counters to contestants:
--   lifetime_paid_votes  : running total of paid votes (votes.vote_count)
--   lifetime_bonus_votes : running total of bonus votes
--                          (bonus_vote_completions.votes_awarded)
--   lifetime_votes       : lifetime_paid_votes + lifetime_bonus_votes
--
-- Triggers keep them fresh on every paid-vote insert and bonus-vote completion.
-- Backfill at the bottom seeds existing rows from the source-of-truth ledgers.

ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS lifetime_paid_votes  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_bonus_votes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_votes       INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN contestants.lifetime_paid_votes IS
  'All paid votes ever attributed to this contestant. Never reset between rounds.';
COMMENT ON COLUMN contestants.lifetime_bonus_votes IS
  'All bonus votes ever awarded to this contestant. Never reset between rounds.';
COMMENT ON COLUMN contestants.lifetime_votes IS
  'lifetime_paid_votes + lifetime_bonus_votes; never reset between rounds.';

-- ---------------------------------------------------------------------------
-- Triggers: keep lifetime_* in sync as new vote rows arrive.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION on_vote_lifetime_increment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contestants
  SET lifetime_paid_votes = lifetime_paid_votes + COALESCE(NEW.vote_count, 0),
      lifetime_votes      = lifetime_votes      + COALESCE(NEW.vote_count, 0)
  WHERE id = NEW.contestant_id;
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
-- contestant from the votes / bonus_vote_completions tables. Re-running this
-- block after the migration would double-count, so it is intentionally written
-- as an absolute SET (not an increment).

UPDATE contestants c
SET lifetime_paid_votes  = sub.paid,
    lifetime_bonus_votes = sub.bonus,
    lifetime_votes       = sub.paid + sub.bonus
FROM (
  SELECT
    c2.id,
    COALESCE(p.total, 0) AS paid,
    COALESCE(b.total, 0) AS bonus
  FROM contestants c2
  LEFT JOIN (
    SELECT contestant_id, SUM(vote_count) AS total
    FROM votes
    GROUP BY contestant_id
  ) p ON p.contestant_id = c2.id
  LEFT JOIN (
    SELECT contestant_id, SUM(votes_awarded) AS total
    FROM bonus_vote_completions
    GROUP BY contestant_id
  ) b ON b.contestant_id = c2.id
) sub
WHERE c.id = sub.id;

-- =============================================================================
-- Manual votes count toward lifetime stats
-- =============================================================================
-- Migration 061's process_manual_vote() trigger folds host-added votes into
-- contestants.votes. This extends it to also bump the never-reset lifetime
-- counters (migration 054). Manual votes are host-granted awards, so they land
-- in lifetime_bonus_votes alongside bonus-task votes — matching how the
-- round-reset carry-over (migration 062) already treats them.

CREATE OR REPLACE FUNCTION process_manual_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM contestants WHERE id = NEW.contestant_id;

  IF v_status = 'eliminated' THEN
    RAISE EXCEPTION 'Contestant is eliminated and cannot receive new votes'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE contestants
    SET votes                = votes + NEW.vote_count,
        lifetime_bonus_votes = lifetime_bonus_votes + NEW.vote_count,
        lifetime_votes       = lifetime_votes + NEW.vote_count
    WHERE id = NEW.contestant_id;

  UPDATE competitions
    SET total_votes = total_votes + NEW.vote_count
    WHERE id = NEW.competition_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION process_manual_vote() IS
  'AFTER INSERT trigger on manual_votes: folds host-added votes into contestants.votes, the lifetime counters, and competitions.total_votes; refuses eliminated contestants.';

COMMENT ON COLUMN contestants.lifetime_bonus_votes IS
  'All bonus-task votes and host-added manual votes ever awarded to this contestant. Never reset between rounds.';

-- ---------------------------------------------------------------------------
-- Backfill: fold any existing manual_votes into the lifetime counters.
-- Absolute SET recomputed from the source ledgers, so it is idempotent
-- (re-running does not double-count). Mirrors migration 054's backfill with
-- a manual_votes term added; lifetime_paid_votes / lifetime_free_votes are
-- left to the votes-table trigger.
-- ---------------------------------------------------------------------------

UPDATE contestants c
SET lifetime_bonus_votes = sub.bonus + sub.manual,
    lifetime_votes       = sub.paid + sub.free + sub.bonus + sub.manual
FROM (
  SELECT
    c2.id,
    COALESCE(v.paid, 0)   AS paid,
    COALESCE(v.free, 0)   AS free,
    COALESCE(b.bonus, 0)  AS bonus,
    COALESCE(m.manual, 0) AS manual
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
  LEFT JOIN (
    SELECT contestant_id, SUM(vote_count) AS manual
    FROM manual_votes
    GROUP BY contestant_id
  ) m ON m.contestant_id = c2.id
) sub
WHERE c.id = sub.id;

-- =============================================================================
-- Migration 103: Bonus votes ON by default + votes reset each round by default
--
-- Two product-default changes:
--
--   1. Bonus votes are now enabled by default for every new competition. The
--      default bonus tasks (setup_default_bonus_tasks) are seeded automatically
--      via an AFTER INSERT trigger on competitions, instead of waiting for a
--      host to click "Enable Bonus Votes" or for a contestant to first open the
--      bonus UI. Existing competitions are backfilled below.
--
--   2. Voting rounds now reset votes at the start of each round by default
--      (surviving contestants restart at zero), so the column default flips
--      FALSE -> TRUE. Only affects rows inserted without an explicit value;
--      existing rounds keep whatever was already saved.
-- =============================================================================

-- ── 1. Bonus votes on by default ────────────────────────────────────────────

-- Trigger wrapper: seed the default bonus tasks for a freshly-created
-- competition. setup_default_bonus_tasks is idempotent (ON CONFLICT DO NOTHING)
-- and SECURITY DEFINER, so this is safe regardless of which path creates the
-- competition (host self-serve, super admin, etc.).
CREATE OR REPLACE FUNCTION seed_default_bonus_tasks_on_competition_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM setup_default_bonus_tasks(NEW.id);
  RETURN NEW;
END;
-- search_path pinned so name resolution can't be hijacked by a schema the
-- caller controls (SECURITY DEFINER privilege-escalation hardening).
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_seed_default_bonus_tasks ON competitions;
CREATE TRIGGER trg_seed_default_bonus_tasks
  AFTER INSERT ON competitions
  FOR EACH ROW EXECUTE FUNCTION seed_default_bonus_tasks_on_competition_insert();

-- Backfill: seed the default tasks into every existing competition that doesn't
-- already have bonus tasks set up. Idempotent via ON CONFLICT inside the fn.
DO $$
DECLARE
  v_comp RECORD;
BEGIN
  FOR v_comp IN
    SELECT c.id
    FROM competitions c
    WHERE NOT EXISTS (
      SELECT 1 FROM bonus_vote_tasks t WHERE t.competition_id = c.id
    )
  LOOP
    PERFORM setup_default_bonus_tasks(v_comp.id);
  END LOOP;
END;
$$;

-- ── 2. Votes reset each round by default ─────────────────────────────────────

ALTER TABLE voting_rounds
  ALTER COLUMN votes_reset_at_start SET DEFAULT TRUE;

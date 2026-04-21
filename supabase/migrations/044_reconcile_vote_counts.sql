-- =============================================================================
-- Migration: Reconcile contestants.votes and competitions.total_votes
--
-- Before this change, every authenticated free vote and every paid vote was
-- counted twice on contestants.votes: once by the on_vote_insert trigger,
-- and once by application code calling increment_contestant_votes (or its
-- fallback UPDATE) right after the insert. Anonymous free votes and bonus
-- task completions were counted correctly.
--
-- IMPORTANT: This migration must run AFTER the application code is deployed
-- with the duplicate increment removed (src/lib/votes.js and
-- supabase/functions/stripe-webhook/index.ts). Otherwise, votes cast between
-- reconciliation and the new deploy will re-introduce the inflation.
--
-- The canonical total for a contestant is:
--   SUM(votes.vote_count) + SUM(bonus_vote_completions.votes_awarded)
-- scoped to that contestant.
-- =============================================================================

-- Reset contestants.votes to the true sum from the vote ledger + bonus tasks.
UPDATE contestants c
SET votes = COALESCE((
    SELECT SUM(v.vote_count)
    FROM votes v
    WHERE v.contestant_id = c.id
  ), 0) + COALESCE((
    SELECT SUM(bvc.votes_awarded)
    FROM bonus_vote_completions bvc
    WHERE bvc.contestant_id = c.id
  ), 0);

-- Reset competitions.total_votes the same way (per-competition sums).
UPDATE competitions comp
SET total_votes = COALESCE((
    SELECT SUM(v.vote_count)
    FROM votes v
    WHERE v.competition_id = comp.id
  ), 0) + COALESCE((
    SELECT SUM(bvc.votes_awarded)
    FROM bonus_vote_completions bvc
    WHERE bvc.competition_id = comp.id
  ), 0);

-- competitions.total_revenue was only updated by the process_vote trigger
-- (never double-counted), so it is left alone.

-- =============================================================================
-- 091_fix_judge_scores_insert_recursion.sql
--
-- HOTFIX: judges cannot save ANY score ("my picks aren't saved").
--
-- Migration 073 hardened the judge_scores INSERT policy to block a judge from
-- inserting new rows after they had already submitted their scoresheet for a
-- round. It did so with a NOT EXISTS subquery against judge_scores itself,
-- inside a policy ON judge_scores:
--
--     WITH CHECK (
--       EXISTS (judge owns row)
--       AND NOT EXISTS (
--         SELECT 1 FROM judge_scores js2
--         WHERE js2.judge_id = judge_scores.judge_id
--           AND js2.voting_round_id = judge_scores.voting_round_id
--           AND js2.submitted_at IS NOT NULL
--       )
--     )
--
-- Evaluating that inner SELECT re-applies the judge_scores policies, which
-- re-run the same subquery, and Postgres aborts every INSERT with:
--
--     42P17: infinite recursion detected in policy for relation "judge_scores"
--
-- Net effect: the autosave INSERT in JudgeScoringPage fails for every judge on
-- their first click, surfacing "Could not save score." Zero scores have ever
-- persisted in production.
--
-- Fix: move the "already submitted?" check into a SECURITY DEFINER helper.
-- Because the function runs as its owner (the table owner, who bypasses RLS),
-- its read of judge_scores does NOT re-trigger the policy, so there is no
-- recursion. The submission lock semantics from 073 are preserved exactly.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.judge_round_is_submitted(p_judge_id UUID, p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM judge_scores
    WHERE judge_id = p_judge_id
      AND voting_round_id = p_round_id
      AND submitted_at IS NOT NULL
  );
$$;

COMMENT ON FUNCTION public.judge_round_is_submitted(UUID, UUID) IS
  'True if the given judge has any submitted score for the given round. SECURITY DEFINER so it can be referenced from judge_scores RLS policies without causing policy recursion.';

DROP POLICY IF EXISTS "Judges can insert their own scores" ON public.judge_scores;

CREATE POLICY "Judges can insert their own scores" ON public.judge_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM judges j
    WHERE j.id = judge_scores.judge_id
      AND j.user_id = auth.uid()
  )
  AND NOT public.judge_round_is_submitted(judge_scores.judge_id, judge_scores.voting_round_id)
);

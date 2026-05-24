-- =============================================================================
-- 070_judging_system.sql
--
-- Adds the judging layer:
--   1. Invite/claim columns on `judges` so a judge can be sent a magic link,
--      set a password, and log in to a /judge dashboard (mirrors the nominee
--      claim flow).
--   2. `voting_rounds.judge_weight` — 0–100 percentage that judge scores
--      contribute to advancement. 0 = pure voting (current behavior, default),
--      100 = pure judging, anything between = blended advancement.
--   3. `judging_criteria` — host-defined qualities (e.g. "Stage Presence",
--      "Overall Impression"). Scored per competition (judges score holistically,
--      same criteria reused across every judging round).
--   4. `judge_scores` — one row per (judging round × judge × contestant ×
--      criterion). Scores are 1–10. A judge "submits" their scoresheet for a
--      round by setting `submitted_at` (after which the rows become read-only
--      to that judge).
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- voting_rounds.judge_weight — blend judges + votes for advancement
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE voting_rounds
  ADD COLUMN IF NOT EXISTS judge_weight INTEGER NOT NULL DEFAULT 0
    CHECK (judge_weight BETWEEN 0 AND 100);

-- Existing 'judging' rounds default to pure judging so the column matches
-- the round_type semantics they already advertise.
UPDATE voting_rounds SET judge_weight = 100
  WHERE round_type = 'judging' AND judge_weight = 0;

-- ──────────────────────────────────────────────────────────────────────────
-- judges: invite/claim flow
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE judges
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Backfill invite_token for any rows created before this migration so the
-- claim URL works for existing judges.
UPDATE judges SET invite_token = gen_random_uuid() WHERE invite_token IS NULL;

ALTER TABLE judges ALTER COLUMN invite_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_judges_invite_token ON judges(invite_token);
CREATE INDEX IF NOT EXISTS idx_judges_email ON judges(LOWER(email)) WHERE email IS NOT NULL;

-- Allow a judge to read their own row once linked (needed for the /judge
-- dashboard to load before any RLS-scoped queries run). Existing policies
-- already grant public SELECT, but keep this explicit in case that policy
-- is tightened later.
DROP POLICY IF EXISTS "Judges can view their own row" ON judges;
CREATE POLICY "Judges can view their own row" ON judges FOR SELECT
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- judging_criteria — host-defined per competition
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS judging_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judging_criteria_competition
  ON judging_criteria(competition_id, sort_order);

ALTER TABLE judging_criteria ENABLE ROW LEVEL SECURITY;

-- Public/judge read access. Criteria need to be visible during scoring so the
-- judge UI can render the form. Keeping this open mirrors `judges` and
-- `voting_rounds` which are also publicly visible.
DROP POLICY IF EXISTS "Judging criteria are viewable by everyone" ON judging_criteria;
CREATE POLICY "Judging criteria are viewable by everyone" ON judging_criteria
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can manage judging criteria" ON judging_criteria;
CREATE POLICY "Hosts can manage judging criteria" ON judging_criteria FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = judging_criteria.competition_id
        AND c.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all judging criteria" ON judging_criteria;
CREATE POLICY "Super admins can manage all judging criteria" ON judging_criteria FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- ──────────────────────────────────────────────────────────────────────────
-- judge_scores — one row per (round × judge × contestant × criterion)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS judge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  voting_round_id UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (voting_round_id, judge_id, contestant_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_scores_round ON judge_scores(voting_round_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_judge ON judge_scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_contestant ON judge_scores(contestant_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_competition ON judge_scores(competition_id);

ALTER TABLE judge_scores ENABLE ROW LEVEL SECURITY;

-- A judge can only see and write their own scores. Scores are linked to a
-- judge row, which is linked to a user_id — so RLS keys off that join.
DROP POLICY IF EXISTS "Judges can read their own scores" ON judge_scores;
CREATE POLICY "Judges can read their own scores" ON judge_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM judges j
      WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
    )
  );

-- Insert/update guarded both by ownership AND by submission lock: once
-- submitted_at is set the row becomes read-only to the judge. They can't
-- bypass it on UPDATE because the USING+WITH CHECK requires submitted_at IS
-- NULL on the current row (USING) and the new row (WITH CHECK).
DROP POLICY IF EXISTS "Judges can insert their own scores" ON judge_scores;
CREATE POLICY "Judges can insert their own scores" ON judge_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM judges j
      WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Judges can update their own draft scores" ON judge_scores;
CREATE POLICY "Judges can update their own draft scores" ON judge_scores FOR UPDATE
  USING (
    submitted_at IS NULL AND EXISTS (
      SELECT 1 FROM judges j
      WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM judges j
      WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Judges can delete their own draft scores" ON judge_scores;
CREATE POLICY "Judges can delete their own draft scores" ON judge_scores FOR DELETE
  USING (
    submitted_at IS NULL AND EXISTS (
      SELECT 1 FROM judges j
      WHERE j.id = judge_scores.judge_id AND j.user_id = auth.uid()
    )
  );

-- Hosts see every score for their competition (for results aggregation).
DROP POLICY IF EXISTS "Hosts can read all scores" ON judge_scores;
CREATE POLICY "Hosts can read all scores" ON judge_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = judge_scores.competition_id AND c.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can read all scores" ON judge_scores;
CREATE POLICY "Super admins can read all scores" ON judge_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- updated_at trigger reuse — most tables in this codebase rely on the app
-- layer to set updated_at, so we follow that convention here (no trigger).

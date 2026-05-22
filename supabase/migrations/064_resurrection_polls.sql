-- =============================================================================
-- Resurrection by the public
-- =============================================================================
-- An admin (the competition host or a super admin) can open a "resurrection
-- vote": eliminated contestants who were ranked within the top 25 at the
-- time their round was finalized become candidates, and the public votes for
-- which one returns to the competition. When the admin closes the poll, the
-- candidate with the most votes is resurrected (status flips back to
-- 'active'). Admin-triggered start and finish — no cron involved.
--
-- Resurrection votes live in their own table and never touch contestants.votes
-- or competitions.total_votes — they decide the poll only, not the leaderboard.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE resurrection_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  title TEXT NOT NULL DEFAULT 'Resurrection Vote',
  opened_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  winner_contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one poll may be open per competition at a time.
CREATE UNIQUE INDEX idx_resurrection_polls_one_open
  ON resurrection_polls (competition_id)
  WHERE status = 'open';
CREATE INDEX idx_resurrection_polls_competition ON resurrection_polls(competition_id);

CREATE TRIGGER update_resurrection_polls_updated_at BEFORE UPDATE ON resurrection_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- The candidate set is frozen when the poll opens.
CREATE TABLE resurrection_poll_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES resurrection_polls(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  eliminated_in_round INTEGER,
  eliminated_at_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, contestant_id)
);
CREATE INDEX idx_resurrection_candidates_poll ON resurrection_poll_candidates(poll_id);

-- One row per public vote. One vote per signed-in voter per poll.
CREATE TABLE resurrection_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES resurrection_polls(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  voter_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resurrection_votes_poll ON resurrection_votes(poll_id);
CREATE INDEX idx_resurrection_votes_contestant ON resurrection_votes(contestant_id);
CREATE UNIQUE INDEX idx_resurrection_votes_one_per_voter
  ON resurrection_votes (poll_id, voter_id)
  WHERE voter_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Polls and candidates carry no sensitive data and are read by the public
-- competition page. Votes are written only through cast_resurrection_vote().
-- All writes go through the SECURITY DEFINER RPCs below, so no INSERT/UPDATE
-- policies are granted on these tables directly.

ALTER TABLE resurrection_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE resurrection_poll_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resurrection_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resurrection polls are viewable by everyone"
  ON resurrection_polls FOR SELECT USING (true);

CREATE POLICY "Resurrection candidates are viewable by everyone"
  ON resurrection_poll_candidates FOR SELECT USING (true);

CREATE POLICY "Voters can view their own resurrection votes"
  ON resurrection_votes FOR SELECT
  USING (auth.uid() = voter_id);

CREATE POLICY "Super admins can view all resurrection votes"
  ON resurrection_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true
  ));

-- ---------------------------------------------------------------------------
-- is_resurrection_admin(competition_id)
-- ---------------------------------------------------------------------------
-- True when the caller hosts the competition or is a super admin.

CREATE OR REPLACE FUNCTION is_resurrection_admin(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM competitions
    WHERE id = p_competition_id AND host_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
$$;

-- ---------------------------------------------------------------------------
-- open_resurrection_poll(competition_id, eligibility_rank)
-- ---------------------------------------------------------------------------
-- Opens a poll and freezes its candidate set. Eligible candidates are
-- eliminated contestants whose rank within their finalized round was at or
-- above the cutoff (top 25 by default). Rank-at-elimination is read from the
-- round's finalized_snapshot, the authoritative record of standings at the
-- moment of elimination.

CREATE OR REPLACE FUNCTION open_resurrection_poll(
  p_competition_id UUID,
  p_eligibility_rank INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll_id UUID;
  v_candidate_count INTEGER;
BEGIN
  IF p_competition_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id is required';
  END IF;

  IF NOT is_resurrection_admin(p_competition_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM resurrection_polls
    WHERE competition_id = p_competition_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'A resurrection poll is already open for this competition'
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO resurrection_polls (competition_id, opened_by)
  VALUES (p_competition_id, auth.uid())
  RETURNING id INTO v_poll_id;

  INSERT INTO resurrection_poll_candidates
    (poll_id, contestant_id, eliminated_in_round, eliminated_at_rank)
  SELECT
    v_poll_id,
    c.id,
    c.eliminated_in_round,
    (snap.elem->>'rank')::int
  FROM contestants c
  JOIN voting_rounds vr
    ON vr.competition_id = c.competition_id
   AND vr.round_order = c.eliminated_in_round
  CROSS JOIN LATERAL
    jsonb_array_elements(COALESCE(vr.finalized_snapshot, '[]'::jsonb)) AS snap(elem)
  WHERE c.competition_id = p_competition_id
    AND c.status = 'eliminated'
    AND snap.elem->>'contestant_id' = c.id::text
    AND (snap.elem->>'rank')::int <= p_eligibility_rank;

  GET DIAGNOSTICS v_candidate_count = ROW_COUNT;

  -- Don't leave an empty poll behind — the exception rolls back the insert.
  IF v_candidate_count = 0 THEN
    RAISE EXCEPTION
      'No eliminated contestants are eligible for resurrection (none ranked in the top %).',
      p_eligibility_rank;
  END IF;

  RETURN jsonb_build_object(
    'poll_id', v_poll_id,
    'candidate_count', v_candidate_count
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- cast_resurrection_vote(poll_id, contestant_id)
-- ---------------------------------------------------------------------------
-- One vote per signed-in voter per poll.

CREATE OR REPLACE FUNCTION cast_resurrection_vote(
  p_poll_id UUID,
  p_contestant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_status TEXT;
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to vote' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_status FROM resurrection_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resurrection poll not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'This resurrection poll is closed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM resurrection_poll_candidates
    WHERE poll_id = p_poll_id AND contestant_id = p_contestant_id
  ) THEN
    RAISE EXCEPTION 'That contestant is not part of this resurrection poll';
  END IF;

  IF EXISTS (
    SELECT 1 FROM resurrection_votes
    WHERE poll_id = p_poll_id AND voter_id = v_uid
  ) THEN
    RAISE EXCEPTION 'You have already voted in this resurrection poll'
      USING ERRCODE = 'unique_violation';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = v_uid;

  INSERT INTO resurrection_votes (poll_id, contestant_id, voter_id, voter_email)
  VALUES (p_poll_id, p_contestant_id, v_uid, v_email);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- get_resurrection_poll(competition_id)
-- ---------------------------------------------------------------------------
-- Returns the open poll, or the most recent closed one, with per-candidate
-- vote tallies. Individual voters are never exposed — only counts.

CREATE OR REPLACE FUNCTION get_resurrection_poll(p_competition_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll       resurrection_polls%ROWTYPE;
  v_candidates JSONB;
  v_my_vote    UUID;
  v_total      INTEGER;
BEGIN
  IF p_competition_id IS NULL THEN
    RETURN jsonb_build_object('poll', NULL);
  END IF;

  SELECT * INTO v_poll
  FROM resurrection_polls
  WHERE competition_id = p_competition_id
  ORDER BY (status = 'open') DESC, opened_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('poll', NULL);
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM resurrection_votes WHERE poll_id = v_poll.id;

  SELECT contestant_id INTO v_my_vote
  FROM resurrection_votes
  WHERE poll_id = v_poll.id AND voter_id = auth.uid()
  LIMIT 1;

  SELECT jsonb_agg(
    jsonb_build_object(
      'contestant_id', cand.contestant_id,
      'name', c.name,
      'avatar_url', c.avatar_url,
      'instagram', c.instagram,
      'slug', c.slug,
      'eliminated_in_round', cand.eliminated_in_round,
      'eliminated_at_rank', cand.eliminated_at_rank,
      'votes', COALESCE(vt.cnt, 0)
    )
    ORDER BY COALESCE(vt.cnt, 0) DESC, cand.eliminated_at_rank ASC NULLS LAST
  )
  INTO v_candidates
  FROM resurrection_poll_candidates cand
  JOIN contestants c ON c.id = cand.contestant_id
  LEFT JOIN (
    SELECT contestant_id, COUNT(*) AS cnt
    FROM resurrection_votes
    WHERE poll_id = v_poll.id
    GROUP BY contestant_id
  ) vt ON vt.contestant_id = cand.contestant_id
  WHERE cand.poll_id = v_poll.id;

  RETURN jsonb_build_object(
    'poll', jsonb_build_object(
      'id', v_poll.id,
      'competition_id', v_poll.competition_id,
      'status', v_poll.status,
      'title', v_poll.title,
      'opened_at', v_poll.opened_at,
      'closed_at', v_poll.closed_at,
      'winner_contestant_id', v_poll.winner_contestant_id,
      'total_votes', v_total
    ),
    'candidates', COALESCE(v_candidates, '[]'::jsonb),
    'my_vote_contestant_id', v_my_vote
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- close_resurrection_poll(poll_id)
-- ---------------------------------------------------------------------------
-- Tallies the poll, resurrects the leading candidate, and closes the poll.
-- Idempotent: a second call on a closed poll is a no-op.

CREATE OR REPLACE FUNCTION close_resurrection_poll(p_poll_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll         resurrection_polls%ROWTYPE;
  v_winner       UUID;
  v_winner_votes INTEGER;
BEGIN
  SELECT * INTO v_poll FROM resurrection_polls WHERE id = p_poll_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resurrection poll not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT is_resurrection_admin(v_poll.competition_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF v_poll.status = 'closed' THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'already_closed',
      'winner_contestant_id', v_poll.winner_contestant_id
    );
  END IF;

  -- Winner: most votes, ties broken by the better (lower) elimination rank.
  SELECT cand.contestant_id, COUNT(rv.id)::int
  INTO v_winner, v_winner_votes
  FROM resurrection_poll_candidates cand
  LEFT JOIN resurrection_votes rv
    ON rv.poll_id = p_poll_id AND rv.contestant_id = cand.contestant_id
  WHERE cand.poll_id = p_poll_id
  GROUP BY cand.contestant_id, cand.eliminated_at_rank
  HAVING COUNT(rv.id) > 0
  ORDER BY COUNT(rv.id) DESC, cand.eliminated_at_rank ASC NULLS LAST
  LIMIT 1;

  -- Resurrect the winner with a clean vote slate so they re-enter the
  -- current round on equal footing rather than carrying a stale total.
  IF v_winner IS NOT NULL THEN
    UPDATE contestants
    SET status = 'active',
        advancement_status = 'advanced',
        eliminated_in_round = NULL,
        votes = 0,
        trend = 'same',
        updated_at = NOW()
    WHERE id = v_winner;
  END IF;

  UPDATE resurrection_polls
  SET status = 'closed',
      closed_at = NOW(),
      closed_by = auth.uid(),
      winner_contestant_id = v_winner,
      updated_at = NOW()
  WHERE id = p_poll_id;

  RETURN jsonb_build_object(
    'closed', true,
    'winner_contestant_id', v_winner,
    'winner_votes', COALESCE(v_winner_votes, 0)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION is_resurrection_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION open_resurrection_poll(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cast_resurrection_vote(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION close_resurrection_poll(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_resurrection_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION open_resurrection_poll(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cast_resurrection_vote(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resurrection_poll(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION close_resurrection_poll(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime — the public competition page reacts to a poll opening / closing.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'resurrection_polls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE resurrection_polls;
  END IF;
END $$;

-- Post-round results recap emails for voters.
--
-- When a voting/finale round finalizes, check-competition-events emails
-- everyone who voted in that round a recap: their contestant's final rank,
-- movement vs. the previous round, and a charity mention. This is the
-- proactive anti-"friendly-fraud-chargeback" touch — a voter who sees their
-- votes mattered (even in a loss) is far less likely to dispute the charge.
--
-- Two pieces:
--   1. results_recap_emails — per (round, recipient) ledger so the scheduled
--      job is safe to re-run and never double-emails.
--   2. get_round_recap_recipients(round) — aggregates the round's voters and
--      the data the email needs (final rank/status + previous-round rank).

-- 1) Dedup ledger ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS results_recap_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_round_id UUID NOT NULL REFERENCES voting_rounds(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voting_round_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_results_recap_emails_round
  ON results_recap_emails(voting_round_id);

ALTER TABLE results_recap_emails ENABLE ROW LEVEL SECURITY;
-- Written/read only by the edge function via the service role (bypasses RLS).
-- Super admins may read for support/triage.
DROP POLICY IF EXISTS "Super admins can view recap ledger" ON results_recap_emails;
CREATE POLICY "Super admins can view recap ledger" ON results_recap_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
  );

-- 2) Recipient aggregation ---------------------------------------------------
-- Returns one row per voter in the round, with the contestant they backed most
-- (by total vote_count in the round window) and that contestant's final rank /
-- status plus their rank in the previous finalized round (for movement).
CREATE OR REPLACE FUNCTION get_round_recap_recipients(p_round_id UUID)
RETURNS TABLE (
  recipient_email TEXT,
  first_name TEXT,
  contestant_id UUID,
  contestant_name TEXT,
  final_rank INTEGER,
  final_status TEXT,
  prev_rank INTEGER,
  voter_vote_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round voting_rounds%ROWTYPE;
  v_prev_round_id UUID;
BEGIN
  SELECT * INTO v_round FROM voting_rounds WHERE id = p_round_id;
  IF NOT FOUND OR v_round.start_date IS NULL OR v_round.end_date IS NULL THEN
    RETURN;
  END IF;

  -- Most recent finalized public round in this competition before this one.
  SELECT vr.id INTO v_prev_round_id
  FROM voting_rounds vr
  WHERE vr.competition_id = v_round.competition_id
    AND vr.round_type IN ('voting', 'finale')
    AND vr.finalized_at IS NOT NULL
    AND vr.end_date < v_round.end_date
  ORDER BY vr.end_date DESC
  LIMIT 1;

  RETURN QUERY
  WITH final_snap AS (
    SELECT (e->>'contestant_id')::uuid AS cid,
           (e->>'rank')::int AS rnk,
           (e->>'status') AS status
    FROM jsonb_array_elements(COALESCE(v_round.finalized_snapshot, '[]'::jsonb)) e
  ),
  prev_snap AS (
    SELECT (e->>'contestant_id')::uuid AS cid,
           (e->>'rank')::int AS rnk
    FROM voting_rounds vr2
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(vr2.finalized_snapshot, '[]'::jsonb)) e
    WHERE vr2.id = v_prev_round_id
  ),
  -- Votes cast during this round, grouped by voter + contestant.
  voter_votes AS (
    SELECT lower(v.voter_email) AS email,
           v.contestant_id AS cid,
           SUM(v.vote_count) AS vc
    FROM votes v
    WHERE v.competition_id = v_round.competition_id
      AND v.voter_email IS NOT NULL
      AND v.created_at >= v_round.start_date
      AND v.created_at < v_round.end_date
    GROUP BY lower(v.voter_email), v.contestant_id
  ),
  -- The single contestant each voter backed most this round.
  top_per_voter AS (
    SELECT DISTINCT ON (email) email, cid, vc
    FROM voter_votes
    ORDER BY email, vc DESC, cid
  )
  SELECT
    tpv.email,
    p.first_name,
    tpv.cid,
    c.name,
    fs.rnk,
    fs.status,
    ps.rnk,
    tpv.vc
  FROM top_per_voter tpv
  JOIN contestants c ON c.id = tpv.cid
  LEFT JOIN final_snap fs ON fs.cid = tpv.cid
  LEFT JOIN prev_snap ps ON ps.cid = tpv.cid
  LEFT JOIN LATERAL (
    SELECT first_name FROM profiles WHERE lower(profiles.email) = tpv.email LIMIT 1
  ) p ON true;
END;
$$;

COMMENT ON FUNCTION get_round_recap_recipients(UUID) IS
  'Voters in a finalized round with the contestant they backed most and that contestant''s final rank/status + previous-round rank, for the vote_results_recap email.';

-- RPCs that power the Nominators and Voters lists on the Email Activity tab.
-- Both functions do server-side aggregation, latest-email-status lookup, and
-- subscriber lookup so the client doesn't have to download every vote/log row
-- and chain three round trips. SECURITY INVOKER keeps existing RLS in effect.

CREATE OR REPLACE FUNCTION public.get_competition_nominators(
  p_competition_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  nominator_name TEXT,
  nominator_email TEXT,
  nomination_reason TEXT,
  created_at TIMESTAMPTZ,
  delivery_status TEXT,
  is_subscriber BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.id = p_competition_id
      AND (
        c.host_id = auth.uid()
        OR EXISTS (SELECT 1 FROM competition_co_hosts cch
                   WHERE cch.competition_id = c.id AND cch.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles pr
                   WHERE pr.id = auth.uid() AND pr.is_super_admin = true)
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this competition''s nominators';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      n.nominator_name,
      n.nominator_email,
      n.nomination_reason,
      n.created_at
    FROM nominees n
    WHERE n.competition_id = p_competition_id
      AND n.nominated_by = 'third_party'
      AND n.nominator_email IS NOT NULL
  ),
  latest_email AS (
    SELECT DISTINCT ON (LOWER(el.to_email))
      LOWER(el.to_email) AS email_lc,
      el.status
    FROM email_logs el
    WHERE el.competition_id = p_competition_id
    ORDER BY LOWER(el.to_email), el.created_at DESC
  ),
  subscriber_emails AS (
    SELECT LOWER(pr.email) AS email_lc
    FROM competition_subscribers cs
    JOIN profiles pr ON pr.id = cs.user_id
    WHERE cs.competition_id = p_competition_id
  ),
  total AS (SELECT count(*) AS c FROM base)
  SELECT
    b.nominator_name,
    b.nominator_email,
    b.nomination_reason,
    b.created_at,
    le.status AS delivery_status,
    EXISTS (
      SELECT 1 FROM subscriber_emails se
      WHERE se.email_lc = LOWER(b.nominator_email)
    ) AS is_subscriber,
    (SELECT c FROM total) AS total_count
  FROM base b
  LEFT JOIN latest_email le ON le.email_lc = LOWER(b.nominator_email)
  ORDER BY b.created_at DESC
  LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_competition_voters(
  p_competition_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  email TEXT,
  total_votes BIGINT,
  total_paid NUMERIC,
  transaction_count BIGINT,
  delivery_status TEXT,
  is_subscriber BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.id = p_competition_id
      AND (
        c.host_id = auth.uid()
        OR EXISTS (SELECT 1 FROM competition_co_hosts cch
                   WHERE cch.competition_id = c.id AND cch.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles pr
                   WHERE pr.id = auth.uid() AND pr.is_super_admin = true)
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this competition''s voters';
  END IF;

  RETURN QUERY
  WITH aggregated AS (
    SELECT
      COALESCE(v.voter_email, 'Anonymous') AS email,
      SUM(COALESCE(v.vote_count, 1))::BIGINT AS total_votes,
      SUM(COALESCE(v.amount_paid, 0))::NUMERIC AS total_paid,
      COUNT(*)::BIGINT AS transaction_count
    FROM votes v
    WHERE v.competition_id = p_competition_id
    GROUP BY COALESCE(v.voter_email, 'Anonymous')
  ),
  latest_email AS (
    SELECT DISTINCT ON (LOWER(el.to_email))
      LOWER(el.to_email) AS email_lc,
      el.status
    FROM email_logs el
    WHERE el.competition_id = p_competition_id
    ORDER BY LOWER(el.to_email), el.created_at DESC
  ),
  subscriber_emails AS (
    SELECT LOWER(pr.email) AS email_lc
    FROM competition_subscribers cs
    JOIN profiles pr ON pr.id = cs.user_id
    WHERE cs.competition_id = p_competition_id
  ),
  total AS (SELECT count(*) AS c FROM aggregated)
  SELECT
    a.email,
    a.total_votes,
    a.total_paid,
    a.transaction_count,
    le.status AS delivery_status,
    EXISTS (
      SELECT 1 FROM subscriber_emails se
      WHERE se.email_lc = LOWER(a.email)
    ) AS is_subscriber,
    (SELECT c FROM total) AS total_count
  FROM aggregated a
  LEFT JOIN latest_email le ON le.email_lc = LOWER(a.email)
  ORDER BY a.total_votes DESC
  LIMIT GREATEST(p_limit, 0) OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competition_nominators(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_voters(UUID, INT, INT) TO authenticated;

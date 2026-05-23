-- ============================================================================
-- Competition Co-Hosts
-- ============================================================================
-- Adds a many-to-many join table on top of competitions.host_id (primary host)
-- so a competition can have additional hosts. Co-hosts get the SAME RLS
-- capabilities as the primary host across every host-gated table.
-- Notifications fan out to all hosts (primary + co-hosts).
-- Membership is managed exclusively by super admins via SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competition_co_hosts (
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (competition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_competition_co_hosts_user
  ON public.competition_co_hosts(user_id);

ALTER TABLE public.competition_co_hosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "co_hosts_select_all" ON public.competition_co_hosts;
CREATE POLICY "co_hosts_select_all" ON public.competition_co_hosts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "co_hosts_super_admin_all" ON public.competition_co_hosts;
CREATE POLICY "co_hosts_super_admin_all" ON public.competition_co_hosts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true));

-- ---------------------------------------------------------------------------
-- RPCs (super-admin only, SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_competition_co_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin boolean;
  v_host_id uuid;
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles WHERE id = auth.uid();

  IF NOT COALESCE(v_is_super_admin, false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Profile % not found', p_user_id USING ERRCODE = 'P0002';
  END IF;

  SELECT host_id INTO v_host_id FROM public.competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id USING ERRCODE = 'P0002';
  END IF;

  IF v_host_id = p_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.competition_co_hosts (competition_id, user_id, created_by)
  VALUES (p_competition_id, p_user_id, auth.uid())
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  UPDATE public.profiles
  SET is_host = true, updated_at = now()
  WHERE id = p_user_id AND COALESCE(is_host, false) = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_competition_co_host(
  p_competition_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin boolean;
BEGIN
  IF p_competition_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_competition_id and p_user_id are required';
  END IF;

  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles WHERE id = auth.uid();

  IF NOT COALESCE(v_is_super_admin, false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.competition_co_hosts
  WHERE competition_id = p_competition_id AND user_id = p_user_id;

  IF NOT EXISTS (SELECT 1 FROM public.competitions WHERE host_id = p_user_id)
     AND NOT EXISTS (SELECT 1 FROM public.competition_co_hosts WHERE user_id = p_user_id) THEN
    UPDATE public.profiles SET is_host = false, updated_at = now() WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.add_competition_co_host(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_competition_co_host(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_competition_co_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_competition_co_host(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: grant co-hosts the SAME access as the primary host on every
-- host-gated table. Existing host_id policies stay intact; permissive RLS
-- ORs them together so primary hosts retain access unchanged.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "co_hosts_update_competition" ON public.competitions;
CREATE POLICY "co_hosts_update_competition" ON public.competitions
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = competitions.id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_contestants" ON public.contestants;
CREATE POLICY "co_hosts_manage_contestants" ON public.contestants
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = contestants.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = contestants.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_nominees" ON public.nominees;
CREATE POLICY "co_hosts_manage_nominees" ON public.nominees
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = nominees.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = nominees.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_votes" ON public.votes;
CREATE POLICY "co_hosts_manage_votes" ON public.votes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = votes.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = votes.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_judges" ON public.judges;
CREATE POLICY "co_hosts_manage_judges" ON public.judges
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = judges.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = judges.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_sponsors" ON public.sponsors;
CREATE POLICY "co_hosts_manage_sponsors" ON public.sponsors
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = sponsors.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = sponsors.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_events" ON public.events;
CREATE POLICY "co_hosts_manage_events" ON public.events
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = events.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = events.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_announcements" ON public.announcements;
CREATE POLICY "co_hosts_manage_announcements" ON public.announcements
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = announcements.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = announcements.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_voting_rounds" ON public.voting_rounds;
CREATE POLICY "co_hosts_manage_voting_rounds" ON public.voting_rounds
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = voting_rounds.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = voting_rounds.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_nomination_periods" ON public.nomination_periods;
CREATE POLICY "co_hosts_manage_nomination_periods" ON public.nomination_periods
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = nomination_periods.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = nomination_periods.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_interest_submissions" ON public.interest_submissions;
CREATE POLICY "co_hosts_manage_interest_submissions" ON public.interest_submissions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = interest_submissions.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = interest_submissions.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_competition_prizes" ON public.competition_prizes;
CREATE POLICY "co_hosts_manage_competition_prizes" ON public.competition_prizes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = competition_prizes.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = competition_prizes.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_competition_rules" ON public.competition_rules;
CREATE POLICY "co_hosts_manage_competition_rules" ON public.competition_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = competition_rules.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = competition_rules.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_manage_manual_votes" ON public.manual_votes;
CREATE POLICY "co_hosts_manage_manual_votes" ON public.manual_votes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                 WHERE cch.competition_id = manual_votes.competition_id AND cch.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                      WHERE cch.competition_id = manual_votes.competition_id AND cch.user_id = auth.uid()));

DROP POLICY IF EXISTS "co_hosts_update_own_org" ON public.organizations;
CREATE POLICY "co_hosts_update_own_org" ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_co_hosts cch
      JOIN public.competitions c ON c.id = cch.competition_id
      WHERE c.organization_id = organizations.id
        AND cch.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_co_hosts cch
      JOIN public.competitions c ON c.id = cch.competition_id
      WHERE c.organization_id = organizations.id
        AND cch.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Optional host-gated tables (only attach policy if table exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.bonus_vote_tasks') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "co_hosts_manage_bonus_vote_tasks" ON public.bonus_vote_tasks';
    EXECUTE 'CREATE POLICY "co_hosts_manage_bonus_vote_tasks" ON public.bonus_vote_tasks
      FOR ALL
      USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                     WHERE cch.competition_id = bonus_vote_tasks.competition_id AND cch.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                          WHERE cch.competition_id = bonus_vote_tasks.competition_id AND cch.user_id = auth.uid()))';
  END IF;

  IF to_regclass('public.bonus_vote_completions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "co_hosts_view_bonus_completions" ON public.bonus_vote_completions';
    EXECUTE 'CREATE POLICY "co_hosts_view_bonus_completions" ON public.bonus_vote_completions
      FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                     WHERE cch.competition_id = bonus_vote_completions.competition_id AND cch.user_id = auth.uid()))';
  END IF;

  IF to_regclass('public.bonus_vote_submissions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "co_hosts_view_bonus_submissions" ON public.bonus_vote_submissions';
    EXECUTE 'CREATE POLICY "co_hosts_view_bonus_submissions" ON public.bonus_vote_submissions
      FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                     WHERE cch.competition_id = bonus_vote_submissions.competition_id AND cch.user_id = auth.uid()))';
  END IF;

  IF to_regclass('public.video_prompt_responses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "co_hosts_view_video_responses" ON public.video_prompt_responses';
    EXECUTE 'CREATE POLICY "co_hosts_view_video_responses" ON public.video_prompt_responses
      FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                     WHERE cch.competition_id = video_prompt_responses.competition_id AND cch.user_id = auth.uid()))';
  END IF;

  IF to_regclass('public.competition_double_days') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "co_hosts_manage_double_days" ON public.competition_double_days';
    EXECUTE 'CREATE POLICY "co_hosts_manage_double_days" ON public.competition_double_days
      FOR ALL
      USING (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                     WHERE cch.competition_id = competition_double_days.competition_id AND cch.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.competition_co_hosts cch
                          WHERE cch.competition_id = competition_double_days.competition_id AND cch.user_id = auth.uid()))';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Notifications: fan out to all hosts (primary + co-hosts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_competition_notification(
  p_competition_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT DISTINCT c.user_id, p_type, p_title, p_body, p_competition_id, p_action_url, p_metadata
  FROM public.contestants c
  WHERE c.competition_id = p_competition_id AND c.user_id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.notifications (user_id, type, title, body, competition_id, action_url, metadata)
  SELECT DISTINCT host_user_id, p_type, p_title, p_body, p_competition_id, p_action_url, p_metadata
  FROM (
    SELECT comp.host_id AS host_user_id
      FROM public.competitions comp
      WHERE comp.id = p_competition_id AND comp.host_id IS NOT NULL
    UNION
    SELECT cch.user_id
      FROM public.competition_co_hosts cch
      WHERE cch.competition_id = p_competition_id
  ) hosts
  WHERE host_user_id NOT IN (
    SELECT DISTINCT c.user_id FROM public.contestants c
    WHERE c.competition_id = p_competition_id AND c.user_id IS NOT NULL
  );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: user_roles view is not recreated here.
-- The source-of-truth for is_host status is profiles.is_host, which both
-- assign_competition_host (existing) and add_competition_co_host /
-- remove_competition_co_host (above) maintain atomically.

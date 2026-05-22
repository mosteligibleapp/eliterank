-- =============================================================================
-- Round-end emails
-- =============================================================================
-- Three hours after a voting round is finalized, every contestant in that
-- round's finalized_snapshot is emailed their result:
--   * advanced / winner       -> "You advanced!"        (round_advanced)
--   * eliminated / runner_up   -> "Thanks for competing" (round_eliminated)
--
-- Pipeline:
--   round-end-emails cron (every 5 min)
--     -> POST /functions/v1/send-round-end-emails { round_id }
--        -> for each snapshot entry, POST /functions/v1/send-onesignal-email
--
-- The 3-hour delay lets the public leaderboard settle before contestants are
-- told their result. round_end_emails_sent_at is the idempotency guard so the
-- every-5-min cron sends each finalized round exactly once.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

ALTER TABLE voting_rounds
  ADD COLUMN IF NOT EXISTS round_end_emails_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN voting_rounds.round_end_emails_sent_at IS
  'Set by send-round-end-emails once the round-result email batch has been sent. Idempotency guard for the round-end-emails cron.';

-- ---------------------------------------------------------------------------
-- get_email_service_key()
-- ---------------------------------------------------------------------------
-- send-round-end-emails authenticates its server-to-server call to
-- send-onesignal-email with the service-role key. It pulls the key from Vault
-- at request time rather than the injected SUPABASE_SERVICE_ROLE_KEY env: on
-- 2026-05-17 the env key was stale and rejected by verify_jwt, silently
-- dropping a full round-end email batch. The Vault copy is rotated in lockstep
-- with the live key.

CREATE OR REPLACE FUNCTION get_email_service_key()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_email_service_key() IS
  'Returns the service_role_key from Vault. Used by send-round-end-emails to authenticate its call to send-onesignal-email.';

GRANT EXECUTE ON FUNCTION get_email_service_key() TO service_role;

-- ---------------------------------------------------------------------------
-- Cron: round-end-emails (every 5 minutes)
-- ---------------------------------------------------------------------------
-- Already deployed in production. Documented here (not executed) so the
-- schedule lives in source control — same convention as the send-vote-digest
-- and send-fan-weekly-digest cron migrations. pg_cron + pg_net must be enabled
-- (Supabase Dashboard -> Database -> Extensions) and a 'service_role_key'
-- secret must exist in Vault.
--
-- SELECT cron.unschedule('round-end-emails')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'round-end-emails');
--
-- SELECT cron.schedule(
--   'round-end-emails',
--   '*/5 * * * *',
--   $cron$
--   DO $body$
--   DECLARE
--     v_round RECORD;
--     v_service_key TEXT;
--   BEGIN
--     SELECT decrypted_secret INTO v_service_key
--     FROM vault.decrypted_secrets
--     WHERE name = 'service_role_key'
--     LIMIT 1;
--
--     IF v_service_key IS NULL THEN
--       RAISE WARNING 'round-end-emails cron: service_role_key missing from vault — skipping run';
--       RETURN;
--     END IF;
--
--     FOR v_round IN
--       SELECT id
--       FROM voting_rounds
--       WHERE finalized_at IS NOT NULL
--         AND finalized_at <= NOW() - INTERVAL '3 hours'
--         AND round_end_emails_sent_at IS NULL
--       ORDER BY finalized_at ASC
--     LOOP
--       PERFORM net.http_post(
--         url := 'https://jioblcflgpqcfdmzjnto.supabase.co/functions/v1/send-round-end-emails',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'Authorization', 'Bearer ' || v_service_key
--         ),
--         body := jsonb_build_object('round_id', v_round.id)
--       );
--     END LOOP;
--   END;
--   $body$;
--   $cron$
-- );

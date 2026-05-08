-- =============================================================================
-- Round-end email pipeline
-- =============================================================================
-- After a voting round finalizes (finalize_voting_round, see migration 053),
-- send each participating contestant a follow-up email:
--   - Eliminated → gracious "thanks for competing" with link to their card
--   - Advanced  → "you advanced to <next round>" with start date + tier
--
-- Mechanism:
--   1. New column voting_rounds.round_end_emails_sent_at (idempotency stamp)
--   2. pg_cron job 'round-end-emails' running every 5 minutes
--      - Picks rounds where finalized_at is at least DELAY_MINUTES old
--        and round_end_emails_sent_at IS NULL
--      - Calls edge function send-round-end-emails via pg_net.http_post
--      - The edge function does the per-contestant fan-out, calls
--        send-onesignal-email, and stamps round_end_emails_sent_at
--
-- DELAY_MINUTES is 60 for the initial rollout (tonight's Entry Round),
-- giving us a one-hour observation window to verify the pipeline before
-- emails fire. Drop to 30 once the pattern is proven by editing the cron
-- job's command (UPDATE cron.job ... or unschedule + re-schedule).
--
-- One-time setup required (cannot be migration-automated because the
-- service_role_key isn't in the migration scope):
--
--   In the Supabase SQL editor (running as postgres), run ONCE:
--
--     SELECT vault.create_secret(
--       '<your-service-role-key-from-Settings-API>',
--       'service_role_key',
--       'Used by pg_cron jobs to call edge functions'
--     );
--
--   Without this, the cron job will run but every http_post will get a
--   401 from the edge function. The cron job logs in cron.job_run_details
--   plus the round_end_emails_sent_at column staying NULL will surface
--   the issue.

ALTER TABLE voting_rounds
  ADD COLUMN IF NOT EXISTS round_end_emails_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN voting_rounds.round_end_emails_sent_at IS
  'Set by send-round-end-emails edge function once advance/eliminate emails have been dispatched for this round. NULL until then. Idempotency guard so the cron does not re-send.';

DO $$
DECLARE
  v_cron_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_cron_available;

  IF NOT v_cron_available THEN
    RAISE NOTICE 'pg_cron not available — skipping round-end-emails schedule. Apply manually later.';
    RETURN;
  END IF;

  -- Idempotent: drop any prior copy of this job before re-scheduling.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'round-end-emails';

  PERFORM cron.schedule(
    'round-end-emails',
    '*/5 * * * *',  -- every 5 minutes
    $cmd$
    DO $body$
    DECLARE
      v_round RECORD;
      v_service_key TEXT;
    BEGIN
      SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;

      IF v_service_key IS NULL THEN
        RAISE WARNING 'round-end-emails cron: service_role_key missing from vault — skipping run';
        RETURN;
      END IF;

      FOR v_round IN
        SELECT id
        FROM voting_rounds
        WHERE finalized_at IS NOT NULL
          AND finalized_at <= NOW() - INTERVAL '60 minutes'
          AND round_end_emails_sent_at IS NULL
        ORDER BY finalized_at ASC
      LOOP
        PERFORM net.http_post(
          url := 'https://jioblcflgpqcfdmzjnto.supabase.co/functions/v1/send-round-end-emails',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
          ),
          body := jsonb_build_object('round_id', v_round.id)
        );
      END LOOP;
    END;
    $body$;
    $cmd$
  );
END $$;

-- =============================================================================
-- 079_round_end_emails_cron_immediate.sql
--
-- The `round-end-emails` pg_cron job (every 5 min) calls the
-- send-round-end-emails edge function for finalized rounds that haven't been
-- emailed yet (round_end_emails_sent_at IS NULL).
--
-- Previously it gated on `finalized_at <= NOW() - INTERVAL '3 hours'`, delaying
-- all round-result emails by 3 hours after finalization. This removes that
-- delay so contestants and their fans are notified as soon as a round
-- finalizes. round_end_emails_sent_at still guarantees at-most-once delivery.
--
-- Documents (in repo) a job that was originally created out-of-band; the job is
-- looked up by name so this is safe to run regardless of its jobid.
-- =============================================================================

DO $mig$
DECLARE
  v_jobid BIGINT;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'round-end-emails';

  IF v_jobid IS NULL THEN
    RAISE NOTICE 'round-end-emails cron job not found — skipping (nothing to alter)';
    RETURN;
  END IF;

  PERFORM cron.alter_job(
    v_jobid,
    command => $cmd$
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
END $mig$;

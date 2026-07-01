-- Migration 108: add `organizations` to the realtime publication
--
-- The host Payouts card (HostConnectCard) needs to reflect Stripe Connect KYC
-- status changes the moment they land — without a reload or re-polling Stripe.
-- The `stripe-webhook` function is already the source of truth: on Stripe's
-- `account.updated` event it recomputes kyc_status + capability flags and writes
-- them to the org row (§5.1). Publishing this table over Realtime lets the
-- client subscribe to that row and update instantly when the webhook fires.
--
-- Note on exposure: the org SELECT policy is permissive (USING (true)), so any
-- authenticated user could subscribe to any org's row changes. The realtime
-- payload carries only non-sensitive status flags + the connect account id —
-- never a raw SSN/EIN (Invariant 15) — so this is not a KYC-data leak, but the
-- SELECT policy should be tightened to owner/co-host in a later pass.
--
-- New tables are not automatically added to supabase_realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'organizations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
  END IF;
END $$;

-- Migration 108: isolate Stripe Connect / KYC status in a strict-RLS table
--
-- Problem: the host Payouts card needs live KYC status, but `organizations` has
-- a permissive read policy (organizations_select USING (true)) so any
-- authenticated user can read every org's row — and Realtime `postgres_changes`
-- filters by that same row policy, so subscribing to `organizations` would let
-- anyone snoop on any org's Connect status. The payload is only status flags +
-- the acct_ id (never SSN/EIN — Invariant 15), but it shouldn't be broadly
-- readable.
--
-- Fix: keep `organizations` as the write source of truth (the connect-onboard /
-- stripe-webhook / create-payment-intent functions — including the money path —
-- stay untouched, writing via the service role), and project the Connect/KYC
-- columns into a dedicated `organization_connect` table that:
--   * has a STRICT row policy — only the org's owner / host / co-hosts (and
--     super-admins) can read a row, so REST reads and Realtime subscriptions
--     are both scoped to people who belong to the org;
--   * is kept in sync by an AFTER trigger on `organizations`;
--   * is the table the host app subscribes to over Realtime and reads its own
--     status from.
--
-- `organizations` is deliberately NOT added to the Realtime publication.
--
-- Follow-up (tracked, not here): a logged-in user can still directly REST-read
-- the Connect columns that remain on `organizations`. Fully closing that needs a
-- column-grant lockdown on `organizations`, which also requires updating the
-- admin console's `select('*')` reads — out of scope for this change.

-- ── 1. Projection table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_connect (
  organization_id           uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_connect_account_id text,
  kyc_status                text NOT NULL DEFAULT 'not_started'
                              CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'failed')),
  charges_enabled           boolean NOT NULL DEFAULT false,
  payouts_enabled           boolean NOT NULL DEFAULT false,
  connect_details_submitted boolean NOT NULL DEFAULT false,
  connect_onboarded_at      timestamptz,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_connect_stripe_account
  ON public.organization_connect (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- ── 2. Backfill from the current source of truth ────────────────────────────
INSERT INTO public.organization_connect (
  organization_id, stripe_connect_account_id, kyc_status, charges_enabled,
  payouts_enabled, connect_details_submitted, connect_onboarded_at, updated_at
)
SELECT id, stripe_connect_account_id, kyc_status, charges_enabled,
       payouts_enabled, connect_details_submitted, connect_onboarded_at, now()
FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- ── 3. Keep it in sync with organizations writes ────────────────────────────
-- SECURITY DEFINER so the mirror upsert always succeeds regardless of who wrote
-- the org row (service role, owner, super-admin). One-way only: organizations →
-- organization_connect (no recursion — different table).
CREATE OR REPLACE FUNCTION public._sync_organization_connect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_connect (
    organization_id, stripe_connect_account_id, kyc_status, charges_enabled,
    payouts_enabled, connect_details_submitted, connect_onboarded_at, updated_at
  ) VALUES (
    NEW.id, NEW.stripe_connect_account_id, NEW.kyc_status, NEW.charges_enabled,
    NEW.payouts_enabled, NEW.connect_details_submitted, NEW.connect_onboarded_at, now()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    kyc_status                = EXCLUDED.kyc_status,
    charges_enabled           = EXCLUDED.charges_enabled,
    payouts_enabled           = EXCLUDED.payouts_enabled,
    connect_details_submitted = EXCLUDED.connect_details_submitted,
    connect_onboarded_at      = EXCLUDED.connect_onboarded_at,
    updated_at                = now();
  RETURN NEW;
END;
$$;

-- Fire on INSERT (new org) and only when a Connect column actually changes, so
-- ordinary branding edits don't churn the projection (or its Realtime stream).
DROP TRIGGER IF EXISTS trg_sync_organization_connect ON public.organizations;
CREATE TRIGGER trg_sync_organization_connect
  AFTER INSERT OR UPDATE OF stripe_connect_account_id, kyc_status, charges_enabled,
                            payouts_enabled, connect_details_submitted, connect_onboarded_at
  ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public._sync_organization_connect();

-- ── 4. Strict row-level security ────────────────────────────────────────────
-- Ownership check mirrors the connect-onboard edge function's authorization:
-- super-admin, org owner, a host of any competition under the org, or a co-host.
-- SECURITY DEFINER so the policy isn't defeated by RLS on the referenced tables.
CREATE OR REPLACE FUNCTION public._can_read_org_connect(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.organizations o
               WHERE o.id = p_org_id AND o.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.competitions c
               WHERE c.organization_id = p_org_id AND c.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.competitions c
               JOIN public.competition_co_hosts ch ON ch.competition_id = c.id
               WHERE c.organization_id = p_org_id AND ch.user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public._can_read_org_connect(uuid) TO authenticated;

ALTER TABLE public.organization_connect ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_connect_select ON public.organization_connect;
CREATE POLICY organization_connect_select ON public.organization_connect
  FOR SELECT TO authenticated
  USING (public._can_read_org_connect(organization_id));

-- Read-only for clients; the trigger (definer) and service role handle writes.
GRANT SELECT ON public.organization_connect TO authenticated;
-- Supabase's default table privileges auto-grant anon SELECT on new public
-- tables. RLS already denies anon (no anon policy), but revoke the grant too so
-- payout status is never anon-reachable even if a policy is later added.
REVOKE SELECT ON public.organization_connect FROM anon;

-- ── 5. Realtime: publish the strict table, keep organizations OUT ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'organization_connect'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_connect;
  END IF;
  -- Defensive: undo the interim step that briefly added organizations here.
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'organizations'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.organizations;
  END IF;
END $$;

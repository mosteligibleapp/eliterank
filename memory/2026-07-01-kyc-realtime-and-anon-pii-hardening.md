# Session 2026-07-01 — Host KYC Realtime + anon PII hardening

Context snapshot so this work isn't lost between sessions. Production Supabase
project = **EliteRank** (`jioblcflgpqcfdmzjnto`). Migrations here are applied
**manually** (there is no auto-apply-on-merge pipeline — this is how drift crept in).

## What shipped (merged to `main` via PR #612)

Feature branch `claude/gifted-shannon-wjr2fh`.

1. **Host Payouts card shows KYC status live.** Started as client-side
   Stripe-polling → rewrote to a Supabase **Realtime** subscription. Files:
   `src/features/competition-dashboard/components/HostConnectCard.jsx`
   (subscribes to `organization_connect`, manual "Check status now" button),
   `src/features/competition-dashboard/hooks/useCompetitionDashboard.js`
   (reads Connect status via the embedded `organization_connect` row),
   `OverviewTab.jsx` (passes `onSynced`).
2. **Migration 108 `organization_connect`** — strict-RLS projection of the
   Stripe Connect/KYC columns. `organizations` stays the write source of truth
   (payment-path edge fns untouched); an `AFTER` trigger mirrors writes into
   `organization_connect`, which has an owner/host/co-host/super-admin RLS
   policy and is the only Connect table in the Realtime publication.
3. **Migration 109** — repo record of the `votes` anon-PII hotfix.

## Applied directly to PRODUCTION this session (all verified)

- `restrict_anon_pii_columns` — the repo migration `103` (was merged but NEVER
  applied to prod). Revokes anon SELECT on `profiles` (email/phone/is_super_admin/
  shipping_address/…) and `organizations` (Stripe/KYC), re-grants only public
  display columns. **This was a live PII leak**: logged-out users could read every
  user's email + phone via the public anon key.
- `restrict_anon_votes_pii_columns` (migration `109`) — revokes anon SELECT on
  `votes.voter_email` / `voter_id`.
- `organization_connect_table` (migration `108`) — applied to prod BEFORE merging
  so the new frontend (which reads `organization_connect`) doesn't break. 12/12
  orgs backfilled; anon grant revoked (RLS already denied anon).

Verification method throughout: `has_column_privilege(role, table, col, 'SELECT')`
and `pg_policy` inspection. All confirmed.

## Remaining work → tracked in issue #611

1. **`contestants` anon lockdown** (PR — frontend): drop `email` from the anon
   selects in `useCompetitionPublic.js` + `useLeaderboard.js`, then revoke
   `email`/`phone` from anon. `phone` isn't selected anywhere anon.
2. **`nominees` anon lockdown** (PR — frontend): entangled with entry/claim/
   build-card flows (some `select('*')`, some filter by `user_id`/`email`);
   convert each anon path to explicit safe columns first. Keep `user_id` readable
   (public profile page filters on it).
3. **Authenticated REST gap on `organizations`** Connect columns — needs a
   column-grant lockdown for `authenticated` + fixing admin `select('*')` reads
   (admin uses the same anon-key `authenticated` client), or move columns to
   `organization_connect` as sole source of truth and drop from `organizations`.
4. **Migration-drift audit** — repo vs `supabase_migrations.schema_migrations`;
   find other merged-but-unapplied migrations and reconcile so `db push` is safe.
   Known drift: repo renumbered managed-org migrations `103/104`→`105/106`; prod
   still has `103_managed_organizations`/`104_protect_org_is_managed`/`104b_...`;
   repo `103_restrict_anon_pii_columns` now applied under name `restrict_anon_pii_columns`.

## Tables checked and NOT anon-exposed
`judges`, `host_leads`, `interest_submissions` — owner/admin-only SELECT policies
block anon regardless of column grants.

## Voting payments wiring (for reference)
Stripe Connect **direct charges**: `create-payment-intent` (service role, gates on
`kyc_status='verified' && charges_enabled`) creates the PI on the host's connected
account with an `application_fee_amount`; client confirms via `getStripe(connectedAccountId)`
(Stripe.js `stripeAccount`). Vote recorded with idempotency on `payment_intent_id`
by either the client (`recordPaidVote`, authenticated, pre-doubled) or the
`stripe-webhook` (anon/redirect). Free votes: `submitFreeVote` / `/api/cast-anonymous-vote`.

## Open ops items
- **Sentry** MCP needs authorization (claude.ai connector settings or `/mcp`) before error data is reachable.
- These were live PII exposures — confirm any privacy/disclosure obligation with compliance.

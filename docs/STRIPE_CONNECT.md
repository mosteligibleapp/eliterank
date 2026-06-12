# Stripe: EliteRank platform account + Connect for hosts

This documents (a) decoupling the platform from Most Eligible's Stripe account
and (b) how host payouts work via Stripe Connect (Express).

## Model

- **EliteRank** owns the **platform** Stripe account. All vote charges are
  created on it.
- Each **host** onboards their own **Express connected account**. Their share
  of vote revenue (`competitions.host_payout_percentage`, default 20%) is
  transferred to them automatically; EliteRank keeps the rest as the Stripe
  **application fee**.
- We use **destination charges** with `on_behalf_of` set to the connected
  account, so the host is the settlement merchant and **Stripe's processing
  fees come out of the host's share**. EliteRank is the merchant of record for
  disputes/refunds.
- The connected account is attached to the **host profile**
  (`competitions.host_id`) — see migration `082_host_stripe_connect.sql`. A host
  onboards once; every competition they host pays out to the same account.
- **Most Eligible is decoupled like any other host:** its host profile onboards
  Most Eligible's own Stripe account under the EliteRank platform. Nothing
  special-cases it in code.

## Fallback (no host special-casing, no voting outage)

`create-payment-intent` only routes a host-share transfer when the host's
`stripe_charges_enabled` is `true`. Until a host finishes onboarding, their
competitions' charges stay **wholly on the platform account** — exactly today's
behavior. This makes the cutover safe: nothing breaks for competitions whose
host hasn't connected yet.

## One-time operational cutover (done in dashboards, not code)

1. **Create the EliteRank Stripe account** (or designate a fresh one as the
   platform). This replaces Most Eligible's account as the platform.
2. **Enable Connect** on it (Dashboard → Connect → Get started). Choose
   **Express**. Set the platform branding/business profile.
3. **Rotate the platform secrets** to the EliteRank account:
   - `STRIPE_SECRET_KEY` (Supabase edge function env)
   - `VITE_STRIPE_PUBLISHABLE_KEY` (frontend / Vercel env)
4. **Payments webhook** (existing `stripe-webhook` function): point a Stripe
   webhook endpoint at it on the EliteRank account and set
   `STRIPE_WEBHOOK_SECRET`. Events: `payment_intent.succeeded`,
   `payment_intent.payment_failed`.
5. **Connect webhook** (new `stripe-connect-webhook` function): in the Stripe
   Dashboard add a **Connected accounts** webhook endpoint pointing at it, and
   set **`STRIPE_CONNECT_WEBHOOK_SECRET`** (a *different* signing secret from
   the payments webhook). Events: `account.updated`.
6. **Deploy** the new/changed edge functions: `stripe-connect-onboard`,
   `stripe-connect-webhook`, `create-payment-intent`, `stripe-webhook`.
7. **Apply** migration `082_host_stripe_connect.sql`.
8. **Onboard hosts:** each host opens their dashboard → Overview → the payout
   card → "Connect Stripe", and completes Express onboarding. Most Eligible's
   host does this too, with Most Eligible's bank details.

## Env vars

| Var | Where | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | edge functions | **EliteRank** platform secret key |
| `STRIPE_WEBHOOK_SECRET` | edge functions | payments webhook signing secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | edge functions | **new** — Connect (connected accounts) webhook signing secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | frontend | **EliteRank** platform publishable key |
| `APP_URL` | edge functions | used for onboarding return/refresh URLs (defaults to `https://eliterank.co`) |

## Code touchpoints

- `supabase/migrations/20260611130000_082_host_stripe_connect.sql` — host
  payout-account columns on `profiles`.
- `supabase/functions/stripe-connect-onboard/` — creates the Express account +
  returns an onboarding Account Link; `status` action syncs flags.
- `supabase/functions/stripe-connect-webhook/` — `account.updated` → sync host
  onboarding flags. **Flips routing on** once a host's charges are enabled.
- `supabase/functions/create-payment-intent/` — destination-charge routing
  (`application_fee_amount` + `on_behalf_of` + `transfer_data`) when the host is
  onboarded; platform-only fallback otherwise.
- `supabase/functions/stripe-webhook/` — auto-refund now also reverses the
  transfer + refunds the application fee for Connect charges.
- `src/lib/stripeConnect.js`, `src/features/overview/components/StripeConnectCard.jsx`
  — host onboarding UI.

## Not yet included (follow-ups)

- Actual payout *reconciliation/reporting* UI (the dashboard still shows an
  *estimated* payout; per-transfer reporting would come from Stripe).
- Admin (super-admin) visibility into each host's Connect status.
- Express **dashboard login links** (`stripe.accounts.createLoginLink`) so hosts
  can view their Stripe payouts from within EliteRank.

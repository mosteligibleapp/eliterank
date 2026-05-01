# EliteRank Dashboard

Admin dashboard for "Most Eligible" competitions.

## Setup

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Tech Stack

- React 18
- Vite
- Lucide React (icons)

## "Launch a competition" wizard

`/launch` is a public, unauthenticated wizard for prospective hosts to submit
a competition concept. Submissions land in `competition_submissions` as
`pending` and are reviewed in the super-admin dashboard.

### Flow

1. **Public entry.** Marketing nav exposes a "Launch a competition" CTA on the
   landing page (`src/components/modals/EliteRankCityModal.jsx`). Anchor links
   to `/launch`. The slug `launch` is reserved in `src/utils/slugs.js` so it
   isn't matched as an org slug.

2. **Wizard (`src/features/launch/`).** 11-step wizard with progress bar,
   per-step validation, skippable Social and Notes steps, and a clickable
   step indicator that lets the user jump back to any step they've already
   reached. Draft state is autosaved to `localStorage` under the
   `eliterank-launch-draft-v1` key on every change and cleared on successful
   submit. State machine lives in `useLaunchWizard.js`; per-step validators
   in `validation.js`; option lists and `INITIAL_FORM` shape in `constants.js`.

3. **Submit.** Client inserts directly into `competition_submissions` (table
   policy allows public INSERT only) and then fires-and-forgets a call to the
   `notify-competition-submission` edge function with `{ submission_id }`.

4. **Notification (`supabase/functions/notify-competition-submission/`).**
   Re-fetches the submission with the service role and sends two emails via
   OneSignal:
     - Confirmation to `contact_email` (with submission ID).
     - Internal alert to `SUPER_ADMIN_NOTIFICATION_EMAIL` containing every
       field for at-a-glance review and a link back to the admin app.
   Mirrors the OneSignal call pattern from `send-onesignal-email`.

5. **Success screen (`LaunchSuccess.jsx`).** "Thanks, we'll be in touch"
   confirmation with the submission ID and a link back home.

### Super-admin review

A new sidebar entry (Admin → Competitions → **Competition Submissions**)
opens `CompetitionSubmissionsViewer.jsx`, which provides:

- Stat row (Total / Pending / In Review / Approved / Rejected).
- Filter bar with status + free-text search (org, contact, competition, city).
- Sortable table; clicking a row opens the detail view.
- Detail view shows every submitted field, plus:
  - Status dropdown (`pending` → `in_review` → `approved` | `rejected`).
  - Internal notes textarea (super-admin only).
  - **Reply to contact** opens `mailto:` prefilled with subject/body.
  - **Convert to live competition** (placeholder; logs the submission to the
    console — the actual conversion will be wired in a follow-up).
- Pending count appears as a gold badge on the sidebar nav item, kept fresh
  via a Postgres realtime subscription on the table.

### Required Supabase secrets for the edge function

```
ONESIGNAL_APP_ID
ONESIGNAL_API_KEY
APP_URL                            # e.g. https://eliterank.co
SUPABASE_URL                       # provided by Supabase runtime
SUPABASE_SERVICE_ROLE_KEY          # provided by Supabase runtime
SUPER_ADMIN_NOTIFICATION_EMAIL     # where internal alerts land
```

Set with `supabase secrets set ...` and deploy with
`supabase functions deploy notify-competition-submission`.

### Database

- Migration: `supabase/migrations/053_competition_submissions.sql`
- Table: `competition_submissions`
- RLS: public can `INSERT`; super admins can `SELECT`/`UPDATE`/`DELETE`.
- Constraints: `end_date > start_date`; either `no_age_restrictions` is true
  OR both `age_min` and `age_max` are set with `age_max >= age_min`.

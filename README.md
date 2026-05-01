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

## "Launch a competition" lead form

`/launch` is a public, unauthenticated sales lead form for prospective
hosts. Submissions land in `competition_submissions` as `pending` and a
salesperson follows up to qualify them. The form intentionally collects
just enough to make the first call useful — richer onboarding happens
post-sale (the wizard prototype for that lives in git history; see
commits `f5f8e50` … `0238414`).

### Flow

1. **Public entry.** Marketing nav exposes a "Launch a competition" CTA on
   the landing page (`src/components/modals/EliteRankCityModal.jsx`),
   which links to `/launch`. The slug `launch` is reserved in
   `src/utils/slugs.js` so it isn't matched as an org slug.

2. **Form (`src/features/launch/LaunchForm.jsx`).** Single-page form:
   - Your full name (required)
   - Email (required)
   - Company / Organization name (optional)
   - Website or Instagram (optional)
   - "What are you looking to launch?" (required, free text)
   - When do you want to start? (required, one of four buckets)
   - Anything else we should know? (optional)

   Inputs autosave to `localStorage` under `eliterank-launch-lead-draft-v1`
   so refreshes don't lose progress; the draft is cleared on successful
   submit. Inline validation; mobile-responsive.

3. **Submit.** Client inserts directly into `competition_submissions`
   (table policy allows public INSERT only) and then fire-and-forgets a
   call to the `notify-competition-submission` edge function with
   `{ submission_id }`.

4. **Notification (`supabase/functions/notify-competition-submission/`).**
   Re-fetches the submission with the service role and sends two emails
   via OneSignal:
     - Confirmation to `contact_email` (with submission ID).
     - Internal alert to `SUPER_ADMIN_NOTIFICATION_EMAIL` with the pitch
       and contact info for fast follow-up, plus a link to the admin app.
   Mirrors the OneSignal call pattern from `send-onesignal-email`.

5. **Success screen (`LaunchSuccess.jsx`).** "Thanks, we'll be in touch"
   confirmation with the submission ID and a link back home.

### Super-admin review

A sidebar entry (Admin → Competitions → **Launch Leads**) opens
`CompetitionSubmissionsViewer.jsx`, which provides:

- Stat row (Total / Pending / In Review / Approved / Rejected).
- Filter bar with status + free-text search (name, email, org, pitch).
- Sortable table; clicking a row opens the detail view.
- Detail view shows the contact info, the pitch, the start timeframe, and
  any submitter notes, plus:
  - Status dropdown (`pending` → `in_review` → `approved` | `rejected`).
  - Internal notes textarea (super-admin only).
  - **Reply to contact** opens `mailto:` prefilled with subject/body.
  - **Start onboarding** (placeholder; logs the lead to the console — the
    actual handoff to the post-sale onboarding flow will be wired up
    later).
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

Launch leads piggy-back on the existing `interest_submissions` table —
they're just another shape of "someone wants to do something with us".

- Migration: `supabase/migrations/053_competition_submissions.sql`
  (despite the filename, it ALTERs `interest_submissions` rather than
  creating a new table — kept on disk under that name so the migration
  ordering stays stable).
- Table: `interest_submissions`. Launch leads have
  `interest_type = 'launching'` and `competition_id IS NULL`.
- New columns added by `053`: `org_name`, `website_url`, `pitch`.
  Existing columns reused: `name`, `email`, `target_launch_timeframe`
  (added in `052`), `message`, `status`.
- RLS: existing policies still apply. The `INSERT` policy already allows
  the public; `053` patches the `UPDATE` policy so super admins can edit
  rows whose `competition_id` is `NULL`.

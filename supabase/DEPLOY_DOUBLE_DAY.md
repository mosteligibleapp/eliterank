# Deploying Double Vote Day changes

Why this exists: most Supabase migrations just need to be applied via SQL
Editor — but the double-vote-day feature splits its logic between the DB
(migration) and the `stripe-webhook` edge function (server-side count
computation). Forgetting to redeploy the webhook is what caused the first
manual test to silently no-op on doubling. Use this checklist.

## Steps

1. **Apply migration `050_competition_double_days.sql`** in the Supabase SQL
   Editor. Skip this step if it's already applied.

2. **Apply migration `051_competition_timezone_and_helpers.sql`** in the SQL
   Editor. This adds the `competitions.timezone` column, the
   `is_double_vote_day` RPC, the vote-count CHECK + insert trigger, and the
   realtime publication entry for `competition_double_days`.

3. **Redeploy the stripe webhook**. Required — the paid-vote multiplier lives
   here:
   ```bash
   supabase functions deploy stripe-webhook
   ```

4. **Redeploy the email function** so the receipt template can render the
   "Today is a Double Vote Day" callout:
   ```bash
   supabase functions deploy send-onesignal-email
   ```

5. **(Optional) Set timezones for existing competitions.** New ones default
   to `UTC`. Hosts can change the timezone themselves via SetupTab → Double
   Vote Days → Timezone, or you can backfill in SQL:
   ```sql
   UPDATE competitions SET timezone = 'America/Los_Angeles' WHERE host_id = '<host-id>';
   ```

## Smoke test

Run after deploying:

```sql
-- Returns the calendar date in the competition's local timezone:
SELECT today_for_competition('<comp-id>');

-- True iff today (in that timezone) is in competition_double_days:
SELECT is_double_vote_day('<comp-id>');

-- Bad timezone should fail with "Invalid IANA timezone":
UPDATE competitions SET timezone = 'NotAZone' WHERE id = '<comp-id>';
```

End-to-end:

1. In SetupTab → Double Vote Days, pick a real timezone for the test
   competition. Add today's date (in that timezone) as a double day.
2. Cast a free vote as both an authenticated user and an anonymous voter.
   Inspect the `votes` row: `vote_count = 2`, `is_double_vote = true`.
3. In Stripe test mode, buy 5 votes. The webhook should record
   `vote_count = 10` and the receipt email should contain the gold
   "Today is a Double Vote Day" callout.
4. With two browsers open, remove the double day from the dashboard. The
   voter's `(2x)` badge should disappear without a refresh.

## Rollback

Migration 051 is additive. To roll back:

```sql
DROP TRIGGER IF EXISTS votes_validate_free_vote_count ON votes;
DROP FUNCTION IF EXISTS validate_free_vote_count();
ALTER TABLE votes DROP CONSTRAINT IF EXISTS chk_vote_count_range;
DROP FUNCTION IF EXISTS is_double_vote_day(UUID);
DROP FUNCTION IF EXISTS today_for_competition(UUID);
DROP TRIGGER IF EXISTS competitions_validate_timezone ON competitions;
DROP FUNCTION IF EXISTS validate_competition_timezone();
ALTER TABLE competitions DROP COLUMN IF EXISTS timezone;
ALTER PUBLICATION supabase_realtime DROP TABLE competition_double_days;
```

Then redeploy the previous version of `stripe-webhook` and
`send-onesignal-email` (the functions reference the new RPC and email
fields, so they'll hit "function does not exist" errors until the
edge code is also rolled back).

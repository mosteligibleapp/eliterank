# Engagement System Implementation

## Providers

**Email:** SendGrid (owned by Twilio)  
**SMS:** Twilio

Both under one Twilio account.

---

## What Was Built

### 1. Fixed: ContestantGuide for All New Contestants ✅
**File:** `src/features/entry/components/CardReveal.jsx`

Third-party nominees who claim their nomination now see the ContestantGuide (5 onboarding screens explaining how to win).

### 2. Database: Engagement Queue Table
**File:** `supabase/migrations/011_engagement_queue.sql`

New table `engagement_queue` for scheduling automated emails:
- Tracks nominee_id, contestant_id, competition_id
- Stores email_to, scheduled_for, sent_at
- Tracks opens, clicks, bounces
- Has retry logic (max 3 retries)

Run this migration in Supabase SQL Editor.

### 3. Edge Function: process-engagement-queue
**File:** `supabase/functions/process-engagement-queue/index.ts`

Processes the engagement queue hourly:
- Finds pending emails (scheduled_for <= now, not sent)
- Renders email templates
- Sends via Resend API
- Updates sent_at on success

**Email Templates Included:**
- `nomination_reminder_48h` - 48-hour reminder to claim
- `nomination_reminder_5d` - Final reminder to claim
- `nominator_friend_entered` - Your friend entered!
- `nominator_no_response` - They haven't responded
- `approval_email` - You're officially in!
- `voting_countdown_3d` - 3 days until voting
- `voting_countdown_1d` - Tomorrow's the day
- `voting_started` - It's go time!
- `first_vote` - You got your first vote!

### 4. Updated: send-nomination-invite
**File:** `supabase/functions/send-nomination-invite/index.ts`

Now schedules follow-up emails after sending the initial invite:
- 48-hour reminder
- 5-day final reminder  
- 7-day nominator notification (if no response)

### 5. Updated: approveNominee
**File:** `src/features/super-admin/hooks/useCompetitionDashboard.js`

When admin approves a nominee:
- Cancels pending nomination reminders
- Schedules approval email
- Schedules pre-voting countdown emails (3 days, 1 day before)

### 6. Updated: Claim Flow
**File:** `src/features/entry/hooks/useBuildCardFlow.js`

When nominee completes claim:
- Cancels pending nomination reminders
- Notifies nominator that their friend entered (uses `nominator_notify` flag)

---

## Deployment Steps

### 1. Twilio Setup (do this first - takes time)

#### A. Create Twilio Account
1. Sign up at twilio.com
2. Verify your email and phone

#### B. SendGrid Setup (for Email)
1. Go to SendGrid (sendgrid.com) - it's part of Twilio
2. Create API key with "Mail Send" permission
3. Verify your sending domain (eliterank.co):
   - Add DNS records (CNAME for DKIM, TXT for SPF)
   - Wait for verification (can take up to 48h)

#### C. SMS Setup (A2P 10DLC - required for US)
1. In Twilio Console → Phone Numbers → Buy a Number
2. Go to Messaging → Services → Create a Messaging Service
3. Register your brand (Trust Hub → Customer Profiles):
   - Business name, EIN, address
   - Takes 1-2 weeks for approval
4. Register your Campaign (use case: "Notifications"):
   - Describe the messages you'll send
   - Sample messages
   - Opt-in/opt-out process
5. Once approved, link your phone number to the Messaging Service

**⚠️ Start this NOW - A2P registration takes 1-2 weeks**

### 2. Run the Migration
In Supabase Dashboard → SQL Editor, paste and run:
```sql
-- Contents of supabase/migrations/011_engagement_queue.sql
```

### 3. Set Up Secrets
```bash
# Twilio SMS
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your-auth-token
supabase secrets set TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# SendGrid Email
supabase secrets set SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
supabase secrets set EMAIL_FROM="EliteRank <noreply@eliterank.co>"
```

### 4. Deploy Edge Functions
```bash
cd eliterank

# Deploy the engagement processor
supabase functions deploy process-engagement-queue

# Redeploy the updated nomination invite
supabase functions deploy send-nomination-invite
```

### 5. Set Up Hourly Cron
In Supabase Dashboard → Database → Extensions, enable `pg_cron`.

Then run:
```sql
SELECT cron.schedule(
  'process-engagement-queue-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/process-engagement-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 6. Deploy Frontend
```bash
git add .
git commit -m "Add engagement queue system"
git push
```

---

## Testing

### Test Nomination Flow
1. Nominate someone (third-party)
2. Check `engagement_queue` table - should have 48h, 5d, and 7d reminders scheduled
3. Claim the nomination
4. Check that reminders are cancelled
5. Check that `nominator_friend_entered` is scheduled

### Test Approval Flow
1. Approve a nominee in admin dashboard
2. Check `engagement_queue` for approval email
3. Check for pre-voting countdown emails (if voting_start is set)

### Test Queue Processing
```bash
# Manually trigger the queue processor
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/process-engagement-queue \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Monitoring

### View Pending Emails
```sql
SELECT * FROM engagement_queue 
WHERE sent_at IS NULL 
ORDER BY scheduled_for;
```

### View Sent Emails
```sql
SELECT engagement_type, COUNT(*), 
       AVG(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as open_rate
FROM engagement_queue 
WHERE sent_at IS NOT NULL
GROUP BY engagement_type;
```

### View Failures
```sql
SELECT * FROM engagement_queue 
WHERE retry_count >= 3 OR last_error IS NOT NULL;
```

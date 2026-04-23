# Nominee Engagement System

A scalable, repeatable system for maximum nominee engagement from nomination to active contestant.

---

## The Nominee Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOMINEE LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │ NOMINATED│───▶│ CLAIMED  │───▶│ APPROVED │───▶│ PREPPED  │───▶│ VOTING │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│       │              │               │               │               │      │
│       ▼              ▼               ▼               ▼               ▼      │
│   Email #1       Email #2       Email #3       Email #4         Ongoing     │
│   + Notify       Guide +        You're In!     Voting Soon      Engagement  │
│   Nominator      Checklist      Next Steps     Final Prep                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: NOMINATED (Third-Party)

**Trigger:** Someone nominates another person

### Immediate Actions
| Action | Target | Status |
|--------|--------|--------|
| Magic link email to nominee | Nominee | ✅ EXISTS |
| In-app notification (if account exists) | Nominee | ✅ EXISTS |
| Confirmation email to nominator | Nominator | ❌ MISSING |
| Store `nominator_notify` preference | DB | ✅ EXISTS (unused) |

### Follow-up Actions (Automated)
| Timing | Action | Target |
|--------|--------|--------|
| +48 hours | Reminder email if not claimed | Nominee |
| +5 days | Final reminder email | Nominee |
| +7 days | "They haven't responded" email | Nominator (if notify=true) |

---

## Stage 2: CLAIMED (Profile Complete)

**Trigger:** Nominee accepts and completes their card

### Immediate Actions
| Action | Target | Status |
|--------|--------|--------|
| Show ContestantGuide (5 screens) | Nominee | ❌ MISSING for third-party |
| "Your friend entered!" email | Nominator | ❌ MISSING |
| Mark `claimed_at` timestamp | DB | ✅ EXISTS |

### Data to Capture
- `claimed_at` - when they completed the flow
- `flow_stage` = 'card' - they finished
- Profile completeness score (for bonus votes later)

---

## Stage 3: APPROVED (Now a Contestant)

**Trigger:** Admin approves the nominee

### Immediate Actions
| Action | Target | Status |
|--------|--------|--------|
| In-app notification | Contestant | ✅ EXISTS |
| "You're In!" email with next steps | Contestant | ❌ MISSING |
| Create contestant record | DB | ✅ EXISTS |
| Initialize bonus votes tasks | DB | ✅ EXISTS (but locked to voting phase) |

### What the Email Should Include
1. Congratulations + competition details
2. Link to their public profile
3. Link to ContestantGuide (or embed key points)
4. Clear CTA: "Complete your profile to earn bonus votes"
5. Timeline: when voting starts

---

## Stage 4: PREPPED (Pre-Voting Engagement)

**Trigger:** Contestant exists, voting hasn't started

### Goals
- Get profile 100% complete
- Build anticipation
- Encourage social sharing before voting
- Earn bonus votes early

### Engagement Touchpoints
| Timing | Action | Condition |
|--------|--------|-----------|
| Approval + 24h | "Complete your profile" reminder | Profile < 100% |
| Approval + 72h | "Share your link to build buzz" | Profile complete |
| Voting - 3 days | "Voting starts soon!" countdown | All contestants |
| Voting - 1 day | "Tomorrow's the day" final prep | All contestants |

### Bonus Votes (Available NOW, not just voting phase)
| Task | Votes | When Available |
|------|-------|----------------|
| Complete profile (name, bio, photo) | 5 | Immediately |
| Add social link | 3 | Immediately |
| View "How to Win" guide | 3 | Immediately |
| Share profile link | 5 | Immediately |
| ~~Add age~~ | ~~2~~ | Removed |

---

## Stage 5: VOTING (Active Competition)

**Trigger:** Voting phase begins

### Engagement Touchpoints
| Timing | Action | Condition |
|--------|--------|-----------|
| Voting starts | "It's go time!" email | All contestants |
| Daily | Free vote reminder | Optional opt-in |
| First vote received | "You got your first vote!" | First vote only |
| Rank milestone | "You moved up to #X!" | Top 50%, 25%, 10% |
| At risk | "You're at #X, top Y advance" | Near cutoff line |
| Round ends - 24h | "Final push!" urgency | All contestants |

---

## Implementation Architecture

### Database: `nominee_engagement` table

```sql
CREATE TABLE nominee_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nominee_id UUID REFERENCES nominees(id),
  contestant_id UUID REFERENCES contestants(id),
  competition_id UUID REFERENCES competitions(id) NOT NULL,
  
  -- Engagement tracking
  engagement_type TEXT NOT NULL, -- 'nomination_reminder', 'approval_email', etc.
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadata
  email_to TEXT,
  template_id TEXT,
  template_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_engagement_type CHECK (engagement_type IN (
    'nomination_sent',
    'nomination_reminder_48h',
    'nomination_reminder_5d',
    'nominator_no_response',
    'nominator_friend_entered',
    'approval_email',
    'profile_incomplete_reminder',
    'share_reminder',
    'voting_countdown_3d',
    'voting_countdown_1d',
    'voting_started',
    'first_vote',
    'rank_milestone',
    'at_risk_warning',
    'round_ending_24h'
  ))
);

-- Index for the cron job to find pending emails
CREATE INDEX idx_engagement_pending ON nominee_engagement(scheduled_for) 
  WHERE sent_at IS NULL;
```

### Edge Function: `process-engagement-queue`

Runs every hour via cron:

```typescript
// 1. Find all engagement records where scheduled_for <= now AND sent_at IS NULL
// 2. For each record:
//    - Load template
//    - Render with template_data
//    - Send via Resend/SendGrid/etc.
//    - Update sent_at
// 3. Log results
```

### Scheduling Logic (in existing functions)

**In `send-nomination-invite`:**
```typescript
// After sending initial email, schedule follow-ups
await supabase.from('nominee_engagement').insert([
  {
    nominee_id: nominee.id,
    competition_id: competition.id,
    engagement_type: 'nomination_reminder_48h',
    scheduled_for: new Date(Date.now() + 48 * 60 * 60 * 1000),
    email_to: nominee.email,
    template_data: { nominee_name, competition_name, claim_url }
  },
  {
    nominee_id: nominee.id,
    competition_id: competition.id,
    engagement_type: 'nomination_reminder_5d',
    scheduled_for: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    email_to: nominee.email,
    template_data: { ... }
  }
]);

// Also schedule nominator notification
if (nominator_email && nominator_notify) {
  await supabase.from('nominee_engagement').insert({
    nominee_id: nominee.id,
    competition_id: competition.id,
    engagement_type: 'nominator_no_response',
    scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    email_to: nominator_email,
    template_data: { nominator_name, nominee_name, competition_name }
  });
}
```

**When nominee claims (in `useBuildCardFlow`):**
```typescript
// Cancel pending reminders
await supabase.from('nominee_engagement')
  .delete()
  .eq('nominee_id', nomineeId)
  .in('engagement_type', ['nomination_reminder_48h', 'nomination_reminder_5d'])
  .is('sent_at', null);

// Schedule nominator notification
if (nominee.nominator_email && nominee.nominator_notify) {
  await supabase.from('nominee_engagement').insert({
    nominee_id: nomineeId,
    competition_id: competitionId,
    engagement_type: 'nominator_friend_entered',
    scheduled_for: new Date(), // Send immediately
    email_to: nominee.nominator_email,
    template_data: { ... }
  });
}
```

**When admin approves (in `useCompetitionDashboard`):**
```typescript
// Send approval email
await supabase.from('nominee_engagement').insert({
  contestant_id: newContestantId,
  competition_id: competitionId,
  engagement_type: 'approval_email',
  scheduled_for: new Date(),
  email_to: contestant.email,
  template_data: { 
    contestant_name,
    competition_name,
    profile_url,
    guide_url,
    voting_starts: competition.voting_start
  }
});

// Schedule pre-voting reminders
if (voting_start > now) {
  // Profile reminder in 24h (if incomplete)
  // Voting countdown at -3d, -1d
}
```

---

## Email Templates Needed

### 1. `nomination_sent` (EXISTS - via Supabase Auth)
Currently uses Supabase's magic link template. Could be customized.

### 2. `nomination_reminder_48h`
```
Subject: [Name], you've been nominated for Most Eligible [City]!

Hey [Name],

[Nominator] thinks you're Most Eligible material. Don't leave them hanging!

[ACCEPT NOMINATION BUTTON]

This nomination expires [date].
```

### 3. `nominator_friend_entered`
```
Subject: [Nominee] accepted your nomination! 🎉

Great news! [Nominee] just entered Most Eligible [City].

They're now competing for the title (and the $[prize] prize pool).

Want to help them win? Share their profile:
[SHARE LINK]
```

### 4. `approval_email`
```
Subject: You're officially in! 🏆

[Name], welcome to Most Eligible [City] [Season]!

You're now a contestant competing for:
• The title of Most Eligible [City]
• A share of the $[prize]+ prize pool
• Bragging rights for a year

WHAT'S NEXT:
1. Complete your profile (earn 5 bonus votes)
2. Add your social links (earn 3 bonus votes)
3. Review "How to Win" (earn 3 bonus votes)

Voting starts [date]. Start building your audience now!

[VIEW MY PROFILE BUTTON]
```

### 5. `voting_started`
```
Subject: Voting is LIVE! 🗳️

[Name], this is it!

Voting for Most Eligible [City] is now open.

Your current rank: #[X] of [Y] contestants
Votes needed to advance: ~[estimate]

REMIND YOUR SUPPORTERS:
• Everyone gets 1 FREE vote per day
• Paid votes ($1 each) count immediately
• Share your link: [profile_url]

[VIEW LEADERBOARD BUTTON]
```

---

## Immediate Implementation Priority

### Phase 1: Fix the Gaps (This Week)
1. **Show ContestantGuide to third-party nominees** - 10 min fix
2. **Send approval email** - Add to `approveNominee()` 
3. **Notify nominator when friend enters** - Use existing `nominator_notify` field

### Phase 2: Engagement Queue (Next Week)
1. Create `nominee_engagement` table
2. Create `process-engagement-queue` edge function
3. Add scheduling logic to existing functions
4. Build email templates in Resend/SendGrid

### Phase 3: Pre-Voting Engagement (Week After)
1. Unlock bonus votes during nomination phase
2. Add profile completion reminders
3. Add voting countdown sequence

---

## Metrics to Track

| Metric | Target |
|--------|--------|
| Nomination → Claim rate | > 60% |
| Claim → Approval rate | > 80% |
| Email open rate | > 40% |
| Email click rate | > 15% |
| Profile completion rate | > 90% |
| Pre-voting shares | > 50% of contestants |

---

## Config: Make It Flexible

```typescript
// Competition-level settings
interface EngagementConfig {
  // Reminders
  nomination_reminder_hours: number[]; // [48, 120] = 48h and 5d
  
  // Notifications
  notify_nominator_on_claim: boolean;
  notify_nominator_on_no_response: boolean;
  no_response_days: number; // 7
  
  // Pre-voting
  voting_countdown_days: number[]; // [3, 1]
  
  // During voting
  send_daily_reminders: boolean;
  at_risk_threshold_percentile: number; // 0.75 = warn bottom 25%
}
```

Store in `competitions.engagement_config` (JSONB) with sensible defaults.

# EliteRank Database Schema

Consolidated from 44 individual migrations into a single baseline schema.

## Quick Start

### Fresh Database Setup

```bash
# 1. Reset the database (WARNING: destroys all data)
supabase db reset

# 2. Apply the consolidated schema
psql $DATABASE_URL < migrations_new/001_consolidated_schema.sql

# 3. Apply seed data
psql $DATABASE_URL < migrations_new/002_seed_data.sql

# 4. Set up a super admin
psql $DATABASE_URL -c "SELECT set_super_admin('your-email@example.com');"
```

### Alternative: Using Supabase CLI

```bash
# Copy migrations to the main migrations folder
cp migrations_new/*.sql migrations/

# Reset and apply
supabase db reset
```

---

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ORGANIZATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐     ┌─────────────────┐     ┌────────────────┐   │
│  │  organizations   │     │     cities      │     │   categories   │   │
│  │   (Most Eligible)│     │   (Chicago, etc)│     │(Dating, Fitness)│  │
│  └────────┬─────────┘     └────────┬────────┘     └───────┬────────┘   │
│           │                        │                      │            │
│           │    ┌──────────────────┐│                      │            │
│           │    │   demographics   ││                      │            │
│           │    │ (Open, Women 21+)││                      │            │
│           │    └────────┬─────────┘│                      │            │
│           │             │          │                      │            │
│           └─────────────┼──────────┼──────────────────────┘            │
│                         │          │                                    │
│                         ▼          ▼                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                          COMPETITION LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌───────────────────────┐                           │
│                    │     competitions      │                           │
│                    │  (Chicago 2026, etc)  │                           │
│                    └───────────┬───────────┘                           │
│                                │                                        │
│          ┌─────────┬───────────┼───────────┬─────────┐                 │
│          ▼         ▼           ▼           ▼         ▼                 │
│  ┌───────────┐ ┌───────────┐ ┌─────────┐ ┌───────┐ ┌───────────────┐  │
│  │  events   │ │announcements│ │sponsors│ │judges │ │voting_rounds  │  │
│  └───────────┘ └───────────┘ └─────────┘ └───────┘ └───────────────┘  │
│                                                                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐   │
│  │nomination_periods │  │competition_prizes │  │competition_rules │   │
│  └───────────────────┘  └───────────────────┘  └──────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           PEOPLE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐                                                     │
│  │   profiles    │ ◄── auth.users (1:1)                               │
│  │(user identity)│                                                     │
│  └───────┬───────┘                                                     │
│          │                                                              │
│          ├──────────────────────────────────────┐                      │
│          │                                      │                      │
│          ▼                                      ▼                      │
│  ┌───────────────┐     approve          ┌───────────────┐             │
│  │   nominees    │ ─────────────────►   │  contestants  │             │
│  │ (pending)     │                      │  (approved)   │             │
│  └───────────────┘                      └───────┬───────┘             │
│                                                 │                      │
│                                                 ▼                      │
│                                         ┌───────────────┐             │
│                                         │    votes      │             │
│                                         └───────────────┘             │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                          REWARDS LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐                                                     │
│  │    rewards    │ (affiliate products)                                │
│  └───────┬───────┘                                                     │
│          │                                                              │
│          ├─────────────────────────────────────────────┐               │
│          ▼                                             ▼               │
│  ┌─────────────────────────┐       ┌───────────────────────────────┐  │
│  │   reward_assignments    │       │reward_competition_assignments │  │
│  │(assigned to contestants)│       │  (visible to all in comp)     │  │
│  └─────────────────────────┘       └───────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         ENGAGEMENT LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ competition_activity  │  │  notifications   │  │ ai_post_events │  │
│  │   (live feed)         │  │   (bell icon)    │  │(AI announcement)│ │
│  └───────────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                         │
│  ┌───────────────────────┐  ┌──────────────────┐                      │
│  │ interest_submissions  │  │   app_settings   │                      │
│  │(hosting/sponsor forms)│  │  (global config) │                      │
│  └───────────────────────┘  └──────────────────┘                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Tables

### Core User Data

| Table | Description |
|-------|-------------|
| `profiles` | User identity & lifetime stats. Linked 1:1 with `auth.users`. |
| `contestants` | User's participation in a specific competition. |
| `nominees` | Pending nominations before approval. |
| `votes` | Individual vote records. |

### Competition Structure

| Table | Description |
|-------|-------------|
| `organizations` | Organizations running competitions (e.g., "Most Eligible"). |
| `cities` | Cities where competitions are held. |
| `categories` | Competition categories (Dating, Business, etc.). |
| `demographics` | Audience segments (Open, Women 21-39, etc.). |
| `competitions` | Individual competition instances. |

### Competition Configuration

| Table | Description |
|-------|-------------|
| `voting_rounds` | Multiple voting rounds per competition. |
| `nomination_periods` | Multiple nomination periods per competition. |
| `competition_prizes` | Prizes for winners. |
| `competition_rules` | Rules organized by section. |

### Rewards System

| Table | Description |
|-------|-------------|
| `rewards` | Affiliate products/rewards. |
| `reward_assignments` | Links rewards to contestants/nominees. |
| `reward_competition_assignments` | Links rewards to competitions for visibility. |

### Engagement

| Table | Description |
|-------|-------------|
| `notifications` | In-app notification system. |
| `competition_activity` | Real-time activity feed. |
| `announcements` | Competition announcements. |
| `events` | Competition events. |

---

## RLS Policy Summary

| Table | Public Read | Authenticated Write | Admin Override |
|-------|-------------|---------------------|----------------|
| `profiles` | ✅ All | ✅ Own only | ✅ Super admin |
| `organizations` | ✅ All | ✅ All (open) | ✅ Super admin |
| `cities` | ✅ All | ✅ All (open) | ✅ Super admin |
| `competitions` | ✅ All | ✅ Host only | ✅ Super admin |
| `contestants` | ✅ All | ✅ Own / Host | ✅ Super admin |
| `nominees` | ✅ Authenticated | ✅ Self-claim / Host | ✅ Super admin |
| `votes` | ❌ Own only | ✅ Own only | ✅ Super admin / Host (select) |
| `rewards` | ✅ Active only | ❌ | ✅ Super admin |
| `notifications` | ❌ Own only | ✅ Own only | ❌ |
| `app_settings` | ✅ All | ❌ | ✅ Super admin |

---

## Key Functions

### Admin Functions

```sql
-- Make a user super admin
SELECT set_super_admin('user@email.com');

-- Remove super admin
SELECT remove_super_admin('user@email.com');
```

### Vote Functions

```sql
-- Check if user voted today (free vote)
SELECT has_voted_today(user_id, competition_id);

-- Increment votes atomically
SELECT increment_contestant_votes(contestant_id, vote_count);
```

### Profile Stats

```sql
-- Update profile stats after competition
SELECT increment_profile_votes(user_id, votes);
SELECT increment_profile_competitions(user_id);
SELECT record_profile_win(user_id, placement);
```

### Activity Logging

```sql
-- Log activity to the competition feed
SELECT log_competition_activity(
  competition_id, 
  'vote',           -- activity_type
  'Jane received 5 votes',  -- message
  contestant_id,    -- optional
  '{"vote_count": 5}'::jsonb  -- optional metadata
);
```

### Bulk Notifications

```sql
-- Send notification to all contestants in a competition
SELECT create_competition_notification(
  competition_id,
  'event_posted',   -- type
  'New Event!',     -- title
  'Check out the upcoming mixer event',  -- body
  '/events/123'     -- action_url (optional)
);
```

---

## Triggers

| Trigger | Table | Description |
|---------|-------|-------------|
| `on_auth_user_created` | `auth.users` | Auto-creates profile on signup |
| `on_vote_insert` | `votes` | Updates contestant & competition vote counts |
| `trigger_vote_activity` | `votes` | Logs activity to competition feed |
| `trigger_vote_notification` | `votes` | Sends notification to contestant |
| `trigger_rank_change_notification` | `contestants` | Notifies when rank changes |
| `trigger_reward_assigned_notification` | `reward_assignments` | Notifies when reward assigned |
| `on_competition_change` | `competitions` | Updates organization stats |

---

## Status Enums

### Competition Status
- `draft` - Being set up
- `publish` - Published, accepting nominations
- `live` - Voting in progress
- `completed` - Finals complete
- `archive` - Archived

### Contestant Status
- `active` - Currently competing
- `eliminated` - Eliminated from competition
- `winner` - Competition winner

### Nominee Status
- `pending` - Awaiting review
- `approved` - Approved as contestant
- `rejected` - Rejected
- `expired` - Expired without action

### Reward Assignment Status
- `pending` - Assigned but not claimed
- `claimed` - Claimed by contestant
- `shipped` - Product shipped
- `active` - Promotion active
- `completed` - All requirements met
- `expired` - Claim period expired

---

## Realtime Subscriptions

The following tables are published to Supabase Realtime:

- `contestants` - For live leaderboard updates
- `notifications` - For notification bell

```javascript
// Example: Subscribe to contestant updates
supabase
  .channel('contestants')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'contestants',
    filter: `competition_id=eq.${competitionId}`
  }, (payload) => {
    console.log('Contestant changed:', payload);
  })
  .subscribe();
```

---

## Storage Buckets

| Bucket | Description | Public |
|--------|-------------|--------|
| `avatars` | Profile and contestant photos | ✅ Yes |

---

## Migration History

This consolidated schema replaces 44 individual migrations:

1. `001_initial_schema.sql` - Core tables
2. `002_rls_policies.sql` - RLS policies
3. `003_seed_data.sql` - Seed data
4. `004_super_admin.sql` - Super admin functions
5. ... (40 more)
44. `20260218_profiles_shipping_address.sql` - Shipping address

The consolidated schema is the authoritative source. Individual migrations are kept for historical reference only.

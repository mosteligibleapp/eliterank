# EliteRank Supabase Setup

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)

### 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 3. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Migrations

In your Supabase dashboard, go to **SQL Editor** and run each migration file in order:

1. `001_initial_schema.sql` - Core tables (profiles, competitions, contestants, etc.)
2. `002_rls_policies.sql` - Row-level security policies
3. `003_seed_data.sql` - Demo data (optional)
4. `004_super_admin.sql` - Super admin role
5. `005_organizations.sql` - Organizations table

Or use the Supabase CLI:
```bash
supabase db push
```

### 5. Start the App

```bash
npm run dev
```

## Database Schema

```
organizations (NEW)
├── competitions
│   ├── contestants
│   ├── nominees
│   ├── votes
│   ├── judges
│   ├── sponsors
│   ├── events
│   └── announcements
└── profiles (users)
```

## Key Tables

| Table | Description |
|-------|-------------|
| `profiles` | User accounts (linked to Supabase Auth) |
| `organizations` | Competition brands (Most Eligible, etc.) |
| `competitions` | City competitions within organizations |
| `contestants` | Approved contestants in competitions |
| `nominees` | Pending nominations awaiting approval |
| `votes` | Vote transactions with payment info |
| `judges` | Competition judges panel |
| `sponsors` | Platinum/Gold/Silver sponsors |
| `events` | Competition events calendar |
| `announcements` | Community announcements |

## User Roles

Roles are determined by context, not a static field:

- **Host**: Created a competition (`competitions.host_id`)
- **Contestant**: Approved in a competition (`contestants.user_id`)
- **Nominee**: Pending nomination (`nominees.user_id`)
- **Fan**: Has voted (`votes.voter_id`)
- **Super Admin**: Has `is_super_admin` flag in profile

## Real-time Subscriptions

The app uses real-time subscriptions for:
- Live vote counts
- Leaderboard updates
- Activity feed

Enable these in your Supabase project under **Database > Replication**.

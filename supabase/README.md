# Supabase Setup for EliteRank

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready

### 2. Run Migrations

In the Supabase Dashboard, go to **SQL Editor** and run each migration file in order:

1. `001_initial_schema.sql` - Creates all tables, indexes, and triggers
2. `002_rls_policies.sql` - Sets up Row Level Security policies
3. `003_seed_data.sql` - Adds initial organization data
4. `004_super_admin.sql` - Sets up super admin functions and policies

### 3. Configure Environment Variables

Get your credentials from **Settings > API** in the Supabase Dashboard:

- **Project URL**: `https://your-project-id.supabase.co`
- **Anon/Public Key**: `eyJ...` (the public anon key)

#### For Local Development

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### For Vercel Deployment

Add these environment variables in Vercel:

1. Go to your project in Vercel
2. Navigate to **Settings > Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### 4. Enable Authentication

In Supabase Dashboard:

1. Go to **Authentication > Providers**
2. Enable Email provider (enabled by default)
3. Optionally enable OAuth providers (Google, etc.)

### 5. Set Up a Super Admin

After a user signs up, make them a super admin:

```sql
SELECT set_super_admin('user@email.com');
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (auto-created on signup) |
| `organizations` | Competition franchises (Most Eligible, etc.) |
| `competitions` | City competitions |
| `contestants` | Approved contestants in competitions |
| `nominees` | Pending/awaiting nominations |
| `votes` | Vote records |
| `judges` | Competition judges |
| `sponsors` | Competition sponsors |
| `events` | Competition events/schedule |
| `announcements` | Competition announcements |

### User Roles

Roles are determined by context, not stored explicitly:

- **Host**: User who created a competition
- **Contestant**: User approved to compete
- **Nominee**: User who has been nominated
- **Fan**: User who has voted
- **Super Admin**: User with `is_super_admin = true`

### Helper Views

- `user_roles` - Shows all roles for each user
- `admin_dashboard_stats` - Aggregate stats for super admin dashboard

## Troubleshooting

### "Supabase not configured" warning

Make sure:
1. `.env` file exists in project root
2. Variables have `VITE_` prefix
3. Restart the dev server after changing `.env`

### RLS blocking queries

Check that:
1. User is authenticated
2. Correct policies exist for the operation
3. Super admin flag is set if needed

### Connection errors

Verify:
1. Project URL is correct
2. Anon key is valid
3. Network allows connections to Supabase

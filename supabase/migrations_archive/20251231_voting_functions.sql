-- ============================================================================
-- Voting Functions - Atomic vote count increment
-- ============================================================================

-- Function to safely increment contestant vote count (atomic operation)
create or replace function increment_contestant_votes(
  p_contestant_id uuid,
  p_vote_count int
)
returns void as $$
begin
  update contestants
  set votes = coalesce(votes, 0) + p_vote_count
  where id = p_contestant_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function increment_contestant_votes(uuid, int) to authenticated;

-- ============================================================================
-- Enable Realtime for contestants table (for live leaderboard updates)
-- ============================================================================

-- Enable realtime for contestants table if not already enabled
do $$
begin
  alter publication supabase_realtime add table contestants;
exception
  when duplicate_object then
    null; -- Table already in publication, ignore
end $$;

-- ============================================================================
-- RLS Policies for votes table (if not already set)
-- ============================================================================

-- Enable RLS on votes table if not already enabled
alter table votes enable row level security;

-- Users can view their own votes
drop policy if exists "Users can view own votes" on votes;
create policy "Users can view own votes" on votes
  for select using (auth.uid() = voter_id);

-- Users can insert votes (their own)
drop policy if exists "Users can insert votes" on votes;
create policy "Users can insert votes" on votes
  for insert with check (auth.uid() = voter_id);

-- Allow public to view vote counts (for leaderboard)
drop policy if exists "Public can view vote counts" on votes;
create policy "Public can view vote counts" on votes
  for select using (true);

-- ============================================================================
-- Profile Stats - Track competition history and aggregate stats
-- ============================================================================

-- Add stats columns to profiles table
alter table profiles add column if not exists total_votes_received int default 0;
alter table profiles add column if not exists total_competitions int default 0;
alter table profiles add column if not exists wins int default 0;
alter table profiles add column if not exists best_placement int; -- 1 = winner, 2 = runner up, etc.
alter table profiles add column if not exists username text;

-- Create unique index on username (allows nulls but enforces uniqueness for non-null values)
create unique index if not exists idx_profiles_username on profiles(username) where username is not null;

-- ============================================================================
-- RPC Functions for atomic profile stat updates
-- ============================================================================

-- Increment profile total votes received
create or replace function increment_profile_votes(p_user_id uuid, p_votes int)
returns void as $$
begin
  update profiles
  set total_votes_received = coalesce(total_votes_received, 0) + p_votes
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- Increment profile competition count
create or replace function increment_profile_competitions(p_user_id uuid)
returns void as $$
begin
  update profiles
  set total_competitions = coalesce(total_competitions, 0) + 1
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- Record a win for a profile
create or replace function record_profile_win(p_user_id uuid, p_placement int)
returns void as $$
begin
  update profiles
  set
    wins = case when p_placement = 1 then coalesce(wins, 0) + 1 else wins end,
    best_placement = case
      when best_placement is null then p_placement
      when p_placement < best_placement then p_placement
      else best_placement
    end
  where id = p_user_id;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function increment_profile_votes(uuid, int) to authenticated;
grant execute on function increment_profile_competitions(uuid) to authenticated;
grant execute on function record_profile_win(uuid, int) to authenticated;

-- ============================================================================
-- Helper function to link contestant to profile by email or instagram
-- ============================================================================

create or replace function find_profile_for_contestant(
  p_email text,
  p_instagram text
)
returns uuid as $$
declare
  found_id uuid;
begin
  -- First try to find by email
  if p_email is not null and p_email != '' then
    select id into found_id from profiles where lower(email) = lower(p_email) limit 1;
    if found_id is not null then
      return found_id;
    end if;
  end if;

  -- Then try to find by instagram
  if p_instagram is not null and p_instagram != '' then
    -- Normalize instagram handle (remove @ if present)
    select id into found_id from profiles
    where lower(replace(instagram, '@', '')) = lower(replace(p_instagram, '@', ''))
    limit 1;
    if found_id is not null then
      return found_id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql security definer;

grant execute on function find_profile_for_contestant(text, text) to authenticated;

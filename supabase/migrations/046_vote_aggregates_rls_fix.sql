-- Fix RLS for vote_aggregates table
-- The trigger function update_vote_aggregates() needs to INSERT/UPDATE
-- but only a SELECT policy existed. Using SECURITY DEFINER on the trigger
-- function so it bypasses RLS (system-level operation).

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_vote_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO vote_aggregates (contestant_id, competition_id, total_votes, votes_today, votes_this_hour, last_vote_at)
  VALUES (NEW.contestant_id, NEW.competition_id, NEW.vote_count, NEW.vote_count, NEW.vote_count, NOW())
  ON CONFLICT (contestant_id) DO UPDATE SET
    total_votes = vote_aggregates.total_votes + NEW.vote_count,
    votes_today = CASE 
      WHEN vote_aggregates.last_vote_at::date = CURRENT_DATE 
      THEN vote_aggregates.votes_today + NEW.vote_count 
      ELSE NEW.vote_count 
    END,
    votes_this_hour = CASE 
      WHEN vote_aggregates.last_vote_at >= NOW() - INTERVAL '1 hour'
      THEN vote_aggregates.votes_this_hour + NEW.vote_count 
      ELSE NEW.vote_count 
    END,
    last_vote_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_vote_aggregates ON votes;
CREATE TRIGGER trigger_vote_aggregates
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_aggregates();

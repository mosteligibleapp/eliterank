-- =============================================================================
-- Migration: get_competition_revenue() aggregate function
--
-- The host dashboard's "Total Revenue" card needs the sum of paid votes for a
-- competition. Pulling every vote row to the client and summing in JS scales
-- linearly with vote count — a competition with 50k paid votes ships 50k rows
-- on every dashboard load.
--
-- This function returns a single numeric so the network/parse cost is O(1).
-- SECURITY INVOKER keeps the existing votes RLS policies in force: hosts see
-- only their competitions, super_admins see all, everyone else gets 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_competition_revenue(p_competition_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_paid), 0)::NUMERIC
  FROM votes
  WHERE competition_id = p_competition_id
    AND payment_intent_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_competition_revenue(UUID) TO authenticated;

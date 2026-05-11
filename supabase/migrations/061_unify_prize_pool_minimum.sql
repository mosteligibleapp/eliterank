-- Unify on competitions.prize_pool_minimum (dollars, numeric).
-- The legacy minimum_prize_cents column was written by the super-admin modal
-- but never read by the public site, producing silent drift between the
-- admin-set value and the value shown on the competition page.

-- 1. Backfill prize_pool_minimum from the admin-set value where one exists.
UPDATE public.competitions
SET prize_pool_minimum = (minimum_prize_cents::numeric / 100),
    updated_at = now()
WHERE minimum_prize_cents IS NOT NULL;

-- 2. Honor the explicit "no prize pool" intent on the Toronto draft.
UPDATE public.competitions
SET prize_pool_minimum = 0,
    updated_at = now()
WHERE id = '4d246aa1-97cc-4f44-8fbb-79fba52ac1ba';

-- 3. competition_with_timing referenced minimum_prize_cents, so drop & recreate.
DROP VIEW IF EXISTS public.competition_with_timing;

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS chk_minimum_prize;

ALTER TABLE public.competitions
  DROP COLUMN IF EXISTS minimum_prize_cents;

CREATE VIEW public.competition_with_timing AS
SELECT
    id,
    host_id,
    organization_id,
    season,
    status,
    host_payout_percentage,
    created_at,
    updated_at,
    has_events,
    number_of_winners,
    selection_criteria,
    entry_type,
    rules_doc_url,
    city_id,
    description,
    name,
    winners,
    price_per_vote,
    use_price_bundler,
    allow_manual_votes,
    nomination_start,
    nomination_end,
    voting_start,
    voting_end,
    finals_date,
    prize_pool_minimum,
    about_tagline,
    about_description,
    about_traits,
    about_age_range,
    about_requirement,
    theme_primary,
    theme_voting,
    theme_resurrection,
    slug,
    total_votes,
    total_revenue,
    category_id,
    demographic_id,
    eligibility_radius_miles,
    min_contestants,
    max_contestants,
    (SELECT min(np.start_date) FROM nomination_periods np WHERE np.competition_id = c.id) AS first_nomination_start,
    (SELECT max(np.end_date)   FROM nomination_periods np WHERE np.competition_id = c.id) AS last_nomination_end,
    (SELECT min(vr.start_date) FROM voting_rounds vr     WHERE vr.competition_id = c.id AND vr.round_type::text = 'voting'::text) AS first_voting_start,
    (SELECT max(vr.end_date)   FROM voting_rounds vr     WHERE vr.competition_id = c.id AND vr.round_type::text = 'voting'::text) AS last_voting_end,
    COALESCE((SELECT min(np.start_date) FROM nomination_periods np WHERE np.competition_id = c.id), nomination_start) AS effective_nomination_start,
    COALESCE((SELECT max(np.end_date)   FROM nomination_periods np WHERE np.competition_id = c.id), nomination_end)   AS effective_nomination_end,
    COALESCE((SELECT min(vr.start_date) FROM voting_rounds vr     WHERE vr.competition_id = c.id AND vr.round_type::text = 'voting'::text), voting_start) AS effective_voting_start,
    COALESCE((SELECT max(vr.end_date)   FROM voting_rounds vr     WHERE vr.competition_id = c.id AND vr.round_type::text = 'voting'::text), voting_end)   AS effective_voting_end
FROM public.competitions c;

COMMENT ON VIEW public.competition_with_timing IS 'View that provides effective dates from periods/rounds with fallback to legacy columns';

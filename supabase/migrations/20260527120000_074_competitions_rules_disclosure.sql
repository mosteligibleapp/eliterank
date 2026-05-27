-- Add columns supporting Ontario / Competition Act §74.06 rule disclosures
-- on the public competition page (Rules accordion).
--
-- These power the generator in src/utils/generateStandardRules.js:
--   - judges_score_weight_pct: judges' weight in the final scoring (0–100).
--     When NULL, no scoring-formula bullet is shown (legacy pure-vote
--     behavior). When set, the bullet reads "X% judges' scoring and
--     (100−X)% public votes".
--   - winners_split_by_gender: when true and number_of_winners = 2, the
--     crowning bullet reads "one legally recognized as male and one
--     legally recognized as female" instead of a single count.
--   - eligibility_residency_text: full custom override for the residency
--     bullet. When set, it replaces the auto-formatted "Must live within
--     X miles of {city}{, jurisdiction}" so hosts can express richer
--     requirements (e.g. "Must be a Permanent Resident of Ontario and
--     live within 50 miles of Toronto (Temporary Residents are
--     ineligible to compete)").
--   - eligibility_radius_miles: used by the auto-formatted residency
--     bullet when eligibility_residency_text is NULL.
--   - eligibility_jurisdiction: appended to the auto-formatted residency
--     bullet when set and eligibility_residency_text is NULL.

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS judges_score_weight_pct integer
    CHECK (judges_score_weight_pct IS NULL OR (judges_score_weight_pct BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS winners_split_by_gender boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligibility_residency_text text,
  ADD COLUMN IF NOT EXISTS eligibility_radius_miles integer,
  ADD COLUMN IF NOT EXISTS eligibility_jurisdiction text;

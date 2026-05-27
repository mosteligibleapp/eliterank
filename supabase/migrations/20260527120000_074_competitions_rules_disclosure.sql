-- Add columns supporting Ontario / Competition Act §74.06 rule disclosures
-- on the public competition page (Rules accordion).
--
-- These power the generator in src/utils/generateStandardRules.js:
--   - winners_split_by_gender: when true and number_of_winners = 2, the
--     crowning bullet reads "one legally recognized as male and one
--     legally recognized as female" instead of a single count.
--   - eligibility_radius_miles: replaces the previous hardcoded 100 in
--     the eligibility "Must live within X miles of {city}" bullet.
--   - eligibility_jurisdiction: appended to the location bullet when
--     set, e.g. "within 50 miles of Toronto, Ontario, Canada".

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS winners_split_by_gender boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligibility_radius_miles integer,
  ADD COLUMN IF NOT EXISTS eligibility_jurisdiction text;

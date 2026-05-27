-- Allow hosts to override two competition-specific bullets in the
-- Rules accordion (rendered by src/utils/generateStandardRules.js):
--   - finale_event_text: appears as a bullet in Rounds & Advancement,
--     after the per-round bullets. Used to disclose the in-person
--     finale event date, attendance requirements, etc. When NULL the
--     bullet is omitted.
--   - crowning_text: full override for the "X contestants will be
--     crowned Most Eligible {city}" bullet. When NULL, the auto-
--     generated default is used (with a "(1 male and 1 female)" form
--     when winners_split_by_gender = true and number_of_winners = 2).

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS finale_event_text text,
  ADD COLUMN IF NOT EXISTS crowning_text text;

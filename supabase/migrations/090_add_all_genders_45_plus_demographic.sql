-- Add "All Genders 45+" demographic option
-- Adds a new demographic for all genders aged 45 and over (open-ended upper bound)

INSERT INTO demographics (label, slug, gender, age_min, age_max, active)
VALUES ('All Genders 45+', 'all-genders-45-plus', NULL, 45, NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;

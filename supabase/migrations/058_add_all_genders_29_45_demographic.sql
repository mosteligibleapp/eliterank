-- Add "All Genders 29-45" demographic option
INSERT INTO public.demographics (label, slug, gender, age_min, age_max, active)
VALUES ('All Genders 29-45', 'all-genders-29-45', NULL, 29, 45, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Make minimum_prize_cents optional on competitions
-- Super admins can set a minimum prize but are not required to.
ALTER TABLE public.competitions
  ALTER COLUMN minimum_prize_cents DROP NOT NULL,
  ALTER COLUMN minimum_prize_cents DROP DEFAULT;

-- Remove overly strict minimum prize constraint
-- Legacy/past competitions don't need a minimum prize
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS chk_minimum_prize;

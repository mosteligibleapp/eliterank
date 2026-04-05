-- Add headline field to profiles (short tagline like "DePaul graduate, accountant, Chicago native")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline TEXT;

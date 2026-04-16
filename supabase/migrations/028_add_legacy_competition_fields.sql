-- Add is_legacy flag and legacy_winners JSONB to competitions table
-- Legacy competitions represent past competitions hosted outside EliteRank
-- legacy_winners stores an array of winner objects: [{name, imageUrl, rank}]
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS legacy_winners JSONB DEFAULT '[]';

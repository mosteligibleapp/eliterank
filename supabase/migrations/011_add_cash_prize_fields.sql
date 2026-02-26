-- Add cash prize fields to competitions table
-- Allows hosts to indicate if there is a cash prize, who sponsors it, and the amount

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS has_cash_prize BOOLEAN DEFAULT FALSE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS cash_prize_sponsor TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS cash_prize_amount NUMERIC;

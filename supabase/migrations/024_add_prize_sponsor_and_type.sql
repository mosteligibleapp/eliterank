-- Add sponsor_name and prize_type columns to competition_prizes
-- sponsor_name: Brand/sponsor attribution displayed on prize cards
-- prize_type: Categorizes prizes as 'winner' (default) or 'contestant'

ALTER TABLE competition_prizes
  ADD COLUMN IF NOT EXISTS sponsor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS prize_type VARCHAR(50) DEFAULT 'winner';

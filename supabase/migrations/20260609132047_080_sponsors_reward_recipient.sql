-- Persist the SponsorWizardModal's reward-recipient choice on the sponsor row.
--
-- The wizard collects who a sponsor's prizes go to (winners only / top X
-- contestants / all contestants) plus the "X" count. Until now those were
-- dropped on save: recipient was collapsed into competition_prizes.prize_type
-- ('winner' vs 'contestant'), so the top_x vs all distinction and the count
-- were lost, and re-opening the wizard mis-inferred top_x sponsors as "all".
--
-- Recipient is a sponsor-level decision (one value per sponsor in the wizard),
-- so it lives on sponsors rather than being denormalized across prize rows.
-- prize_type stays as-is — the public Rewards section still splits on it.

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS reward_recipient VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reward_top_x_count INTEGER;

ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_reward_recipient_check;
ALTER TABLE sponsors
  ADD CONSTRAINT sponsors_reward_recipient_check
  CHECK (reward_recipient IS NULL OR reward_recipient IN ('winners', 'top_x', 'all'));

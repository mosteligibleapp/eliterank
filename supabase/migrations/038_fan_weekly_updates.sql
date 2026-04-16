-- Opt-in flag for the weekly fan digest email.
-- Defaults to true so becoming a fan automatically subscribes you; users can
-- turn it off later from notification preferences.
ALTER TABLE contestant_fans
  ADD COLUMN IF NOT EXISTS email_weekly_updates BOOLEAN NOT NULL DEFAULT true;

-- Let users update their own row so they can toggle the preference.
CREATE POLICY "Users can update their own fan records"
  ON contestant_fans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

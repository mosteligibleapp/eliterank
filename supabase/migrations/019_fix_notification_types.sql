-- Add missing notification types: nominee_accepted, nominee_declined
-- These are used by the notify-nominator edge function when a nominee
-- accepts or declines their nomination.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type CHECK (type IN (
  'nominated', 'nomination_approved', 'nominee_accepted', 'nominee_declined',
  'new_reward', 'prize_package',
  'rank_change', 'vote_received', 'event_posted', 'system_announcement'
));

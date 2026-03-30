-- Add video_prompt and video_response notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type CHECK (type = ANY (ARRAY[
  'nominated', 'nomination_approved', 'nominee_accepted', 'nominee_declined',
  'new_reward', 'prize_package', 'rank_change', 'vote_received',
  'event_posted', 'system_announcement', 'new_fan',
  'video_prompt', 'video_response'
]));

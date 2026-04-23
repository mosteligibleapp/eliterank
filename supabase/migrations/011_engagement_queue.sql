-- =============================================================================
-- ENGAGEMENT QUEUE SYSTEM
-- Automated email scheduling for nominee/contestant lifecycle
-- =============================================================================

-- Engagement types for the lifecycle
CREATE TYPE engagement_type AS ENUM (
  -- Nomination phase
  'nomination_sent',
  'nomination_reminder_48h',
  'nomination_reminder_5d',
  'nominator_no_response',
  'nominator_friend_entered',
  
  -- Approval phase
  'approval_email',
  'profile_incomplete_reminder',
  'share_reminder',
  
  -- Pre-voting phase
  'voting_countdown_3d',
  'voting_countdown_1d',
  
  -- Voting phase
  'voting_started',
  'first_vote',
  'rank_milestone',
  'at_risk_warning',
  'round_ending_24h'
);

-- Channel type (email, sms, or both)
CREATE TYPE engagement_channel AS ENUM ('email', 'sms', 'both');

-- Main engagement queue table
CREATE TABLE engagement_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References (at least one should be set)
  nominee_id UUID REFERENCES nominees(id) ON DELETE CASCADE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  
  -- Engagement details
  engagement_type engagement_type NOT NULL,
  channel engagement_channel NOT NULL DEFAULT 'email',
  email_to TEXT,
  phone_to TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  -- Tracking (updated by provider webhooks)
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,  -- For SMS delivery confirmation
  
  -- Template data for rendering
  template_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Error tracking
  last_error TEXT,
  retry_count INT DEFAULT 0,
  
  -- Provider message IDs (for tracking)
  email_message_id TEXT,
  sms_message_sid TEXT,
  
  CONSTRAINT engagement_has_target CHECK (
    nominee_id IS NOT NULL OR contestant_id IS NOT NULL
  ),
  CONSTRAINT engagement_has_recipient CHECK (
    email_to IS NOT NULL OR phone_to IS NOT NULL
  )
);

-- Index for the cron job to find pending emails efficiently
CREATE INDEX idx_engagement_pending 
  ON engagement_queue(scheduled_for) 
  WHERE sent_at IS NULL AND (bounced_at IS NULL);

-- Index for looking up engagement by nominee/contestant
CREATE INDEX idx_engagement_nominee ON engagement_queue(nominee_id) WHERE nominee_id IS NOT NULL;
CREATE INDEX idx_engagement_contestant ON engagement_queue(contestant_id) WHERE contestant_id IS NOT NULL;
CREATE INDEX idx_engagement_competition ON engagement_queue(competition_id);

-- Index for analytics
CREATE INDEX idx_engagement_type_sent ON engagement_queue(engagement_type, sent_at) WHERE sent_at IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER engagement_queue_updated_at
  BEFORE UPDATE ON engagement_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Cancel pending engagement emails for a nominee (called when they claim)
CREATE OR REPLACE FUNCTION cancel_pending_nominee_emails(p_nominee_id UUID, p_types engagement_type[])
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM engagement_queue
  WHERE nominee_id = p_nominee_id
    AND engagement_type = ANY(p_types)
    AND sent_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule an engagement email
CREATE OR REPLACE FUNCTION schedule_engagement(
  p_nominee_id UUID,
  p_contestant_id UUID,
  p_competition_id UUID,
  p_type engagement_type,
  p_email_to TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_template_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO engagement_queue (
    nominee_id,
    contestant_id,
    competition_id,
    engagement_type,
    email_to,
    scheduled_for,
    template_data
  ) VALUES (
    p_nominee_id,
    p_contestant_id,
    p_competition_id,
    p_type,
    p_email_to,
    p_scheduled_for,
    p_template_data
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE engagement_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for edge functions)
CREATE POLICY engagement_queue_service_all ON engagement_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Super admins can view all engagement
CREATE POLICY engagement_queue_admin_select ON engagement_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_super_admin = true
    )
  );

-- =============================================================================
-- ENGAGEMENT CONFIG (per-competition settings)
-- =============================================================================

-- Add engagement config to competitions table
ALTER TABLE competitions 
ADD COLUMN IF NOT EXISTS engagement_config JSONB DEFAULT '{
  "nomination_reminder_hours": [48, 120],
  "notify_nominator_on_claim": true,
  "notify_nominator_on_no_response": true,
  "no_response_days": 7,
  "voting_countdown_days": [3, 1],
  "send_approval_email": true,
  "send_voting_started_email": true
}'::jsonb;

COMMENT ON COLUMN competitions.engagement_config IS 'Configuration for automated engagement emails';

-- =============================================================================
-- SMS CONSENT TRACKING
-- =============================================================================

-- Add SMS consent to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.sms_consent IS 'User has explicitly opted in to receive SMS notifications';
COMMENT ON COLUMN profiles.sms_consent_at IS 'Timestamp when user provided SMS consent';

-- Add SMS consent to nominees (for when they register)
ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN nominees.sms_consent IS 'Nominee opted in to SMS during registration';
COMMENT ON COLUMN nominees.sms_consent_at IS 'Timestamp when nominee provided SMS consent';

-- =============================================================================
-- CRON SCHEDULE (requires pg_cron extension)
-- Run this manually in Supabase SQL Editor if pg_cron is enabled
-- =============================================================================

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule engagement queue processing every hour
-- SELECT cron.schedule(
--   'process-engagement-queue-hourly',
--   '0 * * * *',  -- Every hour at minute 0
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/process-engagement-queue',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

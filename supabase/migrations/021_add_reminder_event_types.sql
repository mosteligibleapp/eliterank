-- =============================================================================
-- MIGRATION: Add reminder event types to ai_post_events
-- Date: 2026-03-15
-- Description: Extends the event_type CHECK constraint to support day-before
--   reminder events for voting rounds, events, and finals.
-- =============================================================================

-- Drop and recreate the CHECK constraint with new types
ALTER TABLE ai_post_events DROP CONSTRAINT IF EXISTS ai_post_events_event_type_check;

ALTER TABLE ai_post_events ADD CONSTRAINT ai_post_events_event_type_check
  CHECK (event_type IN (
    -- Existing event types (when-it-happens)
    'competition_launched', 'nominations_open', 'nominations_close',
    'voting_open', 'voting_close', 'results_announced',
    -- Day-before reminder types
    'voting_starts_reminder', 'voting_ends_reminder',
    'event_reminder', 'finals_reminder'
  ));

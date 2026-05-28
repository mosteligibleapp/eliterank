-- =============================================================================
-- Drop ai_post_events
-- -----------------------------------------------------------------------------
-- The event-triggered AI announcement feature has been removed. The
-- check-competition-events function no longer creates announcements on
-- phase transitions; it only emails competition_subscribers when
-- nominations open. That blast is dedup'd via subscriber_blast_events.
-- =============================================================================

DROP TABLE IF EXISTS ai_post_events CASCADE;

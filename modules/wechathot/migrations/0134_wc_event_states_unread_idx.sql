-- Unread counts scan only rows that still need attention.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_states_unread_idx
  ON wc_event_states (story_id) WHERE read_at IS NULL;

-- Default event ordering uses the latest evidence time, then story id for a stable page boundary.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_latest_idx
  ON wc_event_meta (latest_at DESC NULLS LAST, story_id DESC);

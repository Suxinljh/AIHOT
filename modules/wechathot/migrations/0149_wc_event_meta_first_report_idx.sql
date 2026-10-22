-- "Newly discovered" orders the hot list by first evidence time.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_first_report_idx
  ON wc_event_meta (first_report_at DESC NULLS LAST, story_id DESC);

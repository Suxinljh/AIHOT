-- Event-type filter; untyped projected events stay out of this index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_event_type_idx
  ON wc_event_meta (event_type) WHERE event_type IS NOT NULL;

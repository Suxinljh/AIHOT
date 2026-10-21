-- Channel-type filter on the projected event list.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_channel_types_idx
  ON wc_event_meta USING gin (channel_types);

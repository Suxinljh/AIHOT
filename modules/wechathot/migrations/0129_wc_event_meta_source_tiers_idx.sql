-- Source-tier filter on the projected event list.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_source_tiers_idx
  ON wc_event_meta USING gin (source_tiers);

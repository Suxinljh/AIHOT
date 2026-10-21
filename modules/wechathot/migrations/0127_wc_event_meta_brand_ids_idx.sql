-- Brand filter on the projected event list.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_brand_ids_idx
  ON wc_event_meta USING gin (brand_ids);

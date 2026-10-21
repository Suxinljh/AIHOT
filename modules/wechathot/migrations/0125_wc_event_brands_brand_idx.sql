-- Brand detail lists related events; the primary key already covers story_id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_brands_brand_idx
  ON wc_event_brands (brand_id);

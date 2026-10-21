-- Brand lists and the event filter both use the fixed industry keys.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_brands_industries_idx
  ON wc_brands USING gin (industries);

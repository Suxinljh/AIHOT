-- The brand library filters by verification state.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_brands_verified_idx
  ON wc_brands (verified_status);

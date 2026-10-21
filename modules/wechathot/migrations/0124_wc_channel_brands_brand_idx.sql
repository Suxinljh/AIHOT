-- The composite primary key starts with channel_id, so brand detail needs the reverse direction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_channel_brands_brand_idx
  ON wc_channel_brands (brand_id);

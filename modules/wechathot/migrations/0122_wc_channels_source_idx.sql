-- Reverse lookup from a collector source to the channel that exposes it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_channels_source_idx
  ON wc_channels (source_id) WHERE source_id IS NOT NULL;

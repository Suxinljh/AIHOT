-- The alert center can also be filtered by alert kind.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_alerts_kind_idx
  ON wc_alerts (kind, created_at DESC);

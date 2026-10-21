-- The alert center lists unread and recent alerts together.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_alerts_status_idx
  ON wc_alerts (status, created_at DESC);

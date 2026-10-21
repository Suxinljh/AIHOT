-- The pitch board reads columns by status and orders each column by recent activity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_topics_status_idx
  ON wc_topics (status, updated_at DESC);

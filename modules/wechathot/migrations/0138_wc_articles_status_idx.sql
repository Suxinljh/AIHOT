-- The article list filters by status and orders by the last edit.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_articles_status_idx
  ON wc_articles (status, updated_at DESC);

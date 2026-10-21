-- Draft lists group articles by their pitch; deleting a pitch clears this link and the index skips it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_articles_topic_idx
  ON wc_articles (topic_id) WHERE topic_id IS NOT NULL;

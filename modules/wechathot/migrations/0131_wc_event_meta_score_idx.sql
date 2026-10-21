-- Editorial-score ranking, including events that have not been scored yet at the end.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_score_idx
  ON wc_event_meta (editorial_score DESC NULLS LAST, story_id DESC);

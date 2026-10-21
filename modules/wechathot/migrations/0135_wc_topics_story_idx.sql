-- New-pitch flow checks whether the event already has pitches.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_topics_story_idx
  ON wc_topics (story_id);

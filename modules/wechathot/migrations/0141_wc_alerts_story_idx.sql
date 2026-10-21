-- Event detail looks up its alerts; source-error alerts have no story and are omitted.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_alerts_story_idx
  ON wc_alerts (story_id) WHERE story_id IS NOT NULL;

-- Heat ranking is a separate sort from editorial value.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_heat_idx
  ON wc_event_meta (heat DESC NULLS LAST, story_id DESC);

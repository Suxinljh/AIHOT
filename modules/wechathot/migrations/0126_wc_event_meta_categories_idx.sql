-- Hot-list industry tabs filter wc_event_meta.categories.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_event_meta_categories_idx
  ON wc_event_meta USING gin (categories);

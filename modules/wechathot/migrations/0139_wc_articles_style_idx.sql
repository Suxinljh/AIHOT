-- Preset deletion must not scan every draft to clear style_preset_id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_articles_style_idx
  ON wc_articles (style_preset_id) WHERE style_preset_id IS NOT NULL;

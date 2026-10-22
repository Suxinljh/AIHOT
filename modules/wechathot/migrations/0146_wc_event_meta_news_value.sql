-- News value reuses AIHOT's selection score; it is shown beside heat and the topic recommendation.
ALTER TABLE wc_event_meta ADD COLUMN news_value numeric(6, 3);

-- The calendar asks for one month at a time on both tables.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_topics_planned_for_idx ON wc_topics (planned_for) WHERE planned_for IS NOT NULL;

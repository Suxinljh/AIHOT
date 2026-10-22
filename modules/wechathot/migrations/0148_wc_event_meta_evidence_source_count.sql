-- Two independent evidence sources also qualify an event; passing mentions do not count.
ALTER TABLE wc_event_meta ADD COLUMN evidence_source_count integer NOT NULL DEFAULT 0;

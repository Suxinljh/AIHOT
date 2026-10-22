-- A collection failure has no event, so the alert names the source instead.
ALTER TABLE wc_alerts ADD COLUMN source_id text;

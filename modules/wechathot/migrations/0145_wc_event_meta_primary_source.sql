-- The event list names the event's main source; the full report list stays on the detail page.
ALTER TABLE wc_event_meta ADD COLUMN primary_source text;

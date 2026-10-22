-- At least one selected report makes an event worth an editor's attention.
ALTER TABLE wc_event_meta ADD COLUMN selected_count integer NOT NULL DEFAULT 0;

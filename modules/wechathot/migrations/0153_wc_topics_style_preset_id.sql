-- A topic may use another style preset for its own writing, without changing the preset itself.
ALTER TABLE wc_topics ADD COLUMN style_preset_id text;

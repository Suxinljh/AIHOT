-- The state of the last writing step of a draft, so the page can say "generating" or show why it failed.
ALTER TABLE wc_articles ADD COLUMN writing_state jsonb NOT NULL DEFAULT '{}';

-- A topic's writing artifacts: the candidate angles, the outline and the state of the last step.
ALTER TABLE wc_topics ADD COLUMN writing jsonb NOT NULL DEFAULT '{}';

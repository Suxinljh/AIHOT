-- A pitch is a private editorial task derived from an event. Several pitches may target the same
-- event with different angles, so story_id is indexed but not unique.
CREATE TABLE wc_topics (
  id               bigserial PRIMARY KEY,
  story_id         bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  angle            text,
  column_type      text NOT NULL DEFAULT 'news' CHECK (column_type IN ('news', 'insight')),
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'researching', 'ready', 'writing', 'done', 'ignored', 'archived')),
  notes            text,
  source_snapshot  jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

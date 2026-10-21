-- A draft article produced from a pitch. Deleting a pitch keeps its drafts as standalone articles.
CREATE TABLE wc_articles (
  id               bigserial PRIMARY KEY,
  topic_id         bigint REFERENCES wc_topics (id) ON DELETE SET NULL,
  type             text NOT NULL DEFAULT 'news' CHECK (type IN ('news', 'insight')),
  title            text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'review', 'done', 'archived')),
  mode             text NOT NULL DEFAULT 'quick' CHECK (mode IN ('quick', 'step')),
  angle            text,
  outline          jsonb NOT NULL DEFAULT '[]',
  content          jsonb NOT NULL DEFAULT '{"type": "doc", "content": []}',
  title_options    jsonb NOT NULL DEFAULT '[]',
  review           jsonb NOT NULL DEFAULT '{}',
  sources          jsonb NOT NULL DEFAULT '[]',
  format           jsonb NOT NULL DEFAULT '{}',
  style_preset_id  text REFERENCES wc_style_presets (id) ON DELETE SET NULL,
  version          integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

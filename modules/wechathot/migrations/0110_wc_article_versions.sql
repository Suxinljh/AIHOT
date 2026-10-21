-- Immutable article snapshots. The current draft lives in wc_articles; restoring copies a version
-- back and creates a new version rather than mutating this history.
CREATE TABLE wc_article_versions (
  article_id  bigint NOT NULL REFERENCES wc_articles (id) ON DELETE CASCADE,
  version     integer NOT NULL CHECK (version > 0),
  title       text NOT NULL DEFAULT '',
  content     jsonb NOT NULL DEFAULT '{"type": "doc", "content": []}',
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, version)
);

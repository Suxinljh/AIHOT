-- A channel is a platform account or page, not a collector source. source_id is optional because a
-- channel can be verified or displayed before it has a working collector.
CREATE TABLE wc_channels (
  id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  type           text NOT NULL
                   CHECK (type IN ('official_site', 'x', 'wechat', 'weibo', 'github', 'media', 'custom')),
  platform       text,
  display_name   text NOT NULL CHECK (btrim(display_name) <> ''),
  url            text NOT NULL CHECK (btrim(url) <> ''),
  provider       text CHECK (provider IN ('dajiala', 'socialdata', 'rsshub', 'github', 'rss')),
  source_id      text REFERENCES sources (id) ON DELETE SET NULL,
  verification   text NOT NULL DEFAULT 'pending'
                   CHECK (verification IN ('verified', 'user', 'pending', 'unavailable')),
  availability   text NOT NULL DEFAULT 'unknown'
                   CHECK (availability IN ('available', 'unavailable', 'unknown')),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url)
);

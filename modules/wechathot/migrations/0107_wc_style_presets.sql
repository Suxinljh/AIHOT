-- Writing and formatting presets share this table. A writing preset carries the editorial fields;
-- a formatting preset carries the style overrides in format.
CREATE TABLE wc_style_presets (
  id                     text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  kind                   text NOT NULL DEFAULT 'writing' CHECK (kind IN ('writing', 'format')),
  name                   text NOT NULL CHECK (btrim(name) <> ''),
  column_type            text CHECK (column_type IN ('news', 'insight')),
  target_reader          text,
  word_count             integer CHECK (word_count > 0),
  tone                   text,
  title_preference       text,
  forbidden_expressions  text[] NOT NULL DEFAULT '{}',
  format                 jsonb NOT NULL DEFAULT '{}',
  builtin                boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);

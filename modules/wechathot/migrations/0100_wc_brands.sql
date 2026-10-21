-- Brands are the companies, organizations or products an event is about. The id is a stable slug;
-- entity_id links to the code-owned ENTITIES entries when the brand originated there.
CREATE TABLE wc_brands (
  id               text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  entity_id        text UNIQUE,
  name             text NOT NULL CHECK (btrim(name) <> ''),
  aliases          text[] NOT NULL DEFAULT '{}',
  website          text,
  logo_url         text,
  industries       text[] NOT NULL DEFAULT '{}',
  verified_status  text NOT NULL DEFAULT 'pending'
                     CHECK (verified_status IN ('verified', 'user', 'pending', 'unavailable')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Single-user follow and alert rules. No user_id: the administrator session is the only owner.
CREATE TABLE wc_follows (
  id                bigserial PRIMARY KEY,
  target_type       text NOT NULL CHECK (target_type IN ('brand', 'channel', 'source', 'keyword')),
  target_id         text NOT NULL CHECK (btrim(target_id) <> ''),
  rule              text NOT NULL DEFAULT 'all'
                      CHECK (rule IN ('all', 'major', 'selected', 'keywords')),
  keywords          text[] NOT NULL DEFAULT '{}',
  blocked_keywords  text[] NOT NULL DEFAULT '{}',
  event_types       text[] NOT NULL DEFAULT '{}',
  notify            boolean NOT NULL DEFAULT true,
  muted_until       timestamptz,
  frequency         text NOT NULL DEFAULT 'immediate'
                      CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id)
);

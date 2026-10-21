-- In-site alerts. story_id is nullable because a collection failure has no event; dedupe_key makes
-- repeated updates for the same event or source error collapse into one row.
CREATE TABLE wc_alerts (
  id          bigserial PRIMARY KEY,
  story_id    bigint REFERENCES stories (id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('new_event', 'follow_update', 'source_error')),
  rule_id     bigint REFERENCES wc_follows (id) ON DELETE SET NULL,
  dedupe_key  text NOT NULL UNIQUE CHECK (btrim(dedupe_key) <> ''),
  status      text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'muted')),
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

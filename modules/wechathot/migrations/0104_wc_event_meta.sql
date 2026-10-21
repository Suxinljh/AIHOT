-- Workbench read model for an event. The projection task owns this row and can rebuild it from
-- stories, facts, articles and analyses without touching the public publication layer.
CREATE TABLE wc_event_meta (
  story_id             bigint PRIMARY KEY REFERENCES stories (id) ON DELETE CASCADE,
  categories           text[] NOT NULL DEFAULT '{}',
  brand_ids            text[] NOT NULL DEFAULT '{}',
  channel_types        text[] NOT NULL DEFAULT '{}',
  source_tiers         text[] NOT NULL DEFAULT '{}',
  event_type           text,
  verification_status  text NOT NULL DEFAULT 'unverified'
                         CHECK (verification_status IN ('unverified', 'confirmed', 'disputed')),
  updated              boolean NOT NULL DEFAULT false,
  first_report_at      timestamptz,
  latest_at            timestamptz,
  report_count         integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  source_count         integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  heat                 numeric(10, 3) CHECK (heat >= 0),
  editorial_score      numeric(6, 3) CHECK (editorial_score BETWEEN 0 AND 100),
  score_dims           jsonb NOT NULL DEFAULT '{}',
  score_reason         text,
  score_missing        text[] NOT NULL DEFAULT '{}',
  score_fingerprint    text,
  scored_at            timestamptz,
  projected_at         timestamptz NOT NULL DEFAULT now()
);

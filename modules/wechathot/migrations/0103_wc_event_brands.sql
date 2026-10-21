-- Normalized event-to-brand relation. wc_event_meta.brand_ids is the denormalized filter copy.
CREATE TABLE wc_event_brands (
  story_id    bigint NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  brand_id    text NOT NULL REFERENCES wc_brands (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, brand_id)
);

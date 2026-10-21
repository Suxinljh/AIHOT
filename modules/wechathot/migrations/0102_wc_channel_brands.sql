-- A media channel can cover several brands, and a brand can have several official or social channels.
CREATE TABLE wc_channel_brands (
  channel_id  text NOT NULL REFERENCES wc_channels (id) ON DELETE CASCADE,
  brand_id    text NOT NULL REFERENCES wc_brands (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, brand_id)
);

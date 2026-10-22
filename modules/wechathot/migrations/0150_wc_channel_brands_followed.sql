-- A brand follows some of its channels: the relation records which ones are watched.
ALTER TABLE wc_channel_brands ADD COLUMN followed boolean NOT NULL DEFAULT false;

-- Pausing one channel stops its updates without cancelling the brand's follow.
ALTER TABLE wc_channel_brands ADD COLUMN muted_until timestamptz;

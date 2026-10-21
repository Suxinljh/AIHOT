-- Candidate channel lists group by platform type and verification state.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_channels_type_idx
  ON wc_channels (type, verification);

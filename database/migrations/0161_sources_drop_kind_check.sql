-- The widened list replaces the original kind check; dropping a CHECK takes no table rewrite.
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;

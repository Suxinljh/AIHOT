-- Validate the widened kind list against every existing row.
ALTER TABLE sources VALIDATE CONSTRAINT sources_kind_check_v2;

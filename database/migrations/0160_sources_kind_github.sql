-- A native GitHub API source is a new kind; add the widened list without scanning the table yet.
ALTER TABLE sources ADD CONSTRAINT sources_kind_check_v2 CHECK (kind IN ('rss', 'web_list', 'json_list', 'x_search', 'mp_account', 'external', 'github')) NOT VALID;

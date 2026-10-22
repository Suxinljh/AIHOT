-- Email joins the alert delivery targets next to Feishu.
ALTER TABLE notify_targets ADD CONSTRAINT notify_targets_kind_check_v2 CHECK (kind IN ('feishu_webhook', 'feishu_chat', 'email', 'log')) NOT VALID;

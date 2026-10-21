-- A follow rule may be deleted while its alerts remain as history.
CREATE INDEX CONCURRENTLY IF NOT EXISTS wc_alerts_rule_idx
  ON wc_alerts (rule_id) WHERE rule_id IS NOT NULL;

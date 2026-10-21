-- Private read/star/ignore state for one event, plus the editor's manual decision.
CREATE TABLE wc_event_states (
  story_id         bigint PRIMARY KEY REFERENCES stories (id) ON DELETE CASCADE,
  read_at          timestamptz,
  starred_at       timestamptz,
  ignored_at       timestamptz,
  follow_up        boolean NOT NULL DEFAULT false,
  manual_decision  text CHECK (manual_decision IN ('recommend', 'ignore', 'later', 'reported')),
  decided_at       timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

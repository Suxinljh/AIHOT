-- A topic may be scheduled for a day; the calendar reads it, publishing stays manual.
ALTER TABLE wc_topics ADD COLUMN planned_for timestamptz;

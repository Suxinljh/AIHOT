-- A draft may be scheduled for a day; the calendar reads it, publishing stays manual.
ALTER TABLE wc_articles ADD COLUMN planned_for timestamptz;

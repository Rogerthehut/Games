-- Anonymous question statistics (see server/question-stats.ts and docs/DATA_COLLECTION.md): counts only, by week, topic, difficulty level and
-- age band. No parent, learner, device, address or exact time is stored, so a row can't be traced back to a child.
CREATE TABLE IF NOT EXISTS question_stats (
  week date NOT NULL,
  skill text NOT NULL,
  level smallint NOT NULL,
  band text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  right_n integer NOT NULL DEFAULT 0,
  helped integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  secs bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (week, skill, level, band)
);
--> split
CREATE TABLE IF NOT EXISTS misconception_stats (
  week date NOT NULL,
  skill text NOT NULL,
  tag text NOT NULL,
  band text NOT NULL,
  n integer NOT NULL DEFAULT 0,
  PRIMARY KEY (week, skill, tag, band)
);

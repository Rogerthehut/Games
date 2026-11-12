-- Counters for rate limits and the AI cost caps (see server/counters.ts), kept in the database so they survive a restart and are shared by
-- every copy of the server. A row counts the hits for one key in one fixed time window (the slot); expired rows are swept away. Holds counts only:
-- the key is a keyed hash of a device id, parent id or address (never the value itself), and never message text.
CREATE TABLE IF NOT EXISTS rate_counters (
  key text NOT NULL,
  slot bigint NOT NULL,
  n integer NOT NULL DEFAULT 0,
  expires_at bigint NOT NULL,
  PRIMARY KEY (key, slot)
);
--> split
CREATE INDEX IF NOT EXISTS rate_counters_expires ON rate_counters (expires_at);

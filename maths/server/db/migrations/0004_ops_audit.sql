-- A record of every time someone on the team looks up a parent's account (see docs/OPS.md). Kept even after the parent is deleted, and holds no
-- names or email addresses: only who looked, what they did, and the internal id they looked at.
CREATE TABLE IF NOT EXISTS ops_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  action text NOT NULL,
  target text NOT NULL
);
--> split
CREATE INDEX IF NOT EXISTS ops_audit_at ON ops_audit (at);

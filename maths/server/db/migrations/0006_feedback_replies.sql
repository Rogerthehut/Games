-- Replies the team has sent to parents who ticked "may reply" on their feedback (see docs/OPS.md). The reply text is kept so the thread is
-- visible; the parent's email address is never stored (it is looked up from the sign-in service when a reply is sent).
CREATE TABLE IF NOT EXISTS feedback_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  message text NOT NULL
);
--> split
CREATE INDEX IF NOT EXISTS feedback_replies_feedback ON feedback_replies (feedback_id);

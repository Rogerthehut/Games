-- Feedback sent from the Parents' area. Linked to the parent so it is deleted with the account and shown in their data download.
-- The email address is not kept here: if the parent ticks "you may reply", it is looked up from the sign-in service when needed.
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  category text NOT NULL,
  rating smallint,
  message text NOT NULL,
  may_reply boolean NOT NULL DEFAULT false,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> split
CREATE INDEX feedback_parent_created ON feedback (parent_id, created_at);

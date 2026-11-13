-- Messages sent from the public "Message us" page (see docs/OPS.md). Unlike feedback these come from people who may not be signed in, so the
-- sender's email address is kept here, only so the team can reply, and the message is deleted after 180 days (or when the team deletes it).
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL
);
--> split
CREATE INDEX IF NOT EXISTS contact_messages_created ON contact_messages (created_at);
--> split
CREATE TABLE IF NOT EXISTS contact_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  message text NOT NULL
);
--> split
CREATE INDEX IF NOT EXISTS contact_replies_contact ON contact_replies (contact_id);

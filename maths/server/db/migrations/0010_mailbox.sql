-- A mailbox for the ops page (docs/OPS.md): ticket numbers, unread marks, drafts and an outbox.
-- Ticket numbers are handed out by the app from ticket_counter (Q-1001... for conversations, F-1001... for feedback), not by a database sequence.
CREATE TABLE IF NOT EXISTS ticket_counter (
  name text PRIMARY KEY,
  n integer NOT NULL
);
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS ticket integer;
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS unread boolean NOT NULL DEFAULT true;
--> split
ALTER TABLE contact_replies ADD COLUMN IF NOT EXISTS from_email text;
--> split
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS ticket integer;
--> split
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS unread boolean NOT NULL DEFAULT true;
--> split
-- give what is already there a number, oldest first
UPDATE contact_messages SET ticket = sub.rn + 1000 FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM contact_messages) sub WHERE contact_messages.id = sub.id AND contact_messages.ticket IS NULL;
--> split
UPDATE feedback SET ticket = sub.rn + 1000 FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM feedback) sub WHERE feedback.id = sub.id AND feedback.ticket IS NULL;
--> split
INSERT INTO ticket_counter (name, n) SELECT 'contact', COALESCE(MAX(ticket), 1000) FROM contact_messages ON CONFLICT (name) DO NOTHING;
--> split
INSERT INTO ticket_counter (name, n) SELECT 'feedback', COALESCE(MAX(ticket), 1000) FROM feedback ON CONFLICT (name) DO NOTHING;
--> split
CREATE TABLE IF NOT EXISTS ops_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  conversation_id uuid REFERENCES contact_messages(id) ON DELETE CASCADE,
  to_email text,
  subject text,
  body text NOT NULL DEFAULT '',
  signature_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL
);
--> split
CREATE TABLE IF NOT EXISTS ops_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  conversation_id uuid REFERENCES contact_messages(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  html text NOT NULL,
  text_version text NOT NULL,
  in_reply_to text,
  ticket integer,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL
);

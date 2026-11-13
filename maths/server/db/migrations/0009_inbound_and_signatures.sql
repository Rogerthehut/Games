-- Email sent to hello@ arrives through Resend (see docs/OPS.md): it joins the same conversation list as the website's Message us form.
-- A conversation is a contact_messages row (the first message) plus contact_replies rows, each marked as from the team ('out') or from the sender ('in').
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'form';
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject text;
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS message_id text;
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS auth text;
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
--> split
ALTER TABLE contact_replies ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'out';
--> split
ALTER TABLE contact_replies ADD COLUMN IF NOT EXISTS message_id text;
--> split
ALTER TABLE contact_replies ADD COLUMN IF NOT EXISTS auth text;
--> split
CREATE INDEX IF NOT EXISTS contact_messages_email ON contact_messages (email, updated_at);
--> split
-- Which received emails have been handled, so a webhook delivered twice only counts once. Only the id is kept, and only for a month.
CREATE TABLE IF NOT EXISTS inbound_seen (
  email_id text PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now()
);
--> split
-- Signatures the team can add to replies (HTML, cleaned on the server before it is saved). Shared by everyone on the ops allow-list.
CREATE TABLE IF NOT EXISTS ops_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  html text NOT NULL,
  text_version text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL
);

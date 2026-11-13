-- A Trash folder for the ops mailbox: deleting moves a conversation (or a piece of feedback) here for 30 days before it is removed for good.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
--> split
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

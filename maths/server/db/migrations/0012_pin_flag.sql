-- Pin (keeps a conversation at the top of its folder) and flag (marks it for follow-up, and gathers it in the Flagged folder) in the ops mailbox.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
--> split
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;
--> split
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
--> split
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

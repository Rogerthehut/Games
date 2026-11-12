-- Parents sign in through Clerk. Children never have logins: a learner is a profile under a parent.
-- Split statements with a line containing only "--> split".
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  consent_version text,
  consented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> split
CREATE TABLE IF NOT EXISTS learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 24),
  year smallint NOT NULL CHECK (year BETWEEN 1 AND 13),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> split
CREATE INDEX IF NOT EXISTS learners_parent_idx ON learners (parent_id);
--> split
CREATE TABLE IF NOT EXISTS learner_progress (
  learner_id uuid PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Whether a parent wants the weekly progress email, and the private token that lets them unsubscribe from the email itself without
-- signing in. The email address is not kept here: it is looked up from the sign-in service when an email is sent. Off until they opt in.
CREATE TABLE IF NOT EXISTS email_prefs (
  parent_id uuid PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  weekly_digest boolean NOT NULL DEFAULT false,
  unsub_token text NOT NULL UNIQUE,
  opted_in_at timestamptz,
  last_digest_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

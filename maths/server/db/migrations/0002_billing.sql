-- Subscriptions, kept in step with Stripe by its webhooks. No card details are ever stored here: Stripe holds those.
-- Split statements with a line containing only "--> split".
CREATE TABLE subscriptions (
  parent_id uuid PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'none',
  plan text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  ever_subscribed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> split
CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

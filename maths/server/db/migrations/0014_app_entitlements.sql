-- Access bought through the App Store (reported by RevenueCat's webhook, see server/revenuecat.ts). Separate from `subscriptions`, which is Stripe's.
-- A parent has access if either says so.
CREATE TABLE IF NOT EXISTS app_entitlements (
  parent_id uuid PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  product text,
  store text,
  expires_at timestamp with time zone,
  will_renew boolean NOT NULL DEFAULT true,
  in_trial boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> split
CREATE TABLE IF NOT EXISTS revenuecat_events (
  id text PRIMARY KEY,
  received_at timestamp with time zone NOT NULL DEFAULT now()
);

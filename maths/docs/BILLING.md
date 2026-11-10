# Payments (Stripe)

One subscription per parent account, covering every learner on it. Monthly or yearly, with a free trial that needs a card up front.
Stripe hosts the payment page and the billing page. quarter never sees card details.

## How it works

1. A signed-in parent with no subscription lands on the **paywall** (after agreeing to the terms) and picks a plan.
2. The server creates a Stripe Checkout session and sends them to Stripe. The trial applies only the first time (`ever_subscribed`).
3. Stripe tells our webhook (`POST /api/stripe/webhook`) about every subscription change. We store the status in `subscriptions`.
4. Access is on for `active`, `trialing` and `past_due` (Stripe is still retrying). Everything else shows the paywall.
5. **Parents' area → Settings → Subscription** opens Stripe's customer portal to change plan, update the card, see invoices or cancel.

Without a subscription the server refuses to add learners or save progress (HTTP 402). Reading, downloading and deleting data always work.
Deleting an account deletes the Stripe customer (which cancels the subscription) first. If that fails, nothing is deleted.

## Set up in Stripe (test mode first)

1. **Products**: create one product, "quarter", with two recurring prices in GBP: monthly and yearly. Copy the two price ids (`price_...`).
   The trial is set by the app (`TRIAL_DAYS`), not on the price.
2. **Webhook**: Developers → Webhooks → add endpoint `https://yourquarter.co.uk/api/stripe/webhook`, events
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret (`whsec_...`).
3. **Customer portal**: Settings → Billing → Customer portal → set it up (allow cancelling, switching plan and updating the payment method) and save.
   Checkout and the portal will not work until it is saved.
4. **Branding and legal**: Settings → Branding (logo, colours), and your public business details, support email (`hello@yourquarter.co.uk`) and terms and privacy links.
5. **Tax**: decide with your accountant whether prices include VAT. Turn on Stripe Tax if you want it calculated.
6. **Emails**: turn on Stripe's receipts and its trial-ending reminder emails (Settings → Billing → Subscriptions and emails).

## Secrets (Replit → Secrets)

| Name | What |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` for testing, then `sk_live_...` (or a restricted key) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the webhook endpoint |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | the two price ids |
| `TRIAL_DAYS` | optional, default 7 |
| `APP_URL` | `https://yourquarter.co.uk` |

Test with Stripe's test card `4242 4242 4242 4242`. To test webhooks locally: `stripe listen --forward-to localhost:5000/api/stripe/webhook`.
Switching from test to live means changing the key, the two price ids and the webhook secret together.

If `STRIPE_SECRET_KEY` is not set there is **no paywall**: everyone with an account has full access. `BILLING_FAKE=1` (not in production)
pretends to take payment, for development.

## Before launch

- UK consumer rules for subscriptions and free trials (clear pricing, easy cancellation, the 14-day cancellation right for digital services,
  reminders before a trial turns into a charge) should be checked by someone qualified. The wording in the terms and on the paywall is a draft.
- Decide the prices and whether to offer a refund policy.

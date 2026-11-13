# Configuration reference

Every setting the app reads, in one table. On Replit, set them in **Secrets** (never in files) and republish. `.env.example` has the same list for local use. **S** = server-only secret, **B** = read at build time and shipped in the browser (safe values only), **O** = optional.

## Core and accounts

| Setting | Kind | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | S | Postgres connection. Replit sets it when you add its database. Migrations run on start. |
| `VITE_CLERK_PUBLISHABLE_KEY` | B | Turns accounts on. A production build without it shows a "not set up" page. |
| `CLERK_SECRET_KEY` | S | Lets the server verify sign-in tokens. |
| `CLERK_AUTHORIZED_PARTIES` | O | Origins whose tokens are accepted, e.g. `https://yourquarter.co.uk`. |
| `APP_URL` | O | Public address, no trailing slash. Used for Stripe return links and email links. |
| `PORT` | O | Port to listen on (Replit uses 5000). |
| `NODE_ENV`, `REPLIT_DEPLOYMENT` | auto | Production detection. Fake modes are refused in production. |

## Payments

| Setting | Kind | Meaning |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | S | With none set there is no paywall. |
| `STRIPE_WEBHOOK_SECRET` | S | Signing secret for `/api/stripe/webhook` (`whsec_…`). |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | S | Price ids (`price_…`). |
| `TRIAL_DAYS` | O | Free-trial length (default 7). |
| `REVENUECAT_WEBHOOK_AUTH` | S/O | At least 24 characters. The Authorization value RevenueCat's webhook sends; without it `/api/revenuecat/webhook` answers 404. See `MOBILE.md`. |

## AI tutor and parents' assistant

| Setting | Kind | Meaning |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | S | Turns the tutor on (Anthropic). |
| `TUTOR_PROVIDER` | O | `anthropic` or `openrouter`. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_DATA_COLLECTION`, `OPENROUTER_PROVIDER_ONLY`, `OPENROUTER_ALLOW_FALLBACKS`, `OPENROUTER_BASE_URL`, `OPENROUTER_REFERER` | S/O | OpenRouter route. Read `TUTOR.md` before changing data collection. |
| `TUTOR_MODEL`, `TUTOR_EFFORT` | O | Model and thinking effort. |
| `TUTOR_PER_DEVICE_HOUR`, `TUTOR_PER_DEVICE_DAY`, `TUTOR_PER_IP_DAY`, `TUTOR_GLOBAL_DAY` | O | Tutor rate limits and the daily cost cap. |
| `ASSISTANT_PER_PARENT_HOUR`, `ASSISTANT_PER_PARENT_DAY`, `ASSISTANT_GLOBAL_DAY` | O | Parents' assistant limits. |
| `TUTOR_ALLOWED_ORIGINS` | O | Extra allowed origins (only if the app is served elsewhere). |
| `TUTOR_FAKE`, `AUTH_FAKE`, `BILLING_FAKE`, `VITE_FAKE_AUTH` | dev | Fakes for local development. Ignored or refused in production. |
| `VITE_TUTOR_URL` | B | Tutor service address if not same-origin. |

## Human check

| Setting | Kind | Meaning |
| --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | B | Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | S | With none, the check is off. |
| `TURNSTILE_PASS_MINUTES` | O | How long a pass lasts (default 30). |

## Email

| Setting | Kind | Meaning |
| --- | --- | --- |
| `RESEND_API_KEY` | S | Sends email. Needs permission to read received email for the inbound mailbox. |
| `RESEND_RECEIVING_API_KEY` | S/O | A second Resend key used only to fetch inbound mail, so the sending key doesn't need read access. Falls back to `RESEND_API_KEY`. |
| `RESEND_WEBHOOK_SECRET` | S | Verifies inbound webhooks (`whsec_…`). |
| `MAIL_FROM` | O | Sender address (default hello@yourquarter.co.uk). |
| `MAIL_REPLY_TO` | O | Leave unset so replies come back to hello@. |
| `CRON_SECRET` | S | Shared secret for `/api/internal/digest` (weekly digest scheduler). |

## Ops portal

| Setting | Kind | Meaning |
| --- | --- | --- |
| `OPS_ADMINS` | S | Allow-list of team email addresses. Empty means the portal doesn't exist (404). |
| `OPS_SESSION_SECRET` | S | At least 32 characters. Signs ops sessions and ticket tags. Changing it signs everyone out and invalidates old ticket tags. |

## Server safety

| Setting | Kind | Meaning |
| --- | --- | --- |
| `TRUST_PROXY` | O | `1` behind Replit (already in `.replit`). Without it every visitor looks like one address. |
| `TRUSTED_PROXY_HOPS` | O | Number of proxies in front. `2` behind Cloudflare plus Replit. |
| `CSP_ENFORCE` | O | `1` switches the content policy from report-only to enforcing, after checking the live console. |
| `HSTS` | O | Force the HSTS header. |
| `COUNTER_SECRET` | O | Hashes addresses in rate-limit counters (defaults to `CLERK_SECRET_KEY`). |

## Monitoring and site

| Setting | Kind | Meaning |
| --- | --- | --- |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | O | Crash reports (EU). Nothing is sent without them. |
| `SENTRY_ENV`, `VITE_SENTRY_ENV`, `RELEASE`, `VITE_RELEASE` | O | Environment and release labels. |
| `VITE_REVIEWS_URL` | B/O | Link to the independent reviews page. |
| `SERVER_URL` | O | The server's own public address, for generated links. |
| `VITE_ALLOW_LOCAL_ONLY` | B/dev | Deliberate local-only build for audits and previews. |

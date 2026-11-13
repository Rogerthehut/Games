# HTTP API reference

All endpoints are served by the one Node process (`server/index.ts`). JSON in, JSON out, errors as `{ "error": "<code>", "message": "<plain words>" }`. Calls are authenticated with a Bearer token, never cookies, so there is no CSRF surface. Responses are `Cache-Control: no-store` unless stated. The ops routes are fully tabulated in `SECURITY.md`; here they are summarised.

## Public

| Method and path | Purpose | Protection |
| --- | --- | --- |
| `GET /api/health` | `{ ok, tutor }`: up, and whether the tutor has a key | none |
| `POST /api/contact` | Website "Message us" form | Turnstile where on; rate limits per address; fields cleaned and capped |
| `GET /api/outcode?pc=` | Postcode outcode (first half only) for school finder | rate limited; full postcodes refused |
| `POST /api/humans/verify` | Exchanges a Turnstile token for a short pass | rate limited |
| `POST /api/tutor` | Child's AI tutor message | human-check pass, per-device, per-address and global limits, screening both ways |
| `GET/POST /unsubscribe` | Weekly digest unsubscribe | long random token; GET only shows a button |
| `GET /…` | Built website files | path normalised and kept inside the app folder |

## Signed-in parent

A valid Clerk session token. Every query is scoped to that parent. Writes also need consent to the current terms (403 `consent-required`) and an active subscription (402 `subscription-required`) when billing is on. Writes are rate limited (429 `slow-down`).

| Method and path | Purpose |
| --- | --- |
| `GET /api/account` | The parent's record, learners, subscription and consent state |
| `POST /api/account/consent` | Record agreement to the current terms version |
| `GET /api/account/export` | Download the family's data (always allowed) |
| `DELETE /api/account` | Delete the account: Stripe customer first, then data, then the Clerk user |
| `GET, POST /api/account/email-prefs` | Weekly digest opt-in |
| `GET /api/account/booklet` | Curriculum booklet PDF (subscribers) |
| `POST /api/learners` | Add a learner (max 8) |
| `PUT, DELETE /api/learners/:id` | Save progress (max 400 KB, versioned; 409 on conflict) or remove a learner |
| `POST /api/billing/checkout` | Start Stripe Checkout |
| `POST /api/billing/portal` | Open Stripe's customer portal |
| `POST /api/feedback` | Send feedback (a few a day) |
| `POST /api/assistant` | Parents' AI assistant (subscribers, per-parent limits) |

## Machine callers

| Method and path | Caller | Protection |
| --- | --- | --- |
| `POST /api/stripe/webhook` | Stripe | signature verified, 1 MB limit, events de-duplicated in `stripe_events` |
| `POST /api/inbound/resend` | Resend | Svix signature (HMAC-SHA256, 5-minute tolerance), de-duplicated in `inbound_seen`, tiny body limit |
| `POST /api/internal/digest` | the scheduler | `CRON_SECRET`, constant-time compare, 404 without it |

## Ops portal (team only)

Everything under `/api/ops/` and the `/ops` page returns 404 unless the caller has parent sign-in, is on `OPS_ADMINS`, and holds an emailed-code session (`/api/ops/code`, `/api/ops/verify`). Groups: `stats`, `account` (lookup, delete), `audit`, `feedback` (+ reply), `contact` (reply, new), `mail` (list, thread, unread, trash, restore, purge, empty-trash, search, pin, flag), `drafts`, `outbox` (retry, discard), `signatures` (CRUD, preview, default). Per-admin hourly limits; every action audited without message content.

## Conventions

- Status codes: 200/201 success, 202 accepted but queued (email in the outbox), 400 bad input, 401 not signed in, 402 subscription needed, 403 consent needed, 404 not found (also used to hide the ops portal), 409 conflict or limit, 413 too large, 429 slow down, 500 plain error (details only in Sentry).
- Bodies are size-capped per route; unknown fields are ignored.
- Nothing returns another family's data, and nothing returns secrets.

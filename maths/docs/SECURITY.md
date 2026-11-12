# Security notes

What protects quarter's server, what to set, and what is still open. Reviewed 12 November 2026. This is a self-review, not a penetration test: before launch, consider having someone independent test it.

## Routes and who can use them

| Route | Who can call it | Protection |
| --- | --- | --- |
| `/api/account`, `/api/learners/...`, `/api/billing/...`, `/api/feedback`, `/api/assistant` | A signed-in parent | Clerk session token checked on the server; every query is scoped to that parent; request size limits; write rate limits; the assistant also needs the human check |
| `/api/tutor` | Anyone with a human-check pass | Cloudflare Turnstile pass, rate limits per device, per address and a daily global cap, and screening of messages and replies |
| `/api/ops/...` and `/ops` | The team only | Clerk sign-in, an allow-list of email addresses, an emailed one-time code, a one-hour signed session; anyone else gets "not found"; everything is audit-logged (`docs/OPS.md`) |
| `/api/internal/digest` | The scheduler | A shared secret (`CRON_SECRET`), compared in constant time; "not found" without it |
| `/api/stripe/webhook` | Stripe | The signature is checked; 1 MB limit |
| `/unsubscribe` | Anyone with the link | A long random token per parent; a GET only shows a button, the POST does the change |
| `/api/outcode` | Anyone | Only the first half of a postcode is accepted; rate limited |
| `/api/humans/verify` | Anyone | Rate limited; checks the Turnstile token with Cloudflare |
| `/api/health` | Anyone | Says only that the server is up and whether the tutor has a key |
| Everything else | Anyone | The built website files only, from the app folder |

## What the server does for every request

- **Nothing a request does can stop the server.** Any error becomes a plain 500, logged by name only (never request data) and sent to Sentry if it's on. (A request for a folder name such as `/assets` used to crash the whole server; fixed and tested.)
- **Files:** the address is decoded, normalised and kept inside the app folder; odd encodings, null bytes and look-alike folder names are refused (`server/http-safety.ts`, with tests).
- **Headers on every response:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, location, payment off), `Cross-Origin-Opener-Policy`, and `Strict-Transport-Security` over HTTPS.
- **Content-Security-Policy:** sent as **report-only** at first, so a missing source shows in the browser console instead of breaking sign-in. See "Switching the content policy on" below.
- **Who the caller is:** the address used for rate limits comes from the proxy's entry at the END of `X-Forwarded-For` (set `TRUSTED_PROXY_HOPS` if more than one proxy sits in front), never the first entry, which the caller can make up.
- **Origins:** cross-origin calls are refused unless the origin is listed in `TUTOR_ALLOWED_ORIGINS`.
- **Secrets:** only in Replit Secrets. Nothing secret is committed (checked), and none is logged. `npm audit` reports no known vulnerabilities in the packages the app ships.
- **Content shown on screen:** pages are built with Preact, which escapes text. The only raw HTML comes from the maths renderer (KaTeX, with its `trust` option off) and our own drawings; none of it is typed by a user.

## Switching the content policy on

1. Open the live site with the browser's developer tools console open (F12, Console).
2. Click around: sign in, sign out, the Parents' area, the tutor, a payment page.
3. Look for messages starting "Content Security Policy" or "Refused to…" (report-only shows them without blocking). Each names a source the policy didn't allow.
4. Add that source to `CSP` in `server/http-safety.ts` (the likely ones are your Clerk domain and Stripe), redeploy, and check the console is quiet.
5. Set `CSP_ENFORCE=1` in Replit Secrets. Keep the report-only version while testing any change.

## Settings to check in Replit

| Secret | Why |
| --- | --- |
| `CLERK_AUTHORIZED_PARTIES` | Set it to your live origin (for example `https://yourquarter.co.uk`), so a sign-in token from some other site is refused. It's optional in the code, so it's easy to miss |
| `TRUST_PROXY=1` | Already set in `.replit`; needed so rate limits see the real visitor |
| `TRUSTED_PROXY_HOPS` | `1` for Replit alone (the default). Set `2` if Cloudflare or another proxy sits in front too |
| `CSP_ENFORCE=1` | After the check above |
| `TURNSTILE_SECRET_KEY` | The AI endpoints are open to scripts without it |
| `CRON_SECRET`, `OPS_SESSION_SECRET` | Long random strings; never reuse one |

## Known limits (not fixed yet)

- **Rate limits now live in the database** (table `rate_counters`, `server/counters.ts`), so they survive restarts and are shared by every copy of the server, including the AI tutor's daily cost cap. If the database can't be reached they fall back to memory for that moment, so limits stay on. They use calendar hours and days (not rolling windows), so the first minutes after midnight or the top of the hour can allow a short burst.
- **No independent test.** A professional penetration test before launch is worth the money for a product used by children.
- **The AI tutor and assistant** are screened, but no screen is perfect; keep the tutor off by default (it is) and review the safety notes in `docs/TUTOR.md`.
- **Accounts:** the sign-in provider (Clerk) holds the passwords and sessions. Turn on two-step verification for your own Clerk and Resend accounts, and for the team email used for `/ops`.
- **Backups and breach plan:** see `docs/BREACH_PLAN.md`; practise restoring a database backup once.

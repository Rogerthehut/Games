# Decision log

Why things are built the way they are. Add a short entry when a significant choice is made. Newest at the bottom of each group is fine; the date is when it was decided.

## Product and content

- **Children have no logins; parents sign in.** Keeps children's data to a nickname and school year, and puts consent with the adult. (Accounts, early 2026)
- **Questions are generated from seeds, not stored.** Infinite practice, tiny storage, and any question can be recreated exactly for reports and printable papers.
- **Effort over speed.** No timers in practice; stars for finishing and bouncing back. Timed work exists only in clearly labelled papers and the times-tables challenge. (`DESIGN.md`)
- **The tutor guides and never gives the final answer, and is unavailable in tests.** A grown-up must turn it on. The model is the least-trusted layer; screening and answer-leak checks sit outside it. (`TUTOR.md`)
- **Printable papers include a working-out answer sheet and mark scheme.** Parents asked for it; fixed seeds make the sheets match.
- **Worked pictures are built from the question's own numbers and verified by tests**, so a drawing can never disagree with the answer.
- **Draft wording is flagged for teacher review** rather than shipped as authoritative (`TEACHER_REVIEW.md`).

## Platform

- **One Node process serves the site and the API on Replit Autoscale.** Simple to run and deploy for a small team; the server is bundled with esbuild so cold starts are quick.
- **Preact, not React.** Small bundle for tablets and phones; same component model.
- **Postgres with Drizzle; SQL migration files are the source of truth.** Migrations are idempotent and run at start. In tests the same SQL runs on in-memory PGlite.
- **Progress is a versioned JSON document per learner** (400 KB cap), saved with optimistic version checks. Simple, portable, and easy to export or delete; the trade-off is no server-side querying of individual answers, which also suits the privacy stance.
- **Local-first with sync.** Progress lives in the browser and syncs when signed in; signing out clears the device.
- **Rate-limit counters in the database** (hashed addresses, no content), so limits survive restarts and work across instances.
- **Clerk for sign-in, Stripe for payments, Resend for email, Sentry (EU, scrubbed, no replay) for errors.** Buy rather than build anything that holds credentials or card data. quarter never sees a card number.
- **Bearer tokens, no cookies.** Removes CSRF as a class of problem.
- **Mobile is a thin Expo shell around the website**, so there is one codebase for content and logic. In-app subscriptions are deferred to RevenueCat because Apple requires its own billing inside apps.

## Security

- **The ops portal answers 404 to anyone not fully authorised.** Four layers: parent sign-in, allow-list, emailed code, one-hour HMAC session. Everything is audited without content.
- **Subject tags like `[Q-1042-3fa9c1d2]` are signed.** A bare number could be guessed to write into someone else's conversation. Forged tags are ignored and stripped. The signing key is derived from, but separate to, the ops session secret.
- **Ticket numbers come from a counter table, not database sequences.** Replit's generated publish migration doesn't create sequences, so sequences would break deploys.
- **Inbound email is stored as plain text only**, with SPF/DKIM/DMARC results kept and shown. Automated mail, our own domain and floods are dropped.
- **Signatures are sanitised with an allow-list and previewed in a sandboxed, script-less frame.**
- **Content-Security-Policy ships report-only first**, then is enforced once the live console shows nothing blocked (`CSP_ENFORCE`).
- **Deletion is soft first for support mail (30-day Trash, 180-day retention)**, but account deletion is immediate and complete.

## Mailbox

- **A conversation is a contact message plus replies; folders are views.** One model gives Inbox, Messages, Drafts, Sent, Outbox, Trash and Flagged without duplicating data.
- **Outbox records an email in the conversation only after it has really sent**, so a failed send can be retried without a ghost entry or a double send.
- **Search runs in memory over a bounded recent window** (about 1,500 conversations plus feedback, drafts, outbox) with typo tolerance, rather than Postgres full-text. At this volume it is fast, needs no extension or index migration, and handles typos better. Revisit if the mailbox grows past that window.
- **Ticket numbers never match "nearly"** in search, so `1003` never returns `1001`.

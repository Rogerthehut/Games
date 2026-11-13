# Architecture

How quarter fits together, in one place. For the detail of any one area, follow the links to its own document. Last reviewed November 2026.

## What it is

A maths practice web app (with a few STEM and reasoning areas) for children from Year 3 to Year 13, bought by their parents. Children never have logins; a parent signs in and manages learner profiles. There is also a thin iPhone/iPad shell around the same website, and a small ops portal for the team.

## The pieces

```
                         ┌──────────────────────────── browser / Expo web view ───────────────────────────┐
                         │  Preact + TypeScript single-page app (Vite)                                    │
                         │   curriculum + question generators ─▶ engine (progress, plans, papers, reports)│
                         │   progress kept in localStorage, synced to the server when signed in           │
                         └───────────────┬────────────────────────────────────────────────────────────────┘
                                         │ HTTPS, Bearer tokens (no cookies)
                         ┌───────────────▼───────────────────────── one Node process ─────────────────────┐
  Cloudflare (optional) ─▶  server/index.ts: static files + JSON API + headers + rate limits + redirects   │
                         │   accounts · billing · tutor/assistant · contact · inbound mail · ops portal   │
                         └──┬──────────┬──────────┬───────────┬───────────┬───────────┬───────────────────┘
                            │          │          │           │           │           │
                        Postgres     Clerk      Stripe      Resend     Anthropic/    Sentry
                        (Drizzle)   (sign-in)  (payments)  (send +     OpenRouter    (errors,
                                                           receive)    (tutor)       scrubbed)
```

Everything runs as **one Node process on Replit (Autoscale)**. It serves the built app from `dist/` and the API from `dist-server/index.mjs` (bundled with esbuild so it starts fast). There is no separate front-end host.

## The front end (`src/`)

| Folder | What lives there |
| --- | --- |
| `src/curriculum/` | The skills (about 250: 202 maths, 21 reasoning, 29 STEM). Each `Skill` has an id, stage (KS2–KS5), school year, strand, prerequisites, parent notes and a deterministic `generate(rng, level)` that makes a `Question` with answer, hint, worked solution and optional figure. Also the worked-method picture builders (`worked-*.ts`). |
| `src/engine/` | Pure logic with no UI: answer checking, Leitner-box spaced repetition (`progress.ts`), lessons, the learning plan, check-ups, mock and printable papers, the 11+ pathway, refresher, times-tables challenge, learning report and topic help. Seeded random numbers (`rng.ts`) make any question reproducible from its seed. |
| `src/ui/` | Preact screens and components: Today, Skills, Plan, Me, practice and lesson screens, answer inputs, drawn figures (`figure.tsx`), the grown-ups' area, the ops page (`ops-page.tsx`), landing and contact pages. |
| `src/account/` | Sign-in (Clerk), the API client and the sync logic (debounced saving, version conflicts, offline retry). |
| `src/tutor/` | Client for the AI tutor. |
| `src/monitoring/` | Sentry set-up and the scrubber that removes anything personal. |
| `src/native/` | The bridge between the web app and the mobile shell. |
| `src/parents`, `src/blog`, `src/booklet`, `src/guides`, `src/legal`, `src/concepts` | Content: admissions data, blog posts, the curriculum booklet, user guides, legal text, concept study pages. |
| `scripts/` | Build-time page generators (`site-pages`, `parent-pages`, `concept-pages`: sitemap, llms files, "what we cover" pages), booklet and paper builders, and the Playwright end-to-end scripts. |

Key ideas:
- **Questions are generated, not stored.** The same seed always gives the same question, which is how the learning report re-creates exactly what a child got wrong, and how printable papers and answer sheets match.
- **Worked pictures** are built from the question's own numbers (`Builder = (q) => {figure, steps}`) and tests check each picture against the question's answer, so a drawing can't disagree with the maths.
- **Progress** is a versioned JSON record per learner (skill states, sessions, check-ups, plan, certificates, settings).

## The server (`server/`)

One `http` server in `server/index.ts` routes to handlers. Main areas:

| Area | Files | Notes |
| --- | --- | --- |
| Accounts and learner data | `accounts.ts`, `auth.ts`, `db/repo.ts` | Clerk token checked server-side; every query scoped to the parent; up to 8 learners, 400 KB each; optimistic versioning. See [ACCOUNTS.md](ACCOUNTS.md). |
| Billing | `billing.ts` | Stripe Checkout and customer portal; webhook updates `subscriptions`; no subscription means writes return 402. See [BILLING.md](BILLING.md). |
| AI tutor and assistant | `tutor/`, `assistant/` | Screening, a prompt that treats child text as data, answer-leak checking, layered rate limits, stores nothing. See [TUTOR.md](TUTOR.md). |
| Contact and mailbox | `contact.ts`, `inbound.ts`, `svix.ts`, `mail.ts`, `mailbox.ts`, `mail-search.ts`, `ticket.ts`, `signatures.ts`, `signature-html.ts` | Website contact form, inbound mail to hello@ via Resend webhook (signature-verified), threads with signed ticket tags, drafts, outbox with retries, trash, fuzzy search, pin/flag. See [OPS.md](OPS.md). |
| Ops portal | `ops-access.ts`, `ops-api.ts`, `ops.ts` | Parent sign-in + allow-list + emailed code + HMAC session; everything else is a 404; audit log without content. |
| Email digest | `digest.ts`, `digest-job.ts` | Opt-in weekly parent email, triggered by the scheduler with `CRON_SECRET`. |
| Safety and plumbing | `http-safety.ts`, `counters.ts`, `turnstile.ts`, `monitoring.ts`, `postcode.ts` | Path safety, rate-limit counters in the database, Cloudflare Turnstile human check, Sentry, outcode lookup. |
| Database | `db/schema.ts`, `db/migrations/*.sql`, `db/index.ts` | See below. |

### Data

Postgres through Drizzle (PGlite in memory for tests and local fake mode). The **SQL migration files are the source of truth**; `schema.ts` mirrors them for typed queries. Migrations run on start and are idempotent (`IF NOT EXISTS`).

| Group | Tables |
| --- | --- |
| Accounts | `parents`, `learners`, `learner_progress`, `email_prefs` |
| Billing | `subscriptions`, `stripe_events` |
| Support | `feedback`, `feedback_replies`, `contact_messages`, `contact_replies`, `inbound_seen`, `ticket_counter` |
| Ops | `ops_audit`, `ops_signatures`, `ops_drafts`, `ops_outbox`, `rate_counters` |

Not stored on the server: children's names, birthdays, photos, email addresses (those stay with Clerk), or the tutor's chat log.

## Request flows

- **Sign-in and sync:** browser gets a Clerk session token, sends it as a Bearer header, the server verifies it, finds or creates the `parents` row, and reads or writes the learner's JSON with a version check. A second device that saved first causes a conflict; the app takes the newer copy.
- **Purchase:** paywall → server creates a Stripe Checkout session → Stripe hosts payment → Stripe calls `/api/stripe/webhook` (signature checked) → `subscriptions` updated → the app reads the status.
- **Tutor:** child message → validation → screening → provider call (Anthropic, or OpenRouter) → reply checked for answer leaks and sanitised → returned. Nothing stored.
- **Inbound mail:** Resend calls `/api/inbound/resend` → Svix signature verified → mail fetched from Resend's receiving API → dropped if automated/own-domain/flood, otherwise filed into a conversation (matched by signed subject tag, else sender) → visible in the ops Mail tab.
- **Ops:** sign in as a parent, be on the allow-list, enter the emailed code, receive a one-hour session; every action is audited.

## Mobile (`../mobile`)

An Expo shell that loads the live website in a web view and hands a few things to the phone (print, save file, open link, haptics). Card payments are hidden inside the app pending RevenueCat. See [MOBILE.md](MOBILE.md).

## Build, run and deploy

- `npm run dev` runs Vite for the front end; `npm run server:dev` runs the server from TypeScript; `server:fake` runs with a fake tutor.
- `npm run build` type-checks, builds the app with Vite, and bundles the server with esbuild.
- Replit Autoscale runs `npm run build` then `npm run server`. See [REPLIT.md](REPLIT.md), and [CONFIGURATION.md](CONFIGURATION.md) for every setting.

## Where decisions are recorded

[DECISIONS.md](DECISIONS.md) explains why things are built the way they are. [REQUIREMENTS.md](REQUIREMENTS.md) states what the product must do and the targets it is held to. [TESTING.md](TESTING.md) covers the test suites. [API.md](API.md) lists the HTTP endpoints.

# Testing

## Layers

| Layer | Command | What it covers |
| --- | --- | --- |
| Type check | `npm run typecheck` | The app and the server (two tsconfigs). |
| Unit and integration | `npm test` (Vitest, about 1,300 tests) | Engine, curriculum, server handlers, database (in-memory Postgres), security helpers. |
| End-to-end | `npm run e2e:<name>` (Playwright scripts in `scripts/`) | Real screens in Chromium: lessons, pathway, papers, reports, grown-up controls, ops portal and mailbox, contact, tools. |
| Screen audit | `scripts/screen-audit.mjs` | Every screen at many sizes (phones to desktop) for overflow, clipping and small tap targets. |
| Content audits | `npm run audit:worked`, `npm run ks2-coverage` | Worked pictures coverage; KS2 outcome coverage. |
| Tutor evaluation | `npm run eval:tutor` | The tutor's behaviour against a scripted set (needs a key). |

## What the unit tests guarantee

- **Every generator is checked** for valid questions across levels and seeds; answers are verified by an independent route where possible.
- **Worked pictures agree with the question's answer** (`worked-skills.test.ts`, `worked-final.test.ts`).
- **Learner isolation:** one family can't read, change or delete another's data (`db/repo.test.ts`, `accounts.test.ts`).
- **Security helpers:** path safety, webhook signatures (Stripe, Svix), HTML sanitiser, ticket tag signing, rate limits, Turnstile, the tutor's leak corpus.
- **Mailbox:** threading, drafts, outbox retries and no double-send, trash, fuzzy search, pin and flag.
- **Migrations** apply cleanly and repeatedly (`migrate.test.ts`).

## Running things

```sh
cd maths
npm ci
npm test                         # all unit tests
npx vitest run server/mailbox    # one area
VITE_FAKE_AUTH=1 npx vite --port 5173 &              # app with fake sign-in for e2e
PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/explain-card-e2e.ts
npm run e2e:ops-messages         # starts its own servers (see the script header)
```

Screen audit: `VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173`, then run `scripts/screen-audit.mjs`.

## Before pushing

`npm run typecheck`, `npm test`, and the e2e scripts for the area you changed. Update `CHANGELOG.md` with every change a user or admin would notice.

## Not covered (yours to do)

Real devices (iPhone, iPad, Android), an independent penetration test, teacher review of the maths content and tutor wording, and a solicitor's review of the legal text. See `ROADMAP.md`.

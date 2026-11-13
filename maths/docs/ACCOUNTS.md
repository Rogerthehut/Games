# Accounts

Parents create an account and sign in; children never have logins. A learner is a profile under a parent. Sign-up is required: without
an account the app does not start. Sign-in is by email only (a one-time code), provided by Clerk. There is no Google or Apple sign-in.

## Settings

| Setting | Where | Meaning |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | build time | Turns accounts on in the app. Safe to ship. A production build without it shows a "not set up" page rather than running local-only. For a deliberate local-only build (audits, static previews) set `VITE_ALLOW_LOCAL_ONLY=1`. |
| `CLERK_SECRET_KEY` | server secret | Lets the server check sign-in tokens. Never in the browser. |
| `DATABASE_URL` | server secret | Postgres. Replit sets this when you add its database. Migrations run on start. |
| `CLERK_AUTHORIZED_PARTIES` | optional | Origins whose tokens are accepted, for example `https://yourapp.replit.app`. |
| `AUTH_FAKE`, `VITE_FAKE_AUTH` | development only | A fake sign-in and in-memory database. Ignored in production. |

In the Clerk dashboard: use **Email verification code** (not the link: a link opened from a mail app lands in a different browser and leaves the original tab signed out), turn off every social connection (Google, Apple), and set the app's URL as an allowed origin. The app also hides social buttons in case one is left on. Replit's secrets are available to both the build and the server; check `VITE_CLERK_PUBLISHABLE_KEY` is present at build.

## What is stored

Per parent: the Clerk user id, and which version of the privacy notice and terms they agreed to. Per learner: nickname, school year, and
the app's progress record (skills, sessions, check-up results, plan, certificates, settings), saved as versioned JSON.

Not stored on the server: real names, birthdays, photos, email addresses, or the AI tutor's chat log. The tutor log stays on the device, for
the grown-up to read there, and the server removes it if it is ever sent. A parent's email stays with Clerk.

## How it behaves

- **Consent:** a parent must agree to the current terms (`src/legal/terms-version.ts`) before anything is saved. Changing the version asks everyone to agree again.
- **Saving:** a few seconds after changes stop, one learner at a time, with the version last seen. If another device saved first, the server refuses, the app takes the newer copy and says so. No connection: it says so and retries.
- **Signing out** removes every local copy of the family's data from the device, so a shared device keeps nothing.
- **Existing local progress** (from before accounts) is offered to the parent on first sign-in and removed from the device once it is safely in the account.
- **Rights:** the grown-ups' area has "Download my family's data" and "Delete my account" (which also deletes the Clerk user).
- **Limits:** up to 3 learners per account, 400 KB per learner, and a cap on how often one parent can write.
- **Isolation:** every learner query carries the parent's id; the tests check that one family cannot read, change or delete another's.

## Tests

- `server/db/repo.test.ts`, `server/accounts.test.ts`: database and API, against in-memory Postgres with a fake sign-in.
- `src/account/*.test.ts`: the saving logic (debounce, conflicts, offline retry) and the API client.
- `scripts/accounts-e2e.mjs`: the whole journey in a browser (see the file for how to run it).

## Not done yet

- **Privacy notice, terms and cookie notice** still describe local-only storage and must be rewritten and legally reviewed before accounts go live. The consent screen wording is a draft too.
- **Clerk has not been tried live**: it needs your keys. Everything else was tested with the fake sign-in. Check the sign-in forms look right on phone, tablet and desktop, and that the Google and Apple buttons appear.
- A content security policy (Clerk needs its own domains allowed).
- Sync is "newer copy wins". A merge that keeps both devices' practice would be kinder to a child who practised offline on two devices.
- The tutor service does not yet require a signed-in parent.
- Deleting the Clerk user happens only if Clerk answers; the data is deleted either way.

# Error reporting (Sentry)

quarter can send crash reports to Sentry so you can see what breaks on real phones and tablets. It's off until you set an address, and it's set up to send the bare minimum.

## What is sent, and what never is

Sent: the type of error and a short message (emails and long tokens removed, 200 characters at most), where in the code it happened, the browser or Node version and operating system, the page **path** (no query string or hash), the country it came from (Sentry works that out from the connection; the address itself isn't stored), and a tag saying which part of the server it came from.

Never sent: a user, nickname, email address, cookies, headers, request bodies, anything typed (answers, tutor chats, feedback), breadcrumbs of taps or console output, session replay, performance traces. On the server the error message is dropped altogether, because a server error can quote a request. `src/monitoring/scrub.ts` does this for the browser and the server, and `src/monitoring/scrub.test.ts` checks it.

## Turning it on

1. Create a Sentry account and pick the **EU data region** (de.sentry.io) when you sign up. It can't be changed later.
2. Make two projects: one **Browser JavaScript** and one **Node.js**. Copy each project's DSN.
3. In each project, **Settings, Security & Privacy**: switch on **Prevent Storing of IP Addresses** and **Data Scrubber**. How long events are kept depends on the Sentry plan (the Developer plan keeps them for 30 days), and the privacy notice says 30, so change the notice and the DPIA if you move to a plan with a different period.
4. Add the secrets in Replit:
   - `VITE_SENTRY_DSN` (the browser project's DSN; it is baked in at build time, so redeploy after adding it)
   - `SENTRY_DSN` (the Node project's DSN)
   - Optional: `VITE_RELEASE` and `RELEASE` (a version label, such as a date), `VITE_SENTRY_ENV` and `SENTRY_ENV` (default `production`)
5. Sign Sentry's data processing addendum (Sentry, Settings, Legal and Compliance), and tick it off in `docs/DPIA.md`.
6. Restart. The server logs "Error reporting is on (Sentry)". To test, run `throw new Error("sentry test")` in the browser console on the live site and check it appears (the browser only reports from a production build).

Without the addresses nothing is sent and nothing changes.

## Things to know

- The browser code loads after the app starts and sets no cookies or browser storage.
- Noise is filtered out: browser extensions, network drops ("Failed to fetch"), cancelled requests, and the harmless `ResizeObserver` notice.
- Reports are errors only. Alerts and weekly summaries are set up in Sentry, not here.
- Changing what's sent means changing `scrub.ts`, its test, the privacy notice (`src/legal/content.ts`) and the DPIA together.

## quarter's Sentry set-up (done)

The organisation is `quarter-9y` in the **EU** region (de.sentry.io), with two projects, `quarter-browser` (browser) and `quarter-server` (Node). IP-address removal and the data scrubber are on for both. A test error from the server code arrived, and reading the stored event back confirmed that an email address, a token, a user id, typed text and an IP address that were put into it were all removed. The two addresses to paste into Replit Secrets are in the project settings under Client Keys (DSN).

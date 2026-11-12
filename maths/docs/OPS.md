# Running quarter: the team's tools

Read-only commands for seeing how quarter is doing and helping a parent. They run in the Replit shell (or anywhere with the production `DATABASE_URL`) from the `maths` folder.

```
npm run ops -- stats
npm run ops -- account parent@example.com
npm run ops -- feedback --days 14
npm run ops -- feedback --replyable
npm run ops -- audit
```

`npm run ops:stats`, `ops:feedback` and `ops:audit` do the same as the matching command above. The old `read-feedback` script still works.

## What each command shows

| Command | What you get | Needs |
| --- | --- | --- |
| `stats` | Parents (total, agreed to the terms, new in 7 and 30 days), subscriptions by status, trials ending soon, cancellations, learners by school year and how many were active in 7 and 30 days, and feedback by category | `DATABASE_URL` |
| `account <email>` or `--id <sign-in id>` | Account created, terms agreed, subscription status and dates, a link to the customer in Stripe, number of learners with their school years, last active date, feedback sent | `DATABASE_URL`, `CLERK_SECRET_KEY` (to find the person by email) |
| `feedback` | Feedback newest first. Filter with `--days N`, `--category X`, `--replyable`, `--limit N`. With `--replyable` and a Clerk key it shows the email address of people who said you may reply | `DATABASE_URL`, `CLERK_SECRET_KEY` for emails |
| `audit` | Who looked up which account, and when | `DATABASE_URL` |

Set `OPS_ACTOR` to your name so the audit log says who ran a command (it falls back to the computer's user name).

## What's deliberately left out

- A child's name, answers, progress or tutor chats are never shown. The account view gives counts and school years only.
- Nothing changes an account. Billing changes happen in Stripe, sign-in problems in Clerk, and a parent can export or delete their own data in the Parents' area.
- No analytics: the numbers come from the account database, with no tracking of what anyone did.

## The audit log

Looking up an account, or an email address from feedback, adds a line to the `ops_audit` table (who, what, and the internal id, never a name or email). It's kept even if the parent later deletes their account. Check it now and then with `npm run ops -- audit`.

Tutor and assistant usage lives in the server logs (the lines marked `assistant`), not in the database, so cost and abuse checks start there for now.

## Common jobs

- **"I paid but I can't get in."** Run `account <their email>`. If the subscription says `active` or `trialing`, the problem is on their side (sign-in method, browser). If it says `none` or `past_due`, check the customer in Stripe using the link printed.
- **"Please delete my account."** They can do it themselves in the Parents' area, under Account. If they can't sign in, delete the sign-in user in Clerk, then ask Roger to remove the rows. A button for this is planned for the ops page.
- **Weekly check.** `stats` shows sign-ups, trials about to end and active learners. `feedback --days 7` shows what to read and reply to.

## The ops page (`/ops`)

A page for the team, in the browser: the feedback inbox with replies, the numbers, account lookup and the audit log. It shows what the commands above show, and nothing about a child's name, answers or progress.

### Turning it on

Add these in Replit Secrets, then restart:

| Secret | What it is |
| --- | --- |
| `OPS_ADMINS` | The email addresses allowed in, comma-separated (the address you sign in to quarter with, for example `you@example.com`) |
| `OPS_SESSION_SECRET` | A long random string (24+ characters) used to sign the one-hour session. Keep it private |
| `RESEND_API_KEY` | Already set for the weekly email. The sign-in code and replies are sent with it |

Without all three the page stays off, and the server logs "The ops page is off".

### If "The code email couldn't be sent"

You got past the sign-in and the allow-list; the failure is Resend refusing the email. The screen now shows what Resend said, and the server log has the line `ops code email not sent: ...`. Common causes:

- `403` / `validation_error` about the **from address**: the domain in `MAIL_FROM` isn't the one verified in Resend. `MAIL_FROM` defaults to `quarter <hello@yourquarter.co.uk>`, so `yourquarter.co.uk` must show **Verified** under Domains in Resend. Resend only sends from the exact domain you verified: a verified `yourquarter.co.uk` does not cover `mail.yourquarter.co.uk`, and the other way round. Fix it by verifying the domain you send from, or by setting `MAIL_FROM` to an address on the verified one.
- `403` saying you can **only send to your own address**: Resend is in test mode (no verified domain). Until the domain is verified it only delivers to the email you signed up to Resend with.
- `401`: `RESEND_API_KEY` is wrong, or was created with "sending access" for a different domain.
- `429`: too many tries. Wait a minute.

`OPS_ADMINS` must be the email address on your quarter sign-in (the code goes to that address, looked up from Clerk).

### Signing in (three checks, all on the server)

1. Sign in at `/ops` with your normal quarter parent account.
2. Your email must be on `OPS_ADMINS`. Anyone else sees the same "not found" as a page that doesn't exist.
3. Press **Email me a code** and enter the six-digit code. It lasts 10 minutes, allows 5 tries, and you can ask for another every 30 seconds. That opens an hour-long session. **Lock** ends it sooner.

Take a person off `OPS_ADMINS` and restart, and they lose access within five minutes anyway.

### Replying to parents

The inbox lists feedback from the last 90 days, showing only those still waiting for a reply by default. Only feedback where the parent ticked "you may reply" has a reply box. A reply is emailed from `hello@yourquarter.co.uk` (their address is looked up from Clerk at that moment and never stored), quotes their message, and is recorded under the feedback so you can see what was said. If the email fails, nothing is recorded. Parents who reply go to your hello@ mailbox (open it in Zoho Mail on the web or app); showing those replies inside the portal is a possible later step.

### Audit log

Every code sent, sign-in, failed code, inbox view, reply and account lookup is written to the audit log, tagged `admin:` plus part of the sign-in id, never a name or email. See it under **Audit log**, or `npm run ops -- audit`.

### Deleting an account

Under **Account lookup**, find the parent by email and a **Delete this account** section appears. Type exactly `delete <their email>` and press the button. It does what the parent's own Delete button does: cancels the subscription first (and stops if that fails, so nobody is billed for something deleted), deletes the account, their learners' progress and their feedback, removes their sign-in, and emails them to say so. The audit log records `account-delete` with the internal id, written before the deletion, and never the email address.

## Next steps

Showing parents' replies inside the portal. That needs an address that receives email into the server (for example Resend's inbound mail on a separate subdomain, with portal replies pointing their Reply-To at it) rather than into the Zoho mailbox. It's a set-up decision more than code, so it waits until you choose how replies should arrive.

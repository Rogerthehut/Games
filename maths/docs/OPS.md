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

## Next steps (not built yet)

A small ops page, behind your own sign-in only, with an inbox, account lookup and the numbers above. It needs an admin allow-list, two-step sign-in and an update to the data-protection assessment first.

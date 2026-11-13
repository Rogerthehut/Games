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

## The mailbox (ops page, Mail tab)

The **Mail** tab is a normal-looking mailbox over everything people send us. Folders (with unread counts):
- **Inbox:** email sent to hello@yourquarter.co.uk, including replies to emails we started.
- **Messages:** the Message us form on the website.
- **Feedback:** feedback from signed-in parents (Parents' area). Replies need the "may reply" tick, and go to their account email.
- **Drafts:** unsent writing. **Save draft** is on every reply box and on New email; sending removes the draft.
- **Sent:** every email we have sent, replies and new ones, including replies to feedback.
- **Outbox:** emails that couldn't be handed to the email service (for example it was down). They're retried every few minutes (5 minutes, then 15, an hour, then 4 hours, five tries in all), and you can **Retry now** or **Discard**. An email is only recorded in its conversation once it has gone.

A conversation is one thread whichever folder lists it. It has a **reference number** (Q-1001, Q-1002...; feedback is F-1001...) shown on it and added to the subject of our emails ("Re: your message [Q-1042]"). When someone replies, the reference in the subject finds the conversation even if they write from a different address (the entry says it came from a different address); otherwise a reply is matched by the sender's address. Opening a conversation marks it read; a new reply marks it unread again (**Mark unread** is on each one).

### Messages from the website and email to hello@

Two things land in the **Messages** tab, as conversations: the footer's **Message us** form (`/?info=contact`: name optional, email, topic, message) and **email sent to `hello@yourquarter.co.uk`**, which Resend receives and passes to quarter. A parent who replies to one of your emails joins the conversation they already have. Nothing is ever sent back automatically.

- **Reading and replying:** in the ops page, the **Messages** tab. A reply is emailed through Resend from `MAIL_FROM` (`hello@yourquarter.co.uk`) to the address the person typed, with their message quoted. Replies and views are audit-logged. **Delete** removes a message and its replies.
- **Retention:** messages are deleted after 180 days (a small purge runs now and then when new messages arrive). The sender's email address is stored on the message only so the team can reply, and nothing is sent to it until someone replies. It's described in the privacy notice under "What we keep".
- **Abuse protection:** the Turnstile human check (when `TURNSTILE_SECRET_KEY` is set), a hidden field bots fill in, 5 messages an hour and 15 a day per address, 3 a day per email address, 2,000 characters, 8 KB body.
- **Needs:** the database (`DATABASE_URL`), and for replies `RESEND_API_KEY` and a verified sending domain. Replies say "send another message at yourquarter.co.uk/?info=contact", so they don't depend on an inbox existing. If `MAIL_REPLY_TO` is left unset, Resend replies go to `hello@yourquarter.co.uk`, so either set up that mailbox or set `MAIL_REPLY_TO` to one you read.

### Receiving email at hello@ (one-off set-up, all free)

1. **Resend, Domains, yourquarter.co.uk:** switch on **Enable receiving** and copy the MX record it shows.
2. **Your DNS (Replit, Domains):** delete the three Zoho `MX` records on `@` (mx.zoho.eu, mx2.zoho.eu, mx3.zoho.eu) and add Resend's MX record with the priority it shows. Only one provider can receive for the domain, and Zoho has no hello@ mailbox, so nothing is lost. Back in Resend, click **I've added the record** and wait for it to say Verified. (Your roger-richman.com Zoho mailbox is a different domain and isn't affected.)
3. **Resend, Webhooks, Add webhook:** URL `https://yourquarter.co.uk/api/inbound/resend`, event **email.received**. Copy the **signing secret** (it starts `whsec_`).
4. **Replit Secrets:** add `RESEND_WEBHOOK_SECRET` with that signing secret. `RESEND_API_KEY` must already be set, and it needs permission to read received email (a "full access" key; a sending-only key can send but not fetch what was received). **Don't** set `MAIL_REPLY_TO`: replies to your emails then go to hello@ and land here.
5. **Republish.** The Messages tab then says it's receiving. Send a test email to hello@ from another address and check it appears; reply to it.

If nothing arrives: Resend's **Emails, Receiving** tab shows what it received; the webhook's page shows each delivery and the response (a 400 means the signing secret is wrong; a 502 means quarter couldn't fetch the email, so check the API key's permission; a 404 means `RESEND_WEBHOOK_SECRET` isn't set or the app wasn't republished).

### How it's protected

- **Only Resend can post to the webhook.** The request must carry a valid Svix signature of the exact body, made with the signing secret, and a timestamp within five minutes. Nothing in the body is read before that passes. Anything else gets a plain 400. The same email delivered twice is saved once.
- **What's saved is plain text only.** The webhook says only that an email arrived; quarter fetches the content from Resend with its own key, using an id that has to look like an id. HTML is turned into text, quoted history is cut off, length is capped, attachments are ignored. Nothing is ever shown as HTML.
- **Automatic mail is dropped** (bounces, out-of-office replies, mailing lists, "noreply" senders), as is mail from yourquarter.co.uk itself, and one sender is limited to 20 a day (500 a day in total). Nothing is sent automatically, so there are no mail loops.
- **Spoofing shows.** Each email carries Resend's SPF, DKIM and DMARC results for the sender. If DMARC didn't pass, the conversation shows a red warning.
- **The team side needs the full proof** (sign-in, allow-list, emailed code, session), is rate limited per person, and every view, reply, signature change and delete is audit-logged without the content.

### Writing a new email (not a reply)

**Messages, New email** sends an email from hello@yourquarter.co.uk to one person: their address, a subject, your message, and a signature from the menu. It's kept as a conversation like any other (shown as "sent by you"), so if they reply, the reply appears under it, and it counts as waiting again. It only goes to a single address, never to another quarter address, and is limited to 30 a hour per person; every send is audit-logged without the address or the text. It's for one-to-one messages (a school, a partner, a parent), not mailing lists: bulk marketing needs its own consent and unsubscribe handling.

### Signatures

**Messages, Signatures** (a small button at the top) is where you add, edit, choose a default and delete signatures, like a mail program's signature settings. Paste the HTML (the file `docs/email/signature.html` is a starting point); the preview shows exactly what will be sent. Under each reply there's a **Signature** menu (the default is pre-selected; choose None to send without one). Up to 10 signatures, shared by everyone on the allow-list.

HTML is cleaned on the server before it's saved: scripts, forms, frames, event handlers, `javascript:` and `data:` links, styles that load things, and images that aren't full https addresses are removed. The preview is a sandboxed frame that can't run anything.

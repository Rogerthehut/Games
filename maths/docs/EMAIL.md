# Email: the weekly parent email

quarter can send each parent who has asked for it a short weekly email: how many days their child practised, which topics were tricky and why, and one thing to try. It uses **Resend** to send. Nothing is sent until you set it up below, and nobody gets it unless they turn it on in the Parents' area (Settings, "Weekly email").

What it does and doesn't hold:

- We **don't store parents' email addresses**. The address is looked up from Clerk at the moment an email is sent.
- Each parent has a private unsubscribe token (table `email_prefs`). Every email has an unsubscribe link and the one-click `List-Unsubscribe` headers.
- An email is only sent if a child practised in the last 7 days, and a parent never gets more than one in 6 days, even if the job runs daily.
- Reasons in the email come from the learning report (see `docs/ROADMAP.md`), so they are "likely", never a diagnosis.

## 1. Set up Resend (about 15 minutes)

1. Create an account at resend.com and add a **sending domain**. Use a **subdomain**, for example `mail.yourquarter.co.uk`, not the main domain. Then Resend's DNS records don't touch the records Zoho uses for `hello@yourquarter.co.uk`.
2. Resend shows DNS records (SPF, DKIM and a return-path MX/TXT for the subdomain). Add them where your DNS is managed. Zoho's records on the main domain stay exactly as they are. Receiving mail at `hello@yourquarter.co.uk` is unaffected.
3. Wait for Resend to show the domain as **Verified**.
4. Create an API key (sending access only).
5. In Replit, add these **Secrets**:

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | the key from Resend |
| `MAIL_FROM` | `quarter <weekly@mail.yourquarter.co.uk>` |
| `MAIL_REPLY_TO` | `hello@yourquarter.co.uk` (replies land in your Zoho inbox) |
| `CRON_SECRET` | a long random string; keep it private |
| `APP_URL` | the public address of the app, such as `https://yourquarter.co.uk` |
| `SERVER_URL` | optional: the address that serves `/unsubscribe` if it differs from `APP_URL` |

Without `RESEND_API_KEY` the server starts normally and logs "Email is off". Without `CRON_SECRET` the job endpoint is closed.

## 2. Run it every week

The server doesn't run the job by itself. Something has to call it once a day (the job is safe to run daily; it only sends to parents who are due). Use any one of:

- a Replit **scheduled deployment** that runs `curl -X POST -H "x-cron-secret: $CRON_SECRET" "$APP_URL/api/internal/digest"`, or
- a free external cron service (cron-job.org, GitHub Actions) calling the same URL with the header.

A good time is Sunday at 17:00 UK time, so the email arrives before the new week. Schedule it daily, not weekly, so a missed run catches up the next day.

The call returns counts, for example `{"considered":12,"sent":9,"quiet":2,"noAddress":1,"failed":0,"live":true}`. `quiet` means the child didn't practise, so nothing was sent.

## 3. Try it safely first

1. Turn the weekly email on for your own test account in the Parents' area.
2. Practise a few questions with a learner on that account, including a wrong answer or two.
3. Run the `curl` above. Check the email arrives, the link works, and Unsubscribe turns it off (the page asks you to press a button before it does anything, so mail scanners can't unsubscribe you by accident).
4. Run the `curl` again: nothing should be sent a second time within 6 days.

## Privacy and wording

- The privacy notice names Resend as the processor for this email, and says it is only sent if the parent turns it on.
- It is a service email chosen by the parent, not marketing. If you later want to send marketing email, that needs its own separate opt-in.
- Sign the data processing terms with Resend (their dashboard has a DPA) and keep a copy with the others listed in `docs/DPIA.md`.

## Code

`server/mail.ts` (Resend and a fake), `server/digest.ts` (the email's content), `server/digest-job.ts` (who gets one), `server/db/migrations/0005_email_prefs.sql`, the routes in `server/index.ts` and `server/accounts.ts`, and the switch in the Parents' area (`WeeklyEmailSection`). Tests: `server/email.test.ts`.

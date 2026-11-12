# If something goes wrong: breach plan (short form)

**quarter**, a trading name of Wristed Ltd. Draft, 10 November 2026. **Incident lead: __________  Deputy: __________**

A **breach** is anyone getting, changing, losing or sharing personal data they shouldn't. Examples: a leaked secret key, one family seeing another's data, an exposed database.

## The clock
Tell the **ICO within 72 hours of finding out** if the breach is likely to risk people. If unsure, report. Tell **affected parents without delay** if the risk to them is high.
Write every breach in the log below, even ones you decide not to report.

## First hour
1. Note the time and what you know. Don't delete logs.
2. **Contain it:** rotate the exposed secret (table below). If the app itself is leaking, stop the deployment in Replit. If an account is compromised, sign out all sessions in Clerk.
3. Decide: **what** data, **whose**, **how many**, still happening? We hold only parent ids, learner nicknames, years and progress, and subscription status. We do **not** hold card numbers, emails, real names or tutor chats.
4. Report to the **ICO** at ico.org.uk ("Report a breach") if likely to risk people. Children's data raises the bar: if borderline, report.
5. If risk is high, **email affected parents** from hello@yourquarter.co.uk (template below).
6. If crime is suspected, tell Action Fraud. If insured, tell the insurer first **[CONFIRM / none yet]**.

## Rotate secrets (Replit → Secrets, then restart and redeploy)
| Secret | How |
|---|---|
| `RESEND_API_KEY`, `CRON_SECRET` | Resend → API keys → roll; change `CRON_SECRET` in Replit and the scheduler |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys → roll; sign out all users if sessions may be stolen |
| `DATABASE_URL` | Change the database password; update the secret |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → roll both; check recent payments |
| `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` | Create a new key, delete the old one, check usage |
| Replit, GitHub, Google, Apple logins | Change passwords, check sessions, keep two-factor on |

Never paste a secret into chat or email. If one was committed to GitHub, rotate it (deleting the commit is not enough).

## Message to affected parents
> **Subject: Important: a security issue affecting your quarter account**
> On [date] we found that [what happened, plainly]. It may have exposed [exact data]. It did **not** include [for example card details, email or real names].
> We have [fixed it / informed the ICO]. You can [action, or "no action is needed"]. Questions: hello@yourquarter.co.uk. We're sorry.
> Wristed Ltd, trading as quarter

## Breach log (one entry per incident)
Reference and date found · What happened · Data and number of people (children?) · Cause · Likely risk and reasoning · ICO told? when, reference · Parents told? when · Actions and times · Lessons.

After any breach, fix the cause, update the DPIA if risks changed, and write down what you learned within two weeks.
Quarterly: two-factor on every account, no secrets in the repo, `npm audit` clean, a backup restore tested.

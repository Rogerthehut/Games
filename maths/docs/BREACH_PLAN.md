# What we do if something goes wrong: personal data breach plan

**quarter**, a trading name of Wristed Ltd (company number 12397793). **Draft, 10 November 2026.** One person should own this: **Incident lead: ____________ (deputy: ____________)**.
Keep a printed or offline copy, because you may not be able to reach your usual tools during an incident.

A **personal data breach** is any security incident that leads to personal data being lost, destroyed, changed, shared or accessed by someone who should not have it, on purpose or by accident.
Examples: a leaked secret key, a database made public, one family seeing another's data, a stolen laptop with access, a processor telling us they were breached.

## The clock

- The ICO must be told **within 72 hours of becoming aware** of a breach that is **likely to risk people's rights and freedoms**. If we are unsure, tell them anyway, and say so. The 72 hours include weekends.
- People affected must be told **without undue delay** if the risk to them is **high**.
- If a processor (Clerk, Stripe, Replit, the AI provider) tells us about a breach, our 72 hours start when we **become aware**.
- Record **every** breach in the log (section 6), even ones we decide not to report.

## 1. First hour: contain and record

1. **Write down the time** you found out, who found it, and what you know. Start the log.
2. **Stop the bleeding**, in this order of preference:
   - Rotate the exposed secret (section 3).
   - If the app itself is exposing data, take it down: in Replit stop the deployment (or unpublish). A short outage is better than a continuing leak.
   - If an account is compromised, sign out all sessions in Clerk and reset access.
3. **Preserve evidence.** Do not delete logs. Take screenshots. Note commit ids and deployment times. Do not "clean up" before you understand what happened.
4. **Tell the deputy** and decide who is doing what. Keep one written timeline.

## 2. Assess: is it reportable?

Answer these in the log:

- **What data**, and whose? Parents (Clerk id, consent record), learners (nickname, year, avatar, progress), subscriptions (customer id, plan). We do **not** hold: card numbers, parents' email addresses (Clerk and Stripe do), real names, birthdays, photos, tutor chat text.
- **How many people**, and are they children? (Assume yes for learners.)
- **Was it readable?** Encrypted or unusable data lowers the risk. Plain progress data and ids do not.
- **Could it cause harm?** Likely harms here: embarrassment, loss of trust, targeting of children, account takeover, fraud if payment details were involved (Stripe holds those, so ask them).
- **Is it still happening?**

**Rule of thumb:** a minimal-data breach with no real names and no contact details is often lower risk, but **children's data** raises the bar. If it is borderline, report.
If the risk is **high** (for example, children's records published, or credentials that let someone sign in as a parent), tell affected parents too.

## 3. Key rotation checklist (this app)

Do these in **Replit → Secrets** (then restart and redeploy), and in each service's dashboard:

| Secret | How to rotate |
|---|---|
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys → roll the secret key. Then sign out all users if sessions may be stolen |
| `VITE_CLERK_PUBLISHABLE_KEY` | Not secret. Only change if the Clerk app itself is replaced |
| `DATABASE_URL` | Change the database password in Replit's database settings; update the secret. If data was copied, treat it as a breach |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → API keys → roll key; webhooks → roll the signing secret. Check recent payments and customers for anything odd |
| `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` | Create a new key, delete the old one. Check usage for abuse |
| Replit account, GitHub, Google, Apple developer logins | Change passwords, turn on two-factor, check active sessions and recent access |

Never paste a secret into chat, an email or an issue. If a secret was committed to GitHub, rotating it is mandatory (deleting the commit is not enough).

## 4. Who to tell

| Who | When | How |
|---|---|---|
| **ICO** | Within 72 hours if reportable | ico.org.uk → "Report a breach" (or the ICO helpline, **[CONFIRM current number]**). Have the log ready |
| **Affected parents** | Without undue delay if high risk | Email from `hello@yourquarter.co.uk` (template below). Do not email from a personal address |
| **Clerk / Stripe / Replit / AI provider** | When they may be involved or can help | Their support or security contact; ask for their own incident logs |
| **Insurer** | As soon as possible, **before** spending money or admitting fault, if a policy exists | Policy number and claims line **[CONFIRM / not yet insured]** |
| **Police (Action Fraud)** | If crime is suspected (hacking, extortion) | actionfraud.police.uk |
| **Your solicitor** | For any serious or high-risk breach | **[CONFIRM]** |

### What to give the ICO

What happened and when; the type and number of records and people (and whether children); likely consequences; what we have done and will do; who to contact (name and email). It can be sent in stages if some facts are unknown.

### Message to affected parents (adapt, keep it plain)

> **Subject: Important: a security issue affecting your quarter account**
>
> On [date] we found that [what happened, in one or two plain sentences]. This may have exposed [exact data, for example "your learners' nicknames, school years and practice progress"]. It did **not** include [for example "your card details, email address or any real names"].
>
> What we've done: [fixed it / rotated keys / informed the ICO]. What you can do: [for example "no action is needed" or "sign out and back in", "watch for unusual emails", "change your password"].
>
> Questions or help: hello@yourquarter.co.uk. We're sorry this happened.
> Wristed Ltd, trading as quarter

Keep it calm and factual. Do not blame, speculate or promise more than you know.

## 5. Typical scenarios and first moves

| Scenario | First moves |
|---|---|
| A secret key is leaked (in code, chat or a screenshot) | Rotate that key now. Review the service's logs for use since it leaked. Treat as a breach if it could have read personal data |
| Database exposed or downloaded | Rotate `DATABASE_URL`, restrict access, find how. Likely reportable |
| One account sees another's data (a bug) | Take the feature or app down, fix and test, find how many accounts were affected from the logs, notify them and the ICO as the assessment says |
| A parent's account is taken over | Sign out all sessions, reset sign-in, check subscription and learners changed; ask Clerk for logs |
| Clerk, Stripe or Replit report a breach | Ask exactly what data of ours was involved. Start the 72-hour clock when we become aware. Rotate keys |
| The AI provider keeps or leaks tutor chats | Switch the tutor off (set the provider keys empty), tell affected parents the dates involved, ask the provider for details |
| Stolen or lost laptop with GitHub, Replit or Stripe logged in | Sign out remote sessions, change passwords, revoke tokens, rotate keys |
| Phishing someone in the team fell for | Change that password, enable two-factor, check for forwarding rules and recent logins, rotate keys they could reach |

## 6. Breach log (keep one entry for every incident)

| Field | Entry |
|---|---|
| Reference and date/time found | |
| Who found it and how | |
| What happened | |
| Data and number of people (children?) | |
| Cause | |
| Risk assessment (likely / high / unlikely) and reasoning | |
| Reported to ICO? When, reference | |
| Parents told? When, how | |
| Actions taken, with times | |
| Decision-maker and sign-off | |
| Lessons and changes made | |

## 7. After the incident (within two weeks)

1. Write the timeline and the cause. Fix the root cause, add a test or check where possible.
2. Update `docs/DPIA.md` (risks and controls) and this plan if anything was learned.
3. Tell the ICO about any new facts if they have an open case.
4. Rehearse: once a year, walk through one scenario above in 30 minutes.

## 8. Prevention checklist (quarterly)

- Two-factor sign-in on GitHub, Replit, Clerk, Stripe, Google and Apple developer accounts, and the email on them.
- Only the people who need access have it. Remove old collaborators.
- No secrets in the repo: run the repo's secret scan; keep `.env` out of git.
- Dependencies updated; `npm audit` clean.
- Stripe and Clerk alerts and email set to a monitored address.
- Backups tested: restore a copy and check it.
- `docs/DPIA.md` reviewed.

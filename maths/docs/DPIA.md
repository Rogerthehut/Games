# Data protection impact assessment (DPIA)

**quarter**, a trading name of Wristed Ltd (company number 12397793). **Status: first draft, 10 November 2026.** Written from how the app actually works.
Items marked **[CONFIRM]** are things only the company can answer. Review this with someone qualified before launch, and again whenever the product changes
(new data, a new provider, a new feature for children).

A DPIA is expected where processing is likely to be high risk. quarter processes **children's data** and offers an **AI tutor**, so the ICO would expect one.
It also follows the ICO's *Children's Code* (Age Appropriate Design Code), covered in section 8.

## 1. What we are doing and why

quarter is a maths practice web app for learners in Years 3 to 13. A **parent or guardian** creates the account; **children never have logins**.
Parents add learners (nickname, school year, avatar). The app picks practice questions, records progress, and shows parents a progress view and a report.
An optional **AI tutor** can be switched on by a parent. Parents pay by subscription.

**Why it is needed:** to give each learner suitable practice and show progress, to sign parents in, to take payment, and to keep the service safe.
There is no advertising, no profiling for marketing, no selling of data and no analytics cookies.

## 2. The data

| Data | Whose | Where it is held | Why |
|---|---|---|---|
| Email address, sign-in method, login sessions | Parent | **Clerk** (not in our database) | Sign-in |
| Clerk user id, date and version of terms agreed | Parent | Our database | Link the account to its learners; prove consent |
| Nickname, school year, avatar | Learner | Our database | Personalise the app |
| Practice results: skills seen, right and wrong counts, session times, check-up and practice-paper results, mistakes, plan and goals (exam type, coarse area, school preferences, exam date), points, settings | Learner | Our database (one JSON record per learner, up to 400 KB) | Choose questions, show progress, build reports |
| Subscription: Stripe customer id, plan, status, trial and renewal dates | Parent | Our database | Control access |
| Card details, billing address, invoices, email | Parent | **Stripe** (not in our database) | Payment |
| AI tutor messages and replies | Learner | **The child's own browser only.** Not saved to our database. Sent to the tutor service and an AI provider to get a reply | Tutoring |
| Tutor service technical data: random browser id, IP address | Learner/parent | Held in memory to rate-limit; the service logs counts and safety flags, **not message text** | Prevent abuse |
| Website access logs (IP, browser) | Visitors | Hosting provider | Run and secure the site |

**Not collected:** real names for learners (the app asks for a nickname), birthdays, photos, home addresses, school names, location beyond a coarse area chosen by the parent,
device identifiers for tracking, behavioural analytics.

**Special category data:** none is requested. A child could type something sensitive into the AI tutor (see risk R4).
**Volume:** small. Up to 8 learners per account.

## 3. Roles and sharing (processors)

Wristed Ltd is the **controller**. These are **processors** (or independent services) that handle data for us. **[CONFIRM]** each has a signed data processing agreement or accepted terms that include one.

| Provider | What they do | Data they see | Location **[CONFIRM]** |
|---|---|---|---|
| Clerk | Sign-in, sessions, optional Google and Apple sign-in | Parent email, sign-in method | May process outside the UK/EU |
| Stripe | Payments, invoices, billing portal | Parent card, billing details, email | Outside the UK possible |
| Hosting provider (Replit) | Runs the website and the database | All data in our database, access logs | Database in **Europe (EU)** |
| AI provider (OpenRouter and the model it routes to, or Anthropic) | Writes tutor replies | Tutor chat and the maths question, school year. **Not** nickname or account id | May be outside the UK/EU |
| Google, Apple | Only if the parent chooses them to sign in | They tell Clerk who the parent is | n/a |

International transfers: rely on the UK–EU adequacy position, the UK Addendum or standard contractual clauses, or the provider's certification. **[CONFIRM]** the basis for each.
For the AI provider, the app asks OpenRouter not to route to providers that keep or train on prompts (`data_collection: deny`); confirm this holds for the models actually used.

## 4. Lawful basis and children

- **Parent account, learner records, subscription:** *contract* (to provide the service the parent asked for), and *legitimate interests* for security and abuse prevention.
- **AI tutor:** *consent of the parent*, given by switching it on. It is off by default.
- **Terms and privacy agreement:** the parent ticks it at sign-up; the version and date are stored.
- **Children:** the parent or guardian acts for the child. quarter does not offer an online service directly to a child to sign up. The UK age of digital consent (13) is not relied on, because the parent holds the account.
- **Cookies:** only strictly necessary (sign-in, security) and local storage for the app. No consent banner is needed for these; a notice explains them.

## 5. Necessity and proportionality

- Only what the app needs: nickname, year, progress. No real names, no photos, no school names.
- Plans keep location coarse (a town or postcode area), and it is optional.
- Tutor conversations are **not** sent to our database and are removed with the browser data. Parents can read and clear them.
- Data is deleted when the parent deletes the account (learners, progress, subscription record, Stripe customer, and Clerk user where possible). Parents can also download everything.
- Progress reports are built on the device; they contain a first name or nickname and maths progress only.

## 6. Retention

| Data | Kept until |
|---|---|
| Account, learners, progress | The parent deletes them, or the account is closed. **[CONFIRM]** an inactivity rule, for example deleting accounts unused for 24 months after a warning email |
| Stripe payment records | As long as tax and accounting law require, even after deletion |
| Backups | Overwritten on the host's backup cycle **[CONFIRM]** |
| Tutor chats | In the browser until cleared |
| Server logs | **[CONFIRM]** host retention period |

## 7. Risks and how they are handled

Likelihood and severity are the author's judgement: **L** low, **M** medium, **H** high. Residual is what remains after the controls.

| # | Risk to children or parents | Before | Controls in place | Residual |
|---|---|---|---|---|
| R1 | Someone reads another family's data (code error or stolen login) | M / H | Every database query is scoped to the signed-in parent; tokens verified server-side; tests prove one account cannot read or change another's; write rate limit; Clerk handles passwords and optional Google/Apple sign-in | L / M |
| R2 | Database or secret keys exposed | L / H | Keys only in Replit Secrets, never in the code; production refuses test sign-in; minimal data (no real names, no email in our database); breach plan (`docs/BREACH_PLAN.md`) | L / M |
| R3 | A child shares personal details in a profile | M / M | Onboarding asks for a nickname, not a full name; no free-text profile fields beyond that | L / L |
| R4 | A child tells the AI tutor something personal or says they are unsafe | M / H | Tutor off by default; messages screened before sending; personal-detail and wellbeing checks; kind reply pointing to a trusted adult and Childline; parent notified in the Parents' area; chats not saved to our database; provider asked not to keep or train on them | M / M |
| R5 | The AI tutor gives a wrong or unsuitable answer | M / M | Replies checked so the answer is not simply handed over; "AI tutor" labelled clearly; terms say it can be wrong; parent can turn it off | L / M |
| R6 | Data sent to providers outside the UK/EU | M / M | Contracts and transfer safeguards **[CONFIRM]**; only what each provider needs; no learner nickname or account id to the AI provider | L / M |
| R7 | Parents do not understand what is collected | M / L | Plain-English privacy notice, cookies page, consent screen, in-app Subscription and Account sections | L / L |
| R8 | Data kept longer than needed | M / L | Parent-controlled deletion; export; retention rules above **[CONFIRM]** | L / L |
| R9 | Pressure on children (streaks, rewards, timers) | L / M | No leaderboards, no social features, no timers except the labelled practice paper, no advertising; points only | L / L |
| R10 | Subscription confusion or hard-to-cancel billing | M / M | Price and trial terms shown before paying; cancel any time in the Parents' area; Stripe portal; reminder emails turned on in Stripe **[CONFIRM]** | L / M |
| R11 | Loss of data (outage, bad deploy) | L / M | Hosted database with backups **[CONFIRM]**; parents can download their data; offline copy kept on the device and merged on reconnect | L / M |
| R12 | A parent loses access or an account is hijacked | M / M | Clerk sign-in with email codes or Google/Apple; session handling by Clerk; parent can sign out everywhere through Clerk | L / M |

## 8. Children's Code (15 standards): how quarter meets them

1. **Best interests of the child:** designed for learning; no ads, no manipulation.
2. **DPIA:** this document.
3. **Age appropriate application:** Years 3 to 13; parent sets the year; content and the look change by year.
4. **Transparency:** child-friendly where possible; plain-English notices for parents.
5. **Detrimental use of data:** none. No selling, no advertising use.
6. **Policies and community standards:** terms and privacy notice, applied as written.
7. **Default settings:** high privacy by default. The tutor is off; nothing is public; no social features.
8. **Data minimisation:** only what is listed in section 2.
9. **Data sharing:** only with the processors in section 3.
10. **Geolocation:** none collected. The 11+ finder uses a place the parent chooses.
11. **Parental controls:** the parent holds the account and controls the tutor, learners and deletion. Learners are not secretly monitored: the progress and tutor-log views are described to the parent.
12. **Profiling:** limited to choosing practice questions. Off by default for anything else; none for marketing.
13. **Nudge techniques:** none that push a child to give more data or weaken privacy. **[CONFIRM]** the streak and points features are reviewed for pressure.
14. **Connected toys and devices:** not applicable.
15. **Online tools:** privacy and deletion tools are in the Parents' area.

## 9. Consultation

- **[CONFIRM]** Ask a small number of parents and a teacher to read the privacy notice and the consent screen and say what they think it means.
- **[CONFIRM]** A pilot with learners to see whether the tutor handles real messages safely before wide release. The tutor evaluation script is in `server/eval`.

## 10. Outcome and sign-off

With the controls above, the residual risks are **low to medium** and acceptable for launch, **provided** the **[CONFIRM]** items are closed, especially:

1. processor agreements and transfer safeguards (section 3),
2. the retention rules (section 6),
3. a live safety evaluation of the tutor with the real provider,
4. the ICO registration of Wristed Ltd.

If a risk cannot be reduced, ask the ICO for advice before launching that feature.

| | |
|---|---|
| Prepared by | |
| Reviewed by | |
| Approved by (Wristed Ltd) | |
| Date | |
| Next review | Six months after launch, or on any change to data, providers or features |

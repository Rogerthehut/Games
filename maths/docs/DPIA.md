# Data protection impact assessment (short form)

**quarter**, a trading name of Wristed Ltd (company number 12397793). Draft, 10 November 2026. Review before launch and whenever data, providers or features change.
Items marked **[CONFIRM]** need an answer from the company.

## What and why
A maths practice app for Years 3 to 13. A **parent creates the account**; children have no logins. Parents add learners (nickname, year, avatar), and the app records
practice progress. An optional **AI tutor** (off by default) and a **subscription** (Stripe) are available. No advertising, selling of data or analytics cookies.
Children's data and an AI tutor make this worth assessing, but the amount of data is small.

## Data held
| Data | Where | Why |
|---|---|---|
| Parent: Clerk user id, terms version and date agreed | Our database | Link the account; prove consent |
| Learner: nickname, school year, avatar, progress (skills, results, plan) | Our database | Run the app, show progress |
| Learner: a record of questions got wrong or needed help with (question text, answers typed, date, seed; up to 250, 120 days) | Our database, with the learner | The grown-ups' learning report: which questions, why, how to help. Created from generated maths questions: no free text is stored. Included in the data download and removed when the learner is deleted. |
| Subscription: Stripe customer id, plan, status, dates | Our database | Control access |
| Parent email, sign-in method | Clerk | Sign-in |
| Weekly email choice and unsubscribe token (not the address) | Our database | Send the weekly progress email only to parents who turned it on |
| Card, billing details, invoices | Stripe | Payment |
| Feedback form (parent) | Message, topic, optional 1-5 rating, may-reply tick and screen size, linked to the parent account. No email stored (looked up from Clerk only if replying). Deleted with the account; included in the data download. Limited to 5 a day per parent and behind Turnstile | Improve the product, reply to the parent |
| Replies to feedback | Our reply text, date and an anonymous admin tag, linked to the feedback. The parent's email is looked up from Clerk when a reply is sent and never stored. Only sent where the parent ticked "may reply". Deleted with the account | Answer parents who asked for an answer |
| Rate-limit counters | Our database. A count of requests per hour or day for a keyed hash of a device id, parent id or visitor address (never the value itself, never message text); rows are removed within a day | Keep the AI tutor and the free endpoints from being overused or abused |
| Ops audit log | Admin tag (not a name or email), action and the internal id looked at. Kept even after a parent is deleted | Show who on the team looked at what |
| AI assistant questions (parent) | Not saved anywhere. Sent with the recent chat and the learner's school year (not nickname or account id) to the AI provider for a reply | Parent help |
| AI tutor chats | The child's browser only. Sent to the tutor service and AI provider to get a reply; not saved to our database | Tutoring |

**Not collected:** real names, birthdays, photos, addresses, emails in our database, location beyond an optional coarse area, tracking or analytics.
Up to 8 learners per account. Database held in **Europe (EU)**.

## Who else handles it
Clerk (sign-in), Sentry (crash reports, EU region: error type and short message, code location, browser and operating-system version, and the page path; no user, no query strings, no typed text, no breadcrumbs, no session replay, IP addresses not stored; country only; kept 30 days), Resend (the optional weekly parent email: address and the email text, only if the parent turns it on), Stripe (payments), Replit (hosting and database), Cloudflare Turnstile (a human check before the AI tutor and assistant), postcodes.io (council area for the first half of a postcode typed into the 11+ finder; the full postcode is never sent, nothing is stored), the AI provider (tutor replies: the chat and maths question only, never the nickname or account id).
**[CONFIRM]** data processing terms accepted with each (including Sentry, and its "Prevent storing of IP addresses" setting switched on), and the transfer safeguard for any processing outside the UK and EU.

## Lawful basis
Contract (the service the parent asked for) and legitimate interests (security). The **AI tutor rests on parental consent**, given by switching it on. Terms and privacy agreement is ticked at sign-up and recorded.

## Main risks and controls
| Risk | Controls | Residual |
|---|---|---|
| One family sees another's data | Every query is scoped to the signed-in parent; tested; sessions verified server-side | Low |
| Keys or database exposed | Secrets only in Replit Secrets; very little data; breach plan | Low |
| Child shares personal details with the AI tutor or says they are unsafe | Off by default; messages screened; kind reply pointing to a trusted adult and Childline; parent alerted; chats not saved to our database; provider asked not to keep or train on them | Medium until tested live **[CONFIRM]** |
| AI tutor gives a wrong answer | Clearly labelled "AI tutor"; answers are not simply given; terms say it can be wrong; parent can switch it off | Low |
| Data sent outside the UK/EU | Only what each provider needs; safeguards **[CONFIRM]** | Low |
| Team access misused or an admin account taken over (the ops page shows feedback, account facts and numbers; never a child's name, answers or progress) | Server-side checks on every request: parent sign-in, an allow-list of admin email addresses, and a six-digit code emailed to that address (10 minutes, 5 tries); sessions last an hour; people not on the list see only "not found"; every view, reply and failed sign-in is audit-logged; replies only to parents who ticked "may reply"; use two-step verification on the admin's own email and Clerk account **[CONFIRM]** | Low |
| Data kept too long | Parent can delete everything (also removes the Stripe customer) or download it; retention rule below | Low |

## Other controls
The Parents' area has a sum and a 6 or 8 digit PIN, kept on the device as a salted hash and slowed after wrong tries (a lock against a child, not a vault). The assistant is limited per parent per day, and screened for personal details and for worry about a child's safety (it signposts NSPCC, Childline and Samaritans).

## Retention
Kept until the parent deletes the account. **[CONFIRM]** whether unused accounts are deleted after a set period (for example 24 months, with a warning email).
Stripe keeps payment records as the law requires. Backups and logs follow the host's cycle **[CONFIRM]**.

## Children's Code
Followed in substance: high-privacy defaults (tutor off, no social features, no ads), minimal data, parental control, no nudging or profiling for marketing, tools to download and delete.

## Outcome
Residual risk is **low**, and acceptable for launch once these are closed: processor terms and transfers, a live safety test of the tutor with the real provider (`server/eval`),
the retention rule, and Wristed Ltd's ICO registration.

Prepared by: ________  Approved by: ________  Date: ________  Next review: six months after launch or on any change.

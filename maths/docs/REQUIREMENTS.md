# Requirements and scope

What quarter must do, for whom, and the standards it is held to. Written from the product as built; update it when scope changes.

## Purpose and users

| User | Need |
| --- | --- |
| **Child (Year 3–13)** | Short, clear maths practice with worked methods and hints; reasoning, 11+ and STEM extras; no pressure or ads. |
| **Parent** | See progress and exactly what went wrong and why; set plans; control tutor, PIN and data; pay once for the whole family; get answers quickly if stuck. |
| **Team (Wristed Ltd)** | Read and answer parent messages, see numbers, look up or delete an account on request, without exposing family data. |

## Functional requirements

1. **Curriculum:** England's maths curriculum from KS2 to A-level (about 250 skills including reasoning and STEM), with separate 11+ practice by area and school.
2. **Practice:** generated questions with answer checking suited to the answer type, hints, worked solutions and worked pictures; spaced repetition; resumable lessons.
3. **Assessment:** check-ups, mock and test-timed papers, pathway tests with certificates, weekly refresher, times-tables challenge.
4. **Printables:** A4 practice papers with matching answer sheet and mark scheme.
5. **Accounts:** parent sign-in (email code only), up to 3 children set up in a guided wizard, optional child PINs, consent to the current terms, data export and deletion.
6. **Learning report:** wrong answers with causes, methods to help, "fix this" practice, before/after proof.
7. **Payments:** one subscription per family (monthly or yearly), card-up-front trial, managed in Stripe's portal.
8. **AI tutor and parents' assistant:** opt-in, maths only, never reveals the answer during practice, never in tests.
9. **Communication:** a contact form on the public site; replies from hello@; inbound mail to hello@; weekly opt-in digest.
10. **Ops:** mailbox with threads, drafts, outbox, trash, search, pin/flag and signatures; stats; account lookup/delete; audit log.
11. **Public site:** landing, "what we cover" pages, blog, sample booklet and paper, SEO files, user guides.
12. **Mobile:** iPhone and iPad shell (iPad first).

## Non-functional requirements

| Area | Target |
| --- | --- |
| **Devices** | Tablets and iPads are the priority; phones and desktops supported. Verified at 18 sizes (phones to wide desktop) by the screen audit. Real-device testing still to be done. |
| **Accessibility** | Text alternatives for every drawn figure (`alt`), keyboard operable, focus visible, reduced motion respected, tap targets sized for touch. Further audit with real assistive tech is recommended. |
| **Privacy** | UK GDPR and the Children's Code. No child names, birthdays, photos or emails held; tutor log stays on device; privacy notice and DPIA in `DPIA.md`; 180-day support-mail retention. |
| **Security** | Server-side auth on every account route; learner isolation tested; signed webhooks; secrets only in Replit Secrets; headers and CSP; rate limits; audit logging. Detail and open items in `SECURITY.md`. Independent penetration test recommended before launch. |
| **Reliability** | The server never crashes on a request (errors become plain 500s); migrations idempotent; email retried from an Outbox; webhooks de-duplicated; offline saves retry. |
| **Performance** | Static assets cached long-term and immutable; lazy-loaded app; server bundled for fast start. No formal budget yet. |
| **Maintainability** | TypeScript throughout; about 1,300 automated tests; docs updated with every change (`CHANGELOG.md`). |
| **Content quality** | Every question and picture checked by tests; wording reviewed by a teacher before launch (outstanding). |
| **Language and tone** | British English; plain, non-legalistic copy; age-appropriate voice. |

## Out of scope (today)

Bulk or marketing email, classroom and school accounts, teacher dashboards, in-app subscriptions on iOS (planned via RevenueCat), Android build, offline-first content (the page needs a connection), user-generated content, live chat.

## Constraints and dependencies

Wristed Ltd is the controller. Depends on Clerk, Stripe, Resend, Sentry, Cloudflare Turnstile, Replit, and an LLM provider (Anthropic or OpenRouter) for the tutor. Each is replaceable behind a thin interface but would need work.

## Open items (owned by the team)

Solicitor review of terms and privacy; teacher review of maths content and tutor wording; real-device testing; live Stripe, Clerk and Resend keys; Apple Developer account for the app; Cloudflare/Clerk bot protection; independent security test. See `ROADMAP.md`.

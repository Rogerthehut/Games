# Grown-up controls and tutor privacy: code review

A review of what a child can reach on their own, and what the AI tutor sends, stores and logs. It's written to feed the data-protection impact assessment (`docs/DPIA.md`) and the privacy notice. Reviewed against the code as of this commit; the automated check is `npm run e2e:grownup`.

## What's behind the grown-ups' gate

A multiplication a young child can't do quickly, then the parent's own 6 or 8 digit PIN. After that, the area stays open for up to ten minutes.

| Area | Gated? |
| --- | --- |
| Parents' area, opened from the padlock at the bottom of the left-hand panel (on a phone, a row at the bottom of Me), with the sum and PIN opening in place (progress, AI assistant, tutor settings and chat log, settings, feedback, subscription, account, booklet card) | Yes |
| Progress report, My information (download and delete) | Yes (each checks the gate on its own) |
| Adding a learner or changing the school year (from Me) | **Yes, since this review** |
| Search results that lead to the Parents' area | Yes (the route itself is gated) |
| Switching between learners on the same account | No, by design (siblings share a device) |
| Study guides, the booklet reader, the STEM lab, practice and tests | No, they're for the child |

## Changes made in this review

1. **The area now locks as soon as someone leaves it.** Before, it stayed open for ten minutes, so a child picking up the device straight after a parent could walk in. It now relocks when the person moves anywhere other than the Parents' area, the progress report, My information, the booklet or a study guide opened from there.
2. **"Add someone, or change year" now needs the sum and PIN.** Changing the year changes the plan, and adding a learner is a grown-up decision.
3. **Tutor chats are removed from the device after 30 days**, except a worrying message that a grown-up hasn't seen yet. Before, they stayed until cleared (up to 300). The Parents' area says so.

## What the AI tutor sends, stores and logs

- **Off by default.** It only appears once a grown-up switches it on for that learner, and the grown-up chooses whether it guides or reveals after tries.
- **What leaves the device:** the question, the correct answer and steps (so the tutor doesn't leak them), what the child has typed for this question, the topic name, school year and level, up to 12 recent chat turns, the child's message, and a random per-device id used only for rate limiting. **Never** the learner's nickname, avatar, progress, account or email.
- **Limits:** message and history lengths are capped in the shared type (`LIMITS`), there's a per-device and per-IP rate limit, and where configured a human check (Turnstile).
- **Who receives it:** the tutor service, then the AI provider chosen in the server settings, with the provider's data collection switched off where the provider allows it. This needs a data processing agreement and a line in the privacy notice naming the provider.
- **Server logs:** only the kind of event (ok, blocked, refused, limit, error), a flag, the time taken and the model name. No message text, no question, no ids. The same holds for the parents' assistant.
- **Stored on the device:** the chat log, in the browser. It never goes to the server (the server drops it if sent) and it isn't in the account data export. A grown-up can read it, clear it, or let it expire after 30 days.
- **Safeguarding:** messages that suggest a child may be upset or unsafe get a kind reply pointing to a trusted adult and Childline, and raise an alert in the Parents' area until it's marked seen.

## Limits, stated plainly

- **The gate is a deterrent, not security.** It runs in the browser. The PIN is stored hashed on the device, but anyone who can use the browser's developer tools on that device could read the chat log or get round it. It's meant to stop a child tapping into the wrong place, not to stop a determined teenager.
- **The chat log is not encrypted on the device,** and it's lost if browser data is cleared. Parents on shared computers should use separate browser profiles.
- **The PIN is reset by signing out and in,** which proves it's the parent (the sign-in provider does the proving). That is the right trade for a family product, and the privacy notice should say so.
- **Account data sent to the server** is the parent's sign-in id, the learner's nickname, school year and progress. No real names, birthdays, photos or school names are asked for.

## Still to decide

- Name the AI provider and the data-collection setting in the privacy notice, and record the processing agreement.
- Decided: the area stays open while it is being used and locks after five minutes of inactivity (and still on leaving). A "Lock and leave" button in the area locks it at once and goes back to Me, without signing the child out of the app.
- Add this review's points to the DPIA, with the fixes above under "measures taken".

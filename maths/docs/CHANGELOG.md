# What changed

A running list of what has been added, newest first. Each commit that changes what a learner or parent sees also updates the matching docs, the user guides in `src/guides/content.ts`, and the roadmap. Run the matching checks (`npm test` and the `e2e:*` scripts listed in `docs/ROADMAP.md`) before pushing.

## Mailbox search, pin and flag
The ops Mail tab has a **search box** that looks through every folder at once (Inbox, Messages, Feedback, Drafts, Sent, Outbox and Trash): names, addresses, subjects, whole threads, and reference numbers (`Q-1042`). It forgives slips (`recieve`, `jhon`), matches the start or middle of a word, ignores capitals and accents, and needs every word you type to appear. Results show which folder they're in and highlight the matched words. **Pin** keeps a conversation at the top of its folder; **Flag** collects conversations from any folder into a **Flagged** folder. Search is audit-logged without what was searched for. Migration `0012_pin_flag.sql` (two `ADD COLUMN` lines only; on a Replit publish there should be no DROP). Tests in `server/mail-search.test.ts`; browser checks in `scripts/ops-messages-e2e.mjs`.

## The mailbox as three panes
On wide screens (1000px and up) the ops Mail tab is laid out like a desktop mail program: folders down the left with their counts, the message list in the middle, and the conversation in a reading pane on the right, all visible at once, with the selected message highlighted. On phones and small tablets it stays stacked (folders, then the list, then the message on its own with a Back button). The page is wider when the Mail tab is open.

## Trash in the ops mailbox, and a security pass
**Delete** in the mailbox now moves a conversation or piece of feedback to a **Trash** folder for 30 days (Restore, Delete forever, Empty Trash; a reply from the sender brings a trashed conversation back). A security review of the new routes found and fixed one thing: reference numbers in subjects were trusted on the number alone, so a guessed number could have written into someone else's conversation; the tag is now signed with a key only the server holds, and a tag that doesn't verify is ignored. Also: made-up tags are stripped from stored subjects, and the signing key is derived separately from the ops session secret. Findings and checks are in `docs/SECURITY.md`. Migration `0011_trash.sql`.

## The ops mailbox
The ops page's Messages and Feedback tabs are now one **Mail** tab shaped like a mailbox, with folders and unread counts: **Inbox** (email to hello@, and replies to emails we started), **Messages** (the website form), **Feedback**, **Drafts**, **Sent** and **Outbox**. Each conversation keeps its thread and gets a reference number (Q-1001..., F-1001... for feedback) shown on it and in the subject of our emails, so a reply from a different address still finds its conversation. New: drafts (reply and new email), a Sent folder, an Outbox that holds an email the email service couldn't take and retries it (it is only recorded once it has gone, and can't be sent twice), unread/read and Mark unread. Migration `0010_mailbox.sql`. Tests in `server/mailbox.test.ts`; browser checks in `scripts/ops-messages-e2e.mjs` and `scripts/ops-e2e.mjs`.

## www redirects to the main address
If the site answers on `www.yourquarter.co.uk` too, those requests are redirected to `https://yourquarter.co.uk` (the address in `APP_URL`), keeping the page, so there's one address for search engines and for sign-in. It only ever redirects to `APP_URL`.

## New email from the ops portal
**Messages, New email** writes to one person from hello@ without waiting for them to get in touch first, with a signature. It's saved as a conversation ("sent by you") so their reply threads under it. One address only, never our own domain, 30 an hour per person, audit-logged without the address. Tests in `server/ops-contact.test.ts` and `scripts/ops-messages-e2e.mjs`.

## Worked pictures: finished
The topics without a picture under the answer went from 53 to 3 (the three left are conceptual multiple-choice topics: loci and constructions, one- or two-tailed tests, and sampling methods). Every picture is worked out from the question's own numbers and checked against its answer in `src/curriculum/worked-final.test.ts` (about 40 tests across 8 batches, 1,283 tests in all).
- **Years 3 to 7:** time facts (a bar of blocks, or the months), multiplying three numbers (boxes), using a formula (drawn on the rectangle), order of operations (traced one operation at a time by evaluating the expression), mixed numbers, significant figures (counted digits marked), multi-step word problems.
- **Year 10 and 11:** quadratic sequences (difference rows), completing the square, rearranging, algebraic fractions, simultaneous equations (elimination), solving quadratics (graph with both roots), the quadratic formula, the exact trigonometric values table and a ladder triangle, surds, composite and inverse functions, iteration, recurring decimals, conditional probability (counters before and after the first pick).
- **Year 12 and 13:** arithmetic series, exponential growth, logarithms, proof by counter-example (a table of cases with the failing one marked), sigma notation, the factor theorem, the modulus (graph and number line), differentiation, integration (with the area shaded for definite integrals), product, quotient and chain rules, trigonometric equations on the graph, constant acceleration, the binomial distribution as bars, the normal distribution as a bell curve (ticks on the mean and each standard deviation), Pascal's triangle, parametric equations, the sum to infinity, Newton-Raphson, vectors in three dimensions, forces and moments, projectile motion.
- **Topics that only needed a picture on some forms:** Venn counts, area and perimeter, prism volume, 2-D vectors, regression lines, correlation and similar shapes now have one wherever the question doesn't already come with a figure.
- Tables in worked pictures use tighter cells on phones (under 420px wide), so far fewer need to scroll sideways on the smallest screens (53 of the 556 sampled pictures were wider than a 280px screen; now 14, which still scroll inside their own box).
- New: function graphs can set where their x ticks sit (`xOrigin`). Code in `src/curriculum/worked-final.ts` and `worked-advanced.ts`; coverage in `docs/WORKED_EXAMPLES.md`.

## Email to hello@ in the ops portal, and reply signatures
Email sent to `hello@yourquarter.co.uk` can now be received by Resend (free, no mailbox needed) and appears in the ops page's **Messages** tab beside the Message us form, as conversations: a reply to one of our emails joins the same thread, the team's replies go out from hello@ under the same subject with proper reply headers, and a conversation counts as waiting again when the sender writes back. The webhook (`/api/inbound/resend`) only believes requests signed by Resend (Svix signature, 5-minute window, each email once), fetches the content itself, keeps plain text only, drops automatic mail, mail from our own domain and floods, and records whether the sender's address was verified (a red warning shows if not). It never replies automatically. **Signatures:** a discreet **Signatures** button in Messages adds, edits, defaults and deletes HTML signatures (up to 10), cleaned on the server and previewed in a sandboxed frame, with a signature menu under every reply. New secret `RESEND_WEBHOOK_SECRET`; setup steps and the full protection list are in `docs/OPS.md` and `docs/SECURITY.md`. Privacy notice updated (conversations are kept 180 days after the last message). Migration `0009_inbound_and_signatures.sql`; new dependency `sanitize-html`; checks `scripts/ops-messages-e2e.mjs` and about 50 new unit tests.

## Final screen audit fixes
The last full screen audit (all 18 sizes) found three things, all fixed: the print-a-paper screen was wider than a 320px phone (its grid column now shrinks to fit); a harmless but noisy browser error "Transition was aborted… Viewport size changed" when the window was resized or turned during a screen change (now ignored, since the screen has changed anyway); and the "Jump to a world" links on the Skills map were 30px tall on landscape iPad (they're back to 44px on touch screens, and everything still fits). Everything else came back with 0 problems.

## Message us: the Back to quarter button
The button shown after a message is sent had the browser's blue underlined link style. It now matches the other buttons.

## Skills map: the symbols key is always in view
On wide screens the right-hand column on Skills had three cards stacked taller than the window, so "What the symbols mean" was cut off until you scrolled down the path. The key now sits directly under the skill card (above "Jump to a world"), is laid out in two columns, and the column stays beside the map. On windows under 960px tall the short descriptions are dropped (they stay as tooltips) so the key and "Jump to a world" both still fit beside the map at the top of the page (checked at 1280×720, 1366×768, 1440×900 and 1920×1080); the column is a little wider; very short windows scroll the column on its own.

## "Message us" replaces the email address
The footer no longer shows `hello@yourquarter.co.uk` (which isn't an inbox yet). It has a **Message us** link to a short contact page (`/?info=contact`) on every page, including the blog and guides. Messages are stored (sender's email kept only to reply, deleted after 180 days) and answered from a new **Messages** tab in the ops portal, emailed from hello@yourquarter.co.uk through Resend. Protected by the human check, a hidden bot field and per-address and per-email limits. The privacy notice, terms, My data page and the booklet now point people to the Message us page instead of the address. The sitemap lists the page. Migration `0008_contact_messages.sql`. See `docs/OPS.md`.

## Print-a-paper screen on small phones
The screen audit found the print-a-paper page was wider than a 320px phone, cutting off its right edge. The page's grid column and option list can now shrink to fit (`src/styles.css`). Not yet rechecked after the fix: the full audit is still running on the earlier build.

## Endpoint and API audit
Every server route was checked for who can call it and what it returns (table in `docs/SECURITY.md`). Nothing safety-critical was exposed. Three hardenings: the development-only fake sign-in and fake payments are now refused on anything that looks live (not just `NODE_ENV=production`), `/unsubscribe` has a per-address limit, and the server warns if payments are on without `APP_URL`.

## "See how it explains it" on the landing page
The cell beside the Learning report card now holds a quiet, self-playing panel on graph paper that draws three worked examples step by step: taking away with an exchange (342 − 158), adding fractions (½ + ¼) and sharing with a bus stop (156 ÷ 4). Nothing to click, though there are scene dots and a pause button. It's hand-drawn SVG that moves only position and opacity, plays only while on screen, and stands still (on the finished picture) for people who prefer reduced motion. `scripts/explain-card-e2e.ts` checks it on desktop, iPad and iPhone widths.

## Search and AI findability refresh
- Sitemap dates moved to today, so crawlers see the changed 11+ page. `/llms-full.txt` now includes the 11+ test notes for every area and the per-school entries, each with its source and confidence. `llms.txt` and the home page's structured data (feature list) now mention the learning report, timed papers, times tables challenges and the weekly email. `/ops` is in `robots.txt` and sends `noindex`. Icons, favicons and the manifest were checked and need no change.

## Email sending address
Emails (the weekly email and the ops sign-in code) now send from `quarter <hello@yourquarter.co.uk>` by default, matching the domain verified in Resend. Set `MAIL_FROM` to use a different verified address. Docs updated.

## "Try one" card removed
The interactive "Try one" card on the landing page (and its question bank, quick-fire tables and tests) has been taken out: it didn't show how explanatory and friendly the app is. The cell beside the Learning report card is empty again. It's in the git history (commits `65591ed` to `e83aad4`) if any of it is wanted back.

## "Try one" card: a livelier, darker design
The marketing card is now a deep indigo tile with drifting maths symbols, so it stands out from the pastel ones. New: a year picker (Any, 3, 4, 5, 6); the Pip mascot reacting to each answer (thinking, cheering, waving); points and a streak flame with a progress bar to a "Maths star!" medal after five right; confetti and a "+10"; a wrong answer slides in the "In the learning report" note; "Show me how" zooms the picture in with a light sweep, draws an underline under the answer and ticks the steps in one by one; quick-fire has a colour-changing timer, a combo flame, and a Gold, Silver or Bronze result. Still cheap: transform and opacity only, paused off screen, off for reduced motion, and not loaded until you scroll near it.

## Today: "Pick up where you left off" pills
The pills are left-aligned and wrap onto a second line when the label is long (for example "Continue practice · Adding and subtracting" on a phone), at the same size as the others, instead of centring.

## The iPhone and iPad app: the shell
`/mobile` is now a working Expo project (see `docs/MOBILE.md`): the site in a web view, full screen on iPad in every orientation and Split View, with printing (AirPrint), saving files through the share sheet, other websites in a browser sheet, mail and phone links, haptics and an offline screen. Link and message rules are tested (`cd mobile && npm test`), and the iOS bundle builds. In the app the web side hides card payments (Apple requires in-app subscriptions through the App Store, which is the next step, with RevenueCat) and Google sign-in (Google blocks it in embedded web views). **Not yet seen running on a device.** Needs your Apple Developer account, a bundle id and an Expo project id to build (`docs/MOBILE.md`).

## Worked method pictures: algebra, interest, probability and rates
Solving equations, collecting terms, expanding and factorising (laid out step by step), substituting, inequalities (number line with the allowed values), nth terms, simple and compound interest and growth and decay (a table year by year), probability trees (two independent events, with the key underneath), speed, distance and time (formula triangle), profit and loss, VAT and wages, circle area (the circle with its radius or diameter marked), index laws (written out in full), reverse percentages, direct and inverse proportion, density and pressure (formula triangles), standard form (place value chart), budgets, bounds (number line) and probability of a counter. New picture types: tree and formula triangle. Coverage now: 104 topics with a picture on every question, 25 on most, 12 on some, 61 on none (`docs/WORKED_EXAMPLES.md`).

## Fair use terms and limits on reads and the booklet
- **Terms of use:** a new "Fair use" section says scraping, bulk copying (including into another product or AI training) and getting round usage limits aren't allowed, that content belongs to the operator or its licensors, and that it can be used for your own family or class. This adds an obligation, so the terms version is now `2026-11-12`: signed-in parents are asked to agree again.
- **Server:** the account API now also limits reads per parent (1,500 an hour), total requests per address (6,000 an hour, counted before sign-in is checked) and booklet downloads per parent (8 a day), with `429` and `Retry-After`. Settings are environment variables, documented in `docs/SECURITY.md`. Tests in `server/accounts.test.ts`.

## Marketing site: a "Try one" card
In the empty cell beside the Learning report card on the landing page there is now an interactive card with two tabs.
- **Try a question:** a random real question (Years 3 to 6, from 25 topics) with an answer box and a hint. A wrong answer says "not quite" and, when it matches a common slip, shows the likely reason the learning report would give. "Show me how" draws the method (column, bar model, number line, grid, bus stop) and the steps appear one by one; then "Another one" and a way in to an account.
- **Quick-fire tables:** ten different facts from the 2 to 12 tables, six seconds each, the answer jumps on as soon as it's typed, and a bar chart of how long each took at the end.
- **Light on the page:** the card isn't loaded until you scroll near it. The questions are made ahead of time from the real generators (`npm run try-bank` writes `src/landing/try-bank.json`; a test fails if it goes stale). Animation is transform and opacity only, pauses when the card is off screen, and is switched off for people who prefer reduced motion. Nothing is stored or sent.
- Tests: `src/landing/landing.test.ts`; `npm run e2e:try-card` (desktop and phone; needs the app running signed out with `VITE_FAKE_AUTH=1`).

## Smaller sticky notes in the left panel, and the learner list only on phones
- The Times tables and STEM lab notes in the left-hand panel are about a fifth smaller (and a little smaller again on shorter screens), so they leave room above the learner card and the panel no longer needs its scroll bar on desktop and iPad.
- On tablets and desktops the "Who's learning" list is gone from the Me page, because the switcher in the left-hand panel does that job. Phones keep the list on Me.
- Fix: choosing "I'm a grown-up" on a child's PIN prompt used to leave the Parents' area unlocked for five minutes. It now locks again straight away.

## Learner switcher in the left-hand panel
The learner card at the bottom of the left panel (the avatar with "hi" and the name) is now a switcher. Tap it to open a list of everyone on the account, with a tick on who is using this screen; tap a name to switch (a child with a PIN asks for it first, as on Me). The list also has **Me and settings** and **Add someone, or change year** (which asks a grown-up). Escape or a tap outside closes it. The same list is still on the Me page, which is where phones use it. Tests: `npm run e2e:rail-switch`; the PIN and two-screen tests were updated to use it.

## Worked method pictures: more topics, and a coverage report
Added pictures for money (coins, pounds and pence, bills, best value, exchange rates, price for one), measures conversions, imperial and metric, time conversions, Roman numerals, factors, highest common factor and lowest common multiple, primes and squares, averages, missing-number sums (bar models), prime factor ladders, negative number hops and sign rules, proportion tables, ratio bars, expanding and factorising brackets (grids), frequency tables, outcome grids, percentage change bars and number patterns. `npm run audit:worked` writes `docs/WORKED_EXAMPLES.md`, a table of every maths topic with how often it has a picture. Today: 87 topics with a picture on every question, 25 on most, 12 on some and 78 on none (mostly symbolic algebra and calculus, where the written steps are the method, plus a few still to do).

## Worked method pictures for 34 more topics (batches 1 and 2)
Solutions now draw the method for: place value (charts with the decimal point), rounding and negative numbers and temperatures (number lines with hops), counting in steps, large numbers, dividing by 10 and 100, hundredths and thousandths, decimals (columns with the point, and bars for × and ÷), money and measure sums (columns with £ and pence), money change (counting on), time and timetables (a time line), long division (by chunking), fractions (equivalent, ordering, adding and subtracting, of an amount, mixed numbers, times a whole number, dividing: bar models; multiplying: a grid), fractions to decimals and percentages, percentages of an amount, ratio sharing, two numbers with a difference, scaling recipes (a table), times tables (an array of dots) and pictograms. New picture types: number line with hops, bar model, fraction grid, array, chunking and pictogram; the column sum now takes decimals, £ and any number of rows. They are added after a question is made (`src/curriculum/worked-skills.ts`, `worked-fractions.ts`), read from its wording and answer, and `worked-skills.test.ts` checks hundreds of questions per topic against the question's own answer. Still to do: the rest of Years 3 to 9 and the secondary topics (see task 40).

## Public beta tab has a shadow
The "Public beta" tab under the wordmark now has a soft shadow beneath it, so it sits above the page like a tab on a folder.

## The AI tutor stays on maths: no helplines, no safeguarding alerts
- If a child brings up something that isn't maths (a worry, or something personal), the tutor says it can only help with maths, suggests talking to a parent or guardian, and goes back to the maths. It no longer gives Childline or any other number, and it no longer flags the message or shows an alert in the Parents' area.
- The parent can still read the whole chat log in the AI tutor tab (kept on the device for 30 days, clearable). Personal details are still blocked and never sent on.
- The parents' assistant follows the same rule: no helplines, a kind suggestion to speak to someone they trust such as the child's school or GP.
- Wording brought into line in the parent guide, the privacy notice, the DPIA, `docs/TUTOR.md` and `docs/GROWN_UP_CONTROLS_REVIEW.md`. The `wellbeing` flag no longer exists. Tests updated.

## Solutions now show the method, not just the sum again
"Column method: 376 − 238 = 138" only restated the question. Solutions can now carry a **picture of the method worked through** (`Question.worked`, shown by `src/ui/solution.tsx` above the steps in practice, lessons, papers, the learning report and the printable mark scheme; in step-by-step lessons the picture waits until every step is showing, so it doesn't give the answer away).
- **Adding and subtracting:** a column layout with place names (O, T, H, Th…), the carries written under the answer, and exchanges over the top number with the old digit struck through, including exchanges passed across zeros (4003 − 1865). The words are made from the same digits ("Ones: 6 is too small to take away 8, so exchange 1 ten for 10 ones. Now 16 − 8 = 8").
- **Written multiplying:** a grid with a box for each pair of parts.
- **Short division:** a bus stop with the answer on top and the carried remainders.
- Built in `src/engine/worked.ts`; the picture and the words can't disagree because they come from one calculation. Tests (`src/engine/worked.test.ts`) check hundreds of random sums: every carry and exchange is consistent and the picture's answer matches the question's.
- **Still to do** (same approach): place value chart, rounding and negative numbers on a number line, large numbers, long division by chunking, money and measure addition with decimals, fractions as bar models and percentages. Tracked as task 40.

## Fix: the Parents' area sum opens in front of you on a phone
On an iPhone in Safari, tapping Parents' area from the bottom of a long page (Me) dimmed the page but put the sum and keypad half way up it, out of sight. Two causes, both fixed: (1) every screen's entrance animation used `both`, which leaves an animation on the screen after it finishes, and Safari then places "fixed" pop-ups against the whole long screen instead of the visible part; it is now `backwards`, so nothing is left behind; (2) the sum and child-PIN pop-ups are now drawn straight on the page body (`src/ui/portal.tsx`), so no screen can move them. On very short phones the pop-up scrolls so every key is reachable. Test: `npm run e2e:gate-position` (three phone sizes). Not checked: Safari itself (no WebKit here), so please try it on your iPhone.

## Groundwork for the iPhone and iPad app
- **`src/native/bridge.ts`:** a small link between the web app and the app shell (an Expo project in `/mobile`, in progress). In the app, printing and saving files are handed to the phone (print sheet, share sheet), because a web view can't do either; in a browser nothing changes. Printing, the progress CSV, the data export, the curriculum booklet and the printable papers all go through it. Tests: `src/native/bridge.test.ts`.
- **`/mobile`:** the Expo project is started (dependencies chosen to match Expo SDK 58). The shell itself, the iPad settings and the build notes come next. iPad and tablet layout is the priority.

## Optional PINs for children
- **Parents' area, Settings:** make, change or turn off a 4 to 6 digit PIN for the learner you're looking at. From Year 7 a parent can also let the child change their own.
- **Switching asks for it:** choosing a child who has a PIN on Me shows a PIN pad. A wrong PIN is refused, with five tries then a growing wait (the same slow-down as the parent PIN). A grown-up who has already opened the Parents' area isn't asked.
- **Forgot it?** goes to "I'm a grown-up": the sum and the Parents' PIN, then **open the profile and keep the PIN** or **clear the PIN and open**.
- **My PIN** on Me (older children, when allowed): current PIN first, then the new one twice.
- It is a household lock, not a vault: kept on the device as a salted hash, never synced, removed with the learner or on sign-out. Private notice, DPIA, parent guide and tests updated (`src/ui/pin.test.ts`, `npm run e2e:kid-pin`).

## Two screens at once, with different children
Two browser tabs or windows on one device can each show a different child (chosen on Me). Before, whichever screen saved last overwrote the other's progress, because every save wrote everyone's data. Now each screen picks up the other's changes to the other children straight away, keeps its own child exactly as it is, and remembers which child it was showing after a reload (kept per tab, not shared). Two screens on the *same* child still end up with whichever saved last. Signed-in accounts already save each child separately with a version check, so different devices were fine. Tests: `src/engine/storage.test.ts`, `npm run e2e:multi-screen`.

## Printable practice papers
- **Print a paper:** "Print this paper instead" on the practice paper screen, and a "Practice papers to print" card in the Parents' area. The 20-question maths paper and the Quest-style, 50-minute and 60-minute maths papers can be printed on A4, with name, date and mark boxes, working space and an answer line (`src/ui/print-paper.tsx`).
- **Answers kept separate:** "Print the paper" and "Print answers and mark scheme" print different pages, so the answers can be kept back. The mark scheme gives each answer with the steps and the topic.
- **Paper numbers:** every paper has a number (1 to 9999) made into the same questions every time, so you can reprint it or give it to a brother or sister. "A different paper" picks a new number.
- **Written answers only:** the reasoning papers are multiple choice with drawn pictures, so they stay on screen.
- **Free sample:** `/curriculum/practice-paper.html` with a downloadable PDF of paper no. 101 and its mark scheme, in the sitemap and `llms` files. Rebuild with `npm run paper-sample`.
- Tests: `src/engine/print-paper.test.ts`, `npm run e2e:print-paper` (phone and desktop; checks what prints).

## STEM lab: pictures for 15 more topics
Loops, inputs and outputs, debugging, how computers learn from examples, binary (writing a number), hexadecimal, AND/OR/NOT, data types, outliers, accuracy, binary search, how work grows, storage, gradient descent, the spam filter and the Caesar cipher now show a picture with the question. Three new picture types: **table**, **flow** (boxes and arrows, with a repeat bracket for loops) and **alphabet** (letters with their positions). The others reuse the code, list, number-line, pie and graph pictures. The number line now spaces its numbers out on longer lines. Every picture has a spoken description, checked by `stem.test.ts`. Still text-only: bias, the quantum topics and the neural-network layer (these are concept questions or need a new kind of drawing).

## Fix: Today no longer offers topics far above the learner's year
A Year 4 learner was shown "Binomial expansion coefficients" (Year 13). A strong check-up marks many earlier topics as already known, which unlocks later ones, and the picker only *preferred* topics near the learner's year, with no limit. Now new topics on Today, and the study plan, come from at most the learner's year plus two (plus one with no check-up result), whatever the check-up says (`reachYear` in `src/engine/progress.ts`). Reviews, grown-up focus topics and the Skills map are unaffected, so a learner can still choose to go ahead. Test: `progress.test.ts` ("topics offered are close to the learner's year").

## Times tables: streaks, speed and a weekly winner
- **My streak and speed** card on the tables page: days in a row (today not yet done doesn't break it), and a 14-day chart of how long right answers took.
- **Show how quickly I answer** button recolours the grid by recall time (3s or less, up to 6s, slower, not answered yet).
- **This week's winner** on the scoreboard: most right answers since Monday, ties share the win, nobody wins with none, and learners who've hidden themselves from the board stay hidden.
- Stored as a small per-day log (date, answers, right, average time; last 120 days) in the learner's tables data, so it syncs like the rest. Tests: `src/engine/tables-progress.test.ts`, `npm run e2e:tables-progress`.

## Learning report: help written for each topic
69 topics that used to get only generic advice (bearings, gradients, compound interest, the chain rule and so on) now have their own usual reasons, a step-by-step method and questions to ask, shown first in the report. These are a draft for a maths teacher to check: see `docs/TEACHER_REVIEW.md`. Test: `src/engine/topic-help.test.ts` (no topic falls back to the general advice).

## The AI tutor can read its replies aloud
Each tutor reply has a **Read to me** button (turning into Stop while it speaks). It uses the device's own voices and the learner's chosen voice, says maths as words, and stops when they send another message or close the tutor. Nothing is recorded or sent anywhere for it. Speaking to the tutor is planned for the mobile app with on-device recognition only. Tests: `src/ui/tutor-speech.test.ts` and `npm run e2e:tutor-read`.

## Ops page: delete an account
The ops page can now delete an account for a parent who can't sign in. Look them up by email, type `delete <their email>` to confirm, and it cancels the subscription (stopping if that fails), deletes the account and everything under it, removes their sign-in and emails them. It's audit-logged without the address. Tests: `server/ops-api.test.ts` and `npm run e2e:ops`.

## Rate limits in the database
The AI tutor's limits and daily cost cap, the parents' assistant limits, the write limit and the limits on the public postcode and human-check endpoints now count in the database (`rate_counters`, migration 0007) instead of in memory. They survive restarts and are shared by every copy of the server, so the daily cap really is a daily cap. Visitor addresses and ids are stored only as a keyed hash, and rows are swept within a day. If the database can't be reached the counters fall back to memory. After pulling, restart so migration 0007 runs. Tests: `server/counters.test.ts`.

## Pick up a half-finished lesson
Leaving a worked-example lesson part-way now saves the step, and Today shows **Continue lesson · topic** with the other "pick up where you left off" buttons. It opens on the same screen with the running tally kept, and finishing clears it. A saved lesson is offered for 30 days. The lesson's last screen now takes you to Skills even if you opened the lesson from Today. Checks: `src/engine/lesson.test.ts` and `npm run e2e:lesson`.

## Housekeeping: test screenshots
The browser test scripts used to write their screenshots into the top of the repo, where eleven of them were tracked, so every run showed changes. They now write to the system's temporary folder (or `OUT` if set), those files are no longer tracked, and the top-level `*.png` pattern is ignored.

## Faster server start
The server is now bundled into one file at build time (`npm run build:server`, part of `npm run build`) and started with plain `node`, instead of compiling the TypeScript each time it starts. It's about 40% quicker to be ready on a fast machine and should help more on Replit's slower one, which shortens the burst of "healthcheck failed" lines at a deploy. `npm run server:dev` still runs the TypeScript directly for development and the browser tests. The booklet and the database migrations are found the same way from both. `.replit` now also stops the old process by either name.

## Study guides no longer send you back to Me
Reading a study guide (for example "Algorithms and loops") could throw you back to the Me screen after about ten seconds, mid-sentence. The Parents' area's idle check counted study guides as part of the area, and since a child reaching a guide from Skills or the STEM lab hasn't entered the PIN, it treated them as "locked out". Study guides are now left alone by that check. The screens that need the PIN (Parents' area, progress report, learning report, my data and booklet) work as before, and a parent who opens a guide from the Parents' area still keeps the area unlocked for the trip. Check: `npm run e2e:idle`.

## Free curriculum booklet sample
- A public 12-page sample of the booklet: `public/quarter-curriculum-sample.pdf` (served at `/quarter-curriculum-sample.pdf`) with the cover, welcome and how-it-works pages, the whole of Year 5, a look at the 11+ and STEM strands, tips for home, and a page about the full booklet. It's chosen from the full booklet's own pages, so the two can't drift apart (`buildBookletSample` in `src/booklet/model.ts`).
- A public page, `curriculum/booklet.html` ("Free curriculum booklet sample"), with the cover and a sample page as pictures, a download button and what's in the full booklet. It's linked from the curriculum hub, in the sitemap and in `llms.txt`.
- `npm run booklet` now builds both PDFs and the two preview pictures. It also showed that one Year 4 page in the full booklet ran slightly past its page area, which is fixed. The server now labels PDFs correctly.

## Email signature and mail set-up guide
- A branded HTML email signature (`docs/email/signature.html`, with a plain-text version) and its logo (`public/email/quarter-signature-logo.png`, drawn by `scripts/make-email-assets.mjs`). It includes the company details the law requires on business emails.
- `docs/EMAIL_ADDRESSES.md` explains how to forward `hello@yourquarter.co.uk` to `hello@roger-richman.com` and how to reply from that mailbox as `hello@yourquarter.co.uk` (through Resend or Zoho SMTP), then paste the signature.

## Server security pass
- **Fixed a crash:** a single request for a folder name (for example `/assets`) made the server throw and exit. Any error in a request is now caught and answered with a plain 500, and folder addresses serve their `index.html` (so `/blog` works).
- **Security headers on every response:** no sniffing, no framing, a referrer policy, a permissions policy, HSTS over HTTPS, and a Content-Security-Policy in report-only mode (switch it to enforcing with `CSP_ENFORCE=1` once the live site's console is quiet).
- **Safer file serving:** addresses are decoded, normalised and kept inside the app folder; null bytes and look-alike folder names are refused.
- **Rate limits can't be dodged by faking a header:** the caller's address now comes from the proxy's own entry in `X-Forwarded-For`, not the first, caller-supplied one (`TRUSTED_PROXY_HOPS` for more than one proxy).
- `/api/health` no longer names the tutor provider or lists what's switched on.
- New: `docs/SECURITY.md` with every route, what protects it, the settings to check in Replit (including `CLERK_AUTHORIZED_PARTIES`), and the known limits. Tests: `server/http-safety.test.ts`.

## One footer look across the site
The articles, blog posts, guides, FAQs, 11+ pages, curriculum and reading pages, study guides, and the privacy, cookie, terms, licences and sitemap pages now end in the same full-width dark footer band as the landing page, with the same layout (logo, line and email on the left, three link columns, the slim bar underneath). It sits outside the narrow reading column, and the page fills the screen so the band is always at the bottom. The static pages draw it from `src/legal/footer-html.ts` and the app's own pages from `SiteFooter` in `src/ui/legal.tsx`.

## Trustpilot link, and the Parents' area footer
- The footer now has a **Leave us a review on Trustpilot** link with a green star, under the email address. It's a plain link to the Trustpilot profile: no Trustpilot script or widget is loaded, so nothing changes in the privacy or cookie wording. (Trustpilot's Free plan doesn't allow its logo or marketing assets, so the star is quarter's own icon, in quarter's colours, and the text is a plain link.)
- The **Help and information** card in the Parents' area uses the same layout as the marketing footer: logo, one-line description, email and Trustpilot link, three link columns and a slim bar for the copyright, company line, subscribe link and credit. When the card is narrower the brand block collapses to a short row. The first-run screens keep a tidied compact footer.
- Small-print links get full 44px tap targets on touch screens and sit tight on a mouse.

## RSS feed without XSLT, and footer credit
The footer credit now reads "Built with curiosity in mind". The feed (`blog/rss.xml`) no longer carries an XSLT stylesheet, because Chrome is removing XSLT and was already showing a red warning banner on the page. Feed readers don't use it, so nothing changes for them. The footer's feed link now goes to the readable subscribe page ("Subscribe to the blog") rather than the raw feed.

## Footer redesign
The page footer on the landing page, the legal pages and every static page (parent guides, FAQs, curriculum, blog, reading list, study guides) now uses its width: the logo, a short line and the email address on the left; three link columns (For parents, Explore, Legal) beside them; and a slim bar underneath with the copyright, company line, RSS feed and credit. Rows sit closer together with a mouse and keep full 44px targets on touch. It switches to a stacked layout based on the footer's own width, so it stays tidy in a narrow column or on a phone. The small cards in the Parents' area and the sign-in screens keep the compact footer. The static pages draw it from `src/legal/footer-html.ts` and the app from `LegalFooter full`, so the two stay the same (`src/legal/footer-html.test.ts`). The screen audit found the small print too small at first (10px) and it's now 13px.

## Crash reporting with Sentry (off until set up)
Browser and server crash reports go to Sentry (EU region) when `VITE_SENTRY_DSN` and `SENTRY_DSN` are set, and nowhere otherwise. Locked down: errors only, no session replay, no tracing, no breadcrumbs, no user, no cookies or browser storage, query strings and typed text never sent, server error messages dropped, noise filtered. A scrubber shared by both sides (`src/monitoring/scrub.ts`) is tested. The privacy notice, cookies page, licences and DPIA now mention it. Setup, including Sentry's IP-address and retention settings, is in `docs/MONITORING.md`.

## FAQ wording and cookies link
The "Read about cookies and browser storage" link on the FAQ page now opens the Cookies page (it pointed at the FAQ page itself, so nothing seemed to happen). The "Where is my child's progress saved?" answer no longer mentions where the database is held; the privacy notice still says it.

## Remembering where people left off, and smaller fixes
- **Remembers the place.** Coming back to Today, Skills (map and list), Plan or Me, or going back from a sub-screen, now puts the page exactly where it was left, including after the app is closed and reopened. The Parents' area remembers its tab, the learning report remembers its period, the guides remember which guide was open, and the Skills list remembers its filters. It's kept on the device only (`quarter.where.v1`: positions and choices, no answers or personal details) and cleared when a learner is deleted. Check: `npm run e2e:memory`.
- **Search panel on Topics.** The Find a topic panel now stays visible until the first topic in the list reaches the top of the page, fades only then, and comes back when you scroll back up past that point. It no longer reacts to scroll speed.
- **Welcome card.** Removed the empty space under the tick box on Create an account.
- **Opening quarter inside Instagram, Facebook, TikTok and similar apps** now shows a short note suggesting Safari or Chrome for sign-in, with a copy-link button, because Google blocks its sign-in in those browsers.
- **Share image.** A new 1200 x 630 image (`og-image-2.png`, made by `npm run` script `scripts/make-og.mjs`) that says "Maths and STEM", with image type and size tags on every page. The file name is versioned so chat apps fetch it afresh.
- **Ops code email.** When Resend refuses the sign-in code email, the screen and the server log now say what Resend said (see `docs/OPS.md`).

## Practice papers timed like real tests
The practice paper screen now has two groups: **Quick practice** (the three short papers) and **Timed like a real test**: Quest-style maths (60 questions, 40 minutes, as Colyton's Quest paper), Ripon-style reasoning and maths (40 non-verbal reasoning questions then about 25 maths, 45 minutes), Maths in 50 minutes (as Bournemouth School for Girls' GL paper) and Maths in 60 minutes (as the Essex CSSE paper). Each says what its timing is based on. The questions are quarter's own and, where a school doesn't publish a question count, the number is ours. Maths and reasoning only: there are no English papers. Results, Fix this and the progress report work as before.

## Full screen audit
Ran the screen audit on 18 sizes (phones from 280px, landscape phones, four portrait and four landscape tablets, laptops to a 2560-wide ultrawide), 43 screens each. The one finding was the Parents' area padlock in the left rail being 36px tall on tablets; it's now at least 44px. Everything else came back clean on every size.

## Skills map starts at the learner's year
On the journey map the avatar now waits at the first topic of the learner's own school year that isn't secure yet (a Year 6 learner starts in Year 6), and the page scrolls there when the map opens, including after the year is changed in the Parents' area. Nothing is locked: the map still runs both ways, so a child or parent can scroll back to an earlier year or ahead to a later one. The coloured part of the trail still shows how far they've really got.

## Landing page header
- "Public beta" is now a small tab hanging from the header under the wordmark, instead of sitting in the line of text under it (where it collided on a phone).
- On touch screens the sticky header is opaque and on its own layer, so it no longer shimmers or wobbles as Safari's toolbar collapses while scrolling.
- The header's Sign in and Create an account buttons no longer wrap onto two lines on a laptop.

## 11+ finder: per-school table
Areas can now list the schools we've checked, in a table (School, Entry test, What we found) with a source and date for each. It reads as stacked cards on a phone. 25 entries are in so far, covering schools and consortia (including Plymouth High School for Girls, Heckmondwike, the Gloucestershire grammar schools, Ripon, Churston, St Joseph's Stoke, Colyton, Bournemouth School, the Trafford, Essex and South West Hertfordshire groups, Newstead Wood and St Olave's), each only where its own page has been read. Lancashire now says plainly that its council pages don't cover selection. Areas with a single council-wide test (Medway, Buckinghamshire, Sutton, Northern Ireland, West Midlands, Bexley and others) keep their area-level note. Other areas keep their links until their school pages are read. `npm run fetch:11plus -- --all` collects pages for every area so more can be added.

## Quick-fire refresher beside Continue
When there's something to pick up on Today, the Quick-fire refresher is now a third pill with its target icon in the "Pick up where you left off" row, next to the Continue buttons (hover or long-press shows the 10 questions and topic count; screen readers read it in full). With nothing to continue, it keeps its own row as before. Check: `npm run e2e:refresher`.

## Ops page for the team (/ops), with a feedback inbox
- A secure page for the team: feedback inbox, numbers, account lookup, audit log. Needs a parent sign-in, an allow-list (`OPS_ADMINS`) and a six-digit code emailed to the admin. Anyone else sees "not found". Setup in `docs/OPS.md`.
- You can reply to parents who ticked "may reply": the email goes out through Resend from hello@, their address is looked up from Clerk and never stored, and the reply is kept under the feedback. A new table (`feedback_replies`, migration 0006) holds it.
- Every view, reply and failed sign-in is audit-logged. DPIA updated. `/ops` is noindex and in `robots.txt`.
- After pulling: restart the app so migration 0006 runs, then add `OPS_ADMINS` and `OPS_SESSION_SECRET` in Secrets.

## 11+ test details for six more areas
- BCP, Calderdale, Liverpool, Reading, Redbridge and Westmorland now show what's known about the entrance test (provider, parts, how to register), each with its source and the date checked. Where a school's page doesn't name the provider it says so, and Redbridge is marked disputed because its sources disagree. Lancashire is still unrecorded.

## Practice paper results, and 11+ research helper
- Practice paper and check-up questions now carry their seed, so a missed one can be asked again exactly. The paper result has a **What to work on** card: the topics missed most, average seconds a question, and a Fix this button for each.
- `npm run fetch:11plus` collects the official school and council pages for the seven 11+ areas with no test recorded (BCP, Calderdale, Lancashire, Liverpool, Reading, Redbridge, Westmorland) into `docs/research/11plus/`, so the details can be filled in with quotes and sources. Those sites were not reachable from the build environment, so nothing was filled from memory.

## Labels on icon buttons
The two help icons on Me now show what they are: instantly on mouse hover and keyboard focus, and on a touch screen when pressed and held (the label fades after a moment, and releasing doesn't open anything). Screen readers always had the label. The reusable `TipButton` (`src/ui/tip.tsx`) is there for other icon-only buttons. Check: `npm run e2e:guides`.

## Learning report: Fix this, then and now, walk-through
- **Fix this:** one button per topic asks the exact questions that went wrong again (from their seeds), then fresh ones at the same level. How it went is saved (`fixes`) and shown as "Fix practice: 2 sets, latest 6 of 8 right".
- **Then and now:** each topic compares wrong answers with the same length of time before, and shows where the topic stands now. A "Looking better" list shows topics that had wrong answers before and none now.
- **Wider logging:** wrong answers in the check-up, practice papers and pathway tests are logged too, with where they came from.
- **Work through this together:** a five-step script under each question: read it, let them try, find where it slipped, work it through, they teach it back.
- **Me page:** "Show me around" and "How quarter works" are now two small icon buttons beside the avatar and name, not two large rows.
Checks: `npm run e2e:report`, `src/engine/learning-report.test.ts`.

## Weekly parent email
An opt-in weekly email (Resend): days practised, questions and accuracy, which topics were tricky and why, and a next step, linking to the learning report. Only sent if the child practised, at most one every 6 days, with one-click unsubscribe. The address is looked up from Clerk when sending and never stored. New table `email_prefs` (migration 0005). A scheduler calls `/api/internal/digest`. Setup: `docs/EMAIL.md`. Privacy notice and DPIA updated. Check: `server/email.test.ts`.

## Learning report, topic search, read aloud in guides, static page header
- **Learning report** (Parents' area, Progress tab): exactly which questions were wrong in a chosen period, what was answered, likely reasons (from the answers and the marking's recognised mistakes), methods to try together, things to ask, the right working-out tool, and links to practise, the lesson and study guides; printable. Questions are logged in `wrongLog` (practice and lessons), kept 120 days, up to 250. Privacy notice and DPIA updated. Check: `npm run e2e:report`.
- **Marketing site:** a new "Drill down into where they're struggling" card and an expanded "How it works" (check-up, a plan that targets the gaps, little and often, see exactly where they're stuck).
- **Topic search** under the filters (Parents' area "Topics, explained" and the Skills list), with wildcards and fuzzy matching. Check: `npm run e2e:topicsearch`.
- **Read aloud** on each guide section. Check: `npm run e2e:guides`.
- **Blog subscribe:** "Subscribe with RSS" now opens a readable page (`/blog/subscribe.html`) with Feedly, Inoreader, NewsBlur, The Old Reader and "open in your feed app" buttons, plus a copy-the-address box. The feed itself (`/blog/rss.xml`) is styled with `rss.xsl`, so opening it directly shows a readable page that points to the subscribe page. Check: `server/seo.test.ts`.
- **Public pages:** the Back button is now compact and in the app's style, and the ™ beside the wordmark sits correctly on every public page (guides, FAQs, curriculum, blog, study and legal pages).

## Focus box on headings
A heading the app focuses on arriving at a screen (Parents' area and every other screen) no longer gets a box drawn round it when a keyboard was last used. Check: `npm run e2e:grownup`.

## Left-hand panel padlock, and Me reorder
The Parents' area is now a collapsed padlock at the bottom of the left-hand panel; tapping it opens the sum and PIN in place and then goes into the Parents' area in the main panel. On a phone it stays as a row on Me. "Show me around" and the children's guide moved to the top of Me. Docs: user guides, GROWN_UP_CONTROLS_REVIEW. Check: `npm run e2e:grownup` (desktop and phone).

## Times tables challenges
60-second blitz and 25-question race, personal bests, a scoreboard and a family board for learners on the same account (can be hidden per learner by a grown-up). Docs: ROADMAP, user guides. Check: `npm run e2e:challenge`.

## User guides
Parents' and children's guides with icons, number badges and sticky-note tips; the children's guide opens from Me without the PIN; both can be printed. Check: `npm run e2e:guides`.

## Parents' area lock
Stays open while in use, locks after five idle minutes, and has a Lock and leave button. Docs: GROWN_UP_CONTROLS_REVIEW.

## Working-out tools and drawing
Column method, number line, hundred square, fraction wall, straight-line pen, ruler and protractor; protractor measuring and drawing topics. KS2 coverage is now 107 of 110 outcomes (docs/KS2_COVERAGE.md). Checks: `e2e:tools`, `e2e:instruments`.

## Weekly refresher
A quick-fire set from the week's topics, from Today and the Parents' area. Check: `e2e:refresher`.

## Worked-example lessons
Model, guided, independent and revisit lessons for about 180 topics. Check: `e2e:lesson`.

## Avatars by year
Original clay set for Years 3 to 5, preteen portraits for Years 6 to 10, teen portraits for Years 11 to 13, with glasses.

## Earlier
KS2 outcome-level coverage audit, STEM lab, curriculum booklet, findability work, ops tools, assessment journey checks and the grown-up controls review. See ROADMAP.md and the other docs.

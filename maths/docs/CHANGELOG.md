# What changed

A running list of what has been added, newest first. Each commit that changes what a learner or parent sees also updates the matching docs, the user guides in `src/guides/content.ts`, and the roadmap. Run the matching checks (`npm test` and the `e2e:*` scripts listed in `docs/ROADMAP.md`) before pushing.

## Search and AI findability refresh
- Sitemap dates moved to today, so crawlers see the changed 11+ page. `/llms-full.txt` now includes the 11+ test notes for every area and the per-school entries, each with its source and confidence. `llms.txt` and the home page's structured data (feature list) now mention the learning report, timed papers, times tables challenges and the weekly email. `/ops` is in `robots.txt` and sends `noindex`. Icons, favicons and the manifest were checked and need no change.

## Email sending address
Emails (the weekly email and the ops sign-in code) now send from `quarter <hello@yourquarter.co.uk>` by default, matching the domain verified in Resend. Set `MAIL_FROM` to use a different verified address. Docs updated.

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

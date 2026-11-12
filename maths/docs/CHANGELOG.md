# What changed

A running list of what has been added, newest first. Each commit that changes what a learner or parent sees also updates the matching docs, the user guides in `src/guides/content.ts`, and the roadmap. Run the matching checks (`npm test` and the `e2e:*` scripts listed in `docs/ROADMAP.md`) before pushing.

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

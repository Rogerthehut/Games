# What changed

A running list of what has been added, newest first. Each commit that changes what a learner or parent sees also updates the matching docs, the user guides in `src/guides/content.ts`, and the roadmap. Run the matching checks (`npm test` and the `e2e:*` scripts listed in `docs/ROADMAP.md`) before pushing.

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

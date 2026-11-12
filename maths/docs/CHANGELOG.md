# What changed

A running list of what has been added, newest first. Each commit that changes what a learner or parent sees also updates the matching docs, the user guides in `src/guides/content.ts`, and the roadmap. Run the matching checks (`npm test` and the `e2e:*` scripts listed in `docs/ROADMAP.md`) before pushing.

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

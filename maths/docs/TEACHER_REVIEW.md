# Teacher review: per-topic help

The learning report (Parents' area) gives grown-ups reasons, a method and questions for each topic a child got wrong. 69 topics (Years 7–13, plus a few earlier ones) now have advice written for that topic alone in `src/engine/topic-help.ts`; the rest use advice for their kind of topic (`src/engine/help-methods.ts`).

**Status: draft. Not yet reviewed by a maths teacher.** Please check each entry for:
- maths accuracy (formulae, sign rules, order of steps);
- whether the "usual reasons" are really the usual ones;
- wording a parent without a maths background can follow;
- anything that differs from how the topic is taught in school (a method named differently, or a shortcut that isn't taught).

Edit the text directly; `npx vitest run src/engine/topic-help.test.ts` checks every entry still has reasons, steps and questions.

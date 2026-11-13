# Data collection for improving quarter

quarter collects **one** kind of learner-level data for product improvement, and only in anonymous form: tallies of how questions go. Everything else a learner does stays in their own saved progress, which belongs to the family (you can download or delete it any time).

## Why

The plan, the check-ups and the question sets are built from curriculum knowledge, not from evidence about real children. The tallies tell us what the real answers look like, so we can:
- find questions or levels that are too hard, too easy, confusing or broken;
- see which wrong answers are common, so hints and "Fix this" practice can target them;
- calibrate difficulty levels and the working-level estimate against many children, not a handful;
- build up evidence to extend coverage and, later, to train or evaluate models on question difficulty (aggregate data only).

## What is collected

When a learner answers a question in practice, a check-up or an in-app practice paper (lessons aren't counted: their questions are guided teaching), the app queues one record, sends it in a batch, and the server adds it to a weekly count:

| Field | Example | Notes |
| --- | --- | --- |
| Week | 2026-11-09 | The Monday. Nothing finer than a week. |
| Topic id | `add-fractions` | The skill, not the question. |
| Level | 2 | Difficulty level within the topic. |
| Age band | `ks2` | Key Stage band, never the exact school year. |
| Result | right first time, right with help, wrong | Counts. |
| Seconds | 12 | Added into a total (0 to 180 per answer). |
| Mistake code | `bigger-denominator` | Short code from the app's own misconception list, only on wrong answers, up to 3. |

## What is not collected

No name or nickname, no parent, learner, account or device identifier, no IP address (the server uses it for rate limits and doesn't write it down), no question text or seed, nothing a child typed, no exact time, no school or location. The server rejects anything that doesn't match these fields, and tests check that the stored rows contain no identifiers.

Because the counts are merged into totals and carry no identifier, a row cannot be traced back to a child, and a child's tallies can't be removed later. That is why a grown-up can switch it **off per learner** (Parents' area, "Help improve quarter's questions"): turning it off stops any more being sent.

## Where it is used

- Ops **Numbers** tab (hardest topics first, minimum 30 answers per level so single answers never show).
- `npm run ops -- questions` and `-- questions --csv` (every weekly row, for analysis).
- Not shared with anyone else, not used for advertising.

## Rules for changing it

Keep it counts only. If we ever want per-question or per-child data (for example for machine learning on individual answer sequences), that is a different thing: it needs a new lawful basis, a DPIA update, parental opt-in, a new privacy-notice version and a solicitor's review before any code is written.

## Where it lives

`src/account/question-stats.ts` (queue and sender), `src/ui/practice.tsx`, `checkup.tsx` and `mock.tsx` (one call per answer; papers give each question an even share of the time because single questions aren't timed), `server/question-stats.ts` (validation, weekly counts, summaries), `POST /api/stats/questions`, migration `0013_question_stats.sql`. Tests: `server/question-stats.test.ts`, `src/account/question-stats.test.ts`.

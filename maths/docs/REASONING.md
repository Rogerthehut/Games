# Reasoning (11+)

Verbal reasoning, non-verbal reasoning and problem solving, for 11+ practice. Fifteen skills, all original, in `src/curriculum/reasoning.ts`.

## Where it lives

- A separate list, `REASONING_SKILLS`, apart from the maths curriculum (`SKILLS`). The check-up, school-year estimate, pathway tests,
  plans and daily practice all use `SKILLS` only, so reasoning never changes a maths score or the Key Stage 2 pathway.
- `ALL_SKILLS` and `SKILL_BY_ID` include both. The Skills page, search and the grown-ups' progress view use them.
- Learners find it from the Skills page ("11+ reasoning" card, or Topic: Reasoning (11+) in the list).

## Skills

| Group | Skills |
| --- | --- |
| Verbal | Odd one out (words), Who is first? (ordering clues), Letter series, Alphabet codes, Number series, Word links |
| Non-verbal | Odd one out (shapes), Shape series, Mirror images, Quarter turns, Picture links |
| Problem solving | Always, sometimes, never; Spot the mistake; Counting possibilities; Logic puzzles |

All are multiple choice (A to E) except Counting possibilities, which takes a number. The new `choice` answer type holds the options
(words, or pictures drawn from shape data) and the position of the right one.

## How answers are kept honest

Each generator checks its own answer, and the tests re-derive it independently, so a puzzle with two right answers is never shown:

- Ordering and logic puzzles are solved by brute force over every possible order.
- Number series, shape series and picture links run an independent solver over the question and require exactly one fitting rule.
- Mirror images and quarter turns are recomputed from the picture.
- "Always true" statements are tested against every pair of numbers from 1 to 60. The statement is only true if nothing breaks it.
- "Spot the mistake" re-does each line's arithmetic.
- Options are compared by what is drawn: a circle looks the same turned, a square repeats every quarter turn, most shapes look the same flipped.

## Not done yet

- Reasoning is not in the 11+ plan or practice paper. Real GL papers include verbal and non-verbal sections, so the paper builder should draw from these skills for schools whose tests use them. Which tests include which sections varies by area (see the test finder).
- More word material: odd-one-out groups and word links are short lists (see `WORD_GROUPS` and `ANALOGIES`). A teacher should review them and add more.
- No hidden-word, word-making or missing-letter question types yet.
- Not reviewed by a teacher or tried with children.

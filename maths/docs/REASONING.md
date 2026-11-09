# Reasoning (11+)

Verbal reasoning, non-verbal reasoning and problem solving, for 11+ practice. Twenty-one skills, all original, in `src/curriculum/reasoning.ts`.

## Where it lives

- A separate list, `REASONING_SKILLS`, apart from the maths curriculum (`SKILLS`). The check-up, school-year estimate, pathway tests,
  plans and daily practice all use `SKILLS` only, so reasoning never changes a maths score or the Key Stage 2 pathway.
- `ALL_SKILLS` and `SKILL_BY_ID` include both. The Skills page, search and the grown-ups' progress view use them.
- Learners find it from the Skills page ("11+ reasoning" card, or Topic: Reasoning (11+) in the list).

## Skills

| Group | Skills |
| --- | --- |
| Verbal | Odd one out (words), Odd one out (numbers), Who is first? (ordering clues), Letter series, Alphabet codes, Number series, Rearrange the letters, Word links, Hidden words, Words that go together, Letter bridge |
| Non-verbal | Odd one out (shapes), Shape series, Mirror images, Quarter turns, Picture links, Grid puzzles (3 by 3) |
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
- Odd one out (numbers) rejects a list if any simple rule (even, a times table, square, prime...) would single out a different number.
- Grid puzzles use a solver that finds every picture that fits the "once in every row and column" and "same along each row" rules.
- Rearrange the letters needs exactly one option made of the same letters as the jumbled word.
- Hidden words, words that go together and letter bridges come from `src/curriculum/word-data.ts`, built by `scripts/make-word-data.py` from a full dictionary (about 235,000 words) and a word-frequency list. A puzzle is only kept if its answer is the only one in the dictionary. The script blocks proper names and words unsuitable for children. To rebuild: `python3 -m venv .venv && .venv/bin/pip install wordfreq english-words && .venv/bin/python scripts/make-word-data.py > src/curriculum/word-data.ts`.
- Options are compared by what is drawn: a circle looks the same turned, a square repeats every quarter turn, most shapes look the same flipped.

## For learners

- The first time a learner meets a skill, the worked example shows a one-line "how this puzzle works" and the answer options.
- Answers can be picked with the keys 1 to 5 or A to E, and Enter checks (unless the learner is typing in a box).
- Pictures are compared by what is drawn, so a turned circle is never offered as a separate option.
- Contrast of the new parts was measured at 6.9:1 or better in light and dark themes.

## For review

`docs/WORD_REVIEW.md` lists every word group, link and generated puzzle word for a teacher to check. Regenerate it after editing the lists.

## Not done yet

- Reasoning is not in the 11+ plan or practice paper. Real GL papers include verbal and non-verbal sections, so the paper builder should draw from these skills for schools whose tests use them. Which tests include which sections varies by area (see the test finder).
- The word lists are still short and should be reviewed and extended by a teacher (`docs/WORD_REVIEW.md`).
- Hidden-word puzzles can offer a wrong option that is an acronym or slang word (for example OLED), because the dictionary does not list those.
- Not reviewed by a teacher or tried with children.

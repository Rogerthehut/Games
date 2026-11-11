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

## Practice papers and plans

- The practice paper now has three formats, chosen on its start screen: a **maths paper** (20 questions, 25 minutes, as before), a **reasoning paper** (20 questions, 20 minutes: 9 verbal, 7 non-verbal, 4 problem solving, in that order) and a **combined paper** (30 questions, 35 minutes: 15 maths first, then 7 verbal, 5 non-verbal, 3 problem solving). Formats and sizes are in `PAPERS` in `src/engine/mock.ts`.
- No skill appears more than twice in a paper. Questions are generated and marked like any other.
- Results show the score by part of the paper. The review lists each miss; for multiple-choice questions it can show the picture and the options with the right one marked.
- In Plan, an 11+ goal can switch on "Include reasoning practice". That adds the reasoning skills to the weekly plan and makes the combined paper the default. Plans without it are unchanged.
- The papers are written in a general 11+ style. Real tests differ in length, order and which parts they include, and the paper screen says so.

## For learners

- The first time a learner meets a skill, the worked example shows a one-line "how this puzzle works" and the answer options.
- Answers can be picked with the keys 1 to 5 or A to E, and Enter checks (unless the learner is typing in a box).
- Pictures are compared by what is drawn, so a turned circle is never offered as a separate option.
- Contrast of the new parts was measured at 6.9:1 or better in light and dark themes.

## For review

`docs/WORD_REVIEW.md` lists every word group, link and generated puzzle word for a teacher to check. Regenerate it after editing the lists.

## Not done yet

- Which sections a given school or area test includes is not recorded, so the choice of paper is left to the family. The test finder could later say which parts each area uses, once that has been checked.
- Paper timings and the mix of question types are estimates, not taken from any provider.
- The word lists are still short and should be reviewed and extended by a teacher (`docs/WORD_REVIEW.md`).
- Hidden-word puzzles can offer a wrong option that is an acronym or slang word (for example OLED), because the dictionary does not list those.
- Not reviewed by a teacher or tried with children.

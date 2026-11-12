# Content plan: Key Stage 3, GCSE and A-level

quarter says "KS2 - A-Level Maths" and "Years 3 to 13". Key Stage 2 is the deepest. This plan builds the rest in a sensible order.
Every new topic is a generator in `src/curriculum/` that works out its own answer, so the answer, the worked steps and the
common mistakes cannot disagree. `src/engine/engine.test.ts` checks 150 questions at each of three levels for every topic.

## Where things stand (after batch 1)

| Stage | Years | Topics now |
|---|---|---|
| Key Stage 2 | 3 to 6 | 89 (was 32; batches 2, 3, the money set, the second pass and the outcome-level audit, see KS2_COVERAGE.md) |
| Key Stage 3 | 7 to 9 | 40 (was 8; batch 1, the money set, batch 4 and the second pass) |
| GCSE | 10 and 11 | 37 (was 8; batch 1, batch 5 and the second pass) |
| A-level | 12 and 13 | 35 (was 4; batch 1, batch 6 and the second pass) |

Batch 1 added 18 topics: negative-number calculation, area of triangles and trapeziums, percentage change, angles in parallel lines,
speed/distance/time, circumference, laws of indices, volume of prisms, compound interest, upper and lower bounds, composite functions,
probability of two events, similar shapes, arithmetic series, logarithm laws, the chain rule, sum to infinity, binomial coefficients.

Batch 2 (Key Stage 2, Years 3 and 4) added 13 topics: counting in steps, same-denominator fractions, adding and taking away lengths and
amounts, perimeter of shapes, right angles and turns, pictograms, Roman numerals, counting through zero, dividing by 10 and 100,
converting units of time, area by counting squares, perimeter of compound shapes, lines of symmetry and reading tables.
Still to do for Years 3 and 4: analogue and Roman numeral clocks, scales, 3-D shapes, plotting and drawing on grids, time graphs.
Batch 3 (Key Stage 2, Years 5 and 6) added 14 topics: numbers to a million, prime, square and cube numbers, multiplying fractions by whole
numbers, 3-D shapes, metric and imperial units, multiplying fractions, dividing fractions by whole numbers, fractions-decimals-percentages,
scale factors and maps, missing-number equations, two unknowns, parallelogram area, coordinates in four quadrants, parts of a circle and pie chart angles.
Still to do for Years 5 and 6: roman numerals to 1,000 in context, long multiplication and division checks, nets, reflection and translation,
line graphs, timetables, and mean as a choice of average.

The money set added 11 topics across the years: coins and notes (Year 3), pounds and pence with decimals, adding and subtracting money
(Year 4), shopping bills, multiplying and dividing money (Year 5), best value, changing currency (Year 6), profit and loss (Year 7),
simple interest, VAT and wages (Year 8) and budgets (Year 9). Compound interest was already in GCSE.

## Order of work

1. **Years 7 to 9 (Key Stage 3), the foundations GCSE rests on.** Next: equivalent fractions and ordering with negatives, fractions of amounts
   with unlike denominators, multiplying and dividing fractions, ratio with unequal sharing, proportion and best buys, expressions (factorising
   with a common factor), formulae and substitution with negatives, inequalities, sequences (nth term), straight-line graphs (y = mx + c),
   angles in triangles and quadrilaterals, constructions and loci, transformations (reflection, rotation, translation, enlargement),
   perimeter and area of compound shapes, averages from tables, scatter graphs, probability (listing outcomes), prime factors, HCF and LCM.
2. **Year 10 and 11 (GCSE), tied to the Foundation and Higher specifications.** Next: quadratic formula and completing the square, solving
   inequalities, algebraic fractions, rearranging formulae, direct and inverse proportion, surds, exact trigonometric values, sine and cosine
   rules, area of a triangle using sine, circle theorems, vectors, arcs and sectors, surface area and volume of cones and spheres,
   histograms, cumulative frequency and box plots, conditional probability, growth and decay, iteration.
3. **Year 12 and 13 (A-level).** Next: algebraic division and the factor theorem, partial fractions, trigonometric identities and equations,
   radians, exponentials and logarithms in context, differentiation (product, quotient), integration (by substitution and parts), differential
   equations, vectors in 3D, statistics (normal distribution, hypothesis tests), mechanics (projectiles, forces, moments).
4. **Key Stage 2 gaps.** Work through the table in `docs/ROADMAP.md` year by year in parallel.

## How each batch is built

- 8 to 12 topics a batch, from one year or one strand, so the year's pathway stays coherent.
- Each topic gets three difficulty levels, an explainer for the child, a "how to explain it" note and a "ask them" question for the parent.
- Common mistakes are recorded where there is a real, frequent one (for example, adding the powers when raising a power to a power).
- A teacher or subject specialist reviews each batch before it is called finished, using the real specification for GCSE and A-level.
- The marketing claim should be reviewed again when each stage has a fuller set of topics.

## The STEM lab (first batch built)

Its own area on Today, with a mint sticky note under the times tables one (side panel on wide screens, top of Today on narrow ones). It is separate from the maths plan, the skills map and the 11+ papers, and uses the same practice engine, so progress, hints, read-aloud and the AI tutor all work.

29 topics in four themes, each idea pitched for the age:

| Stage | Computing | Data science | AI and machine learning | Quantum ideas |
|---|---|---|---|---|
| KS2 (Years 3 to 6) | instructions, loops, inputs and outputs, sorting, debugging | data detective | learning from examples | |
| KS3 (Years 7 to 9) | binary, hexadecimal, tracing code, logic, data types | outliers | bias, nearest neighbour, a tiny neuron, accuracy | |
| KS4 (Years 10 and 11) | binary search, how work grows, storage, Caesar ciphers | | spam and probability | quantum ideas |
| KS5 (Years 12 and 13) | information and bits | | gradient descent, a network layer | qubits, qubit states, quantum gates |

Still to do: study-library pages for the STEM ideas, drawn figures (flowcharts, decision trees, qubit pictures), a "build it" activity per theme, a STEM section in the progress report, and a teacher or computer-science specialist review. Planned to be bundled with the subscription; nothing is gated while quarter is a free public beta.

## The curriculum booklet

A designed A4 booklet of everything quarter covers (51 pages: how it works, each stage and year with the "Ask" question for every topic, the 11+ strand, the STEM lab, tools, the study library and tips for helping at home). It is built from the live curriculum data in `src/booklet/model.ts`, so topics can't drift out of date.

- **Flip-through reader:** Parents' area, Settings, Curriculum booklet, Read online. Two-page spreads on wide screens, one page on phones, with a chapter menu, arrow keys, swipe and zoom.
- **PDF:** `npm run booklet` prints it to `server/assets/quarter-curriculum.pdf` (needs Playwright with Chromium) and reports any page that overflows. Run it again, and commit the PDF, whenever topics change. The download is served only to signed-in parents who have agreed to the terms and, once payments are on, have a subscription (`GET /api/account/booklet`).

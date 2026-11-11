# Content plan: Key Stage 3, GCSE and A-level

quarter says "KS2 - A-Level Maths" and "Years 3 to 13". Key Stage 2 is the deepest. This plan builds the rest in a sensible order.
Every new topic is a generator in `src/curriculum/` that works out its own answer, so the answer, the worked steps and the
common mistakes cannot disagree. `src/engine/engine.test.ts` checks 150 questions at each of three levels for every topic.

## Where things stand (after batch 1)

| Stage | Years | Topics now |
|---|---|---|
| Key Stage 2 | 3 to 6 | 59 (was 32; batches 2 and 3 added 27 for Years 3 to 6) |
| Key Stage 3 | 7 to 9 | 14 (was 8) |
| GCSE | 10 and 11 | 13 (was 8), including Year 11 for the first time |
| A-level | 12 and 13 | 8 (was 4), including Year 13 for the first time |

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

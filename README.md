# Games

## Wildlands (`/wildlands`)
Browser open-world adventure inspired by Breath of the Wild. Three.js + TypeScript + Vite.

```
cd wildlands
npm install
npm run dev
```

Controls: WASD move, Shift run, Space jump, mouse look, **P** saves a cartridge (downloads `wildlands-save.json`).
Load a cartridge from the title screen or drag the file onto the page.

Roadmap: 1 terrain/controller/saves (done) · 2 climbing/gliding · 3 elemental simulation · 4 combat/AI · 5 shrines/items/cooking · 6 polish.

## MathPath (`/maths`)
Maths for ages 7 to 18 following the UK National Curriculum (KS2, KS3, GCSE, A-level), with an adaptive check-up, an action plan and 11+ preparation. Preact + TypeScript + Vite; works on phone, tablet and desktop.

```
cd maths
npm install
npm run dev     # develop
npm test        # ~8,000 generated questions are checked, plus simulated children for the check-up
npm run build
```

- **Content:** 33 skills from Year 3 to Year 12. Questions are generated at three levels with worked solutions and the common mistakes each can recognise.
- **Check-up:** 24 adaptive questions on a school-year scale. Estimates a working level, per-topic levels and gaps, and probes prerequisites after a surprising miss. No feedback during the test; it can be paused and resumed. Validated against simulated children (median level error about 0.26 of a school year).
- **Report:** working level with an uncertainty range, topic bars against the school year, gaps and strengths, and an indicative 11+ readiness band. It says plainly what it can't tell you. It is not a standardised score and is not a GL or CEM score.
- **Plan:** week-by-week from the gaps, built to a chosen exam date and sessions per week, with revision and mock-paper weeks. Plan topics steer daily practice.
- **11+ set-up:** exam type (GL style, CEM style, not sure), coarse area, schools as typed. Stored on the device only. CEM-style practice is not built yet; the exam format is meant to become a configurable profile.
- **Mock paper:** 20 original questions in a general 11+ style with a 25 minute guide timer, marks at the end, and a review of every mistake with steps.
- **Practice:** spaced repetition (Leitner boxes), hints and worked examples, kind feedback. Grown-up view with weekly progress, repeated mistakes, how to explain each topic, and a focus switch.
- **Data:** progress is stored on the device; export and import as text or a file.

Not built yet: AI tutor (needs a backend, safety rules and a parent-visible log), accounts and payments, GL-calibrated item difficulties (needs real response data), CEM-style papers, offline install.

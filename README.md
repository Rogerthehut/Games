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
Maths for ages 11-18 following the UK National Curriculum (KS3, GCSE, A-level). Preact + TypeScript + Vite, installable as a web app, works on phone, tablet and desktop.

```
cd maths
npm install
npm run dev     # develop
npm test        # ~6,000 generated questions are checked for correctness
npm run build
```

- Questions are generated, so there is always a fresh one, at three difficulty levels per skill, each with a worked solution and the common mistakes it can recognise.
- Spaced repetition (Leitner boxes) brings skills back after 1, 3, 7, 14 and 30 days. Wrong answers drop a box; hints do not count as mastery.
- Grown-up view: weekly progress, repeated mistakes in plain English, how to explain each topic, a question to ask, and a "focus this week" switch for home schooling.
- Progress is stored on the device. Export/import as text or a file to move between devices.

import { int, pick } from "../engine/rng";
import type { Question, Skill } from "../engine/types";

/**
 * Measuring and drawing with a protractor and a grid, for the Key Stage 2 outcomes "draw given angles and measure them in degrees"
 * and "draw 2-D shapes using given dimensions and angles". Measuring reads a drawn protractor. The two drawing topics are interactive:
 * the learner turns an arm or moves a corner, and what they have drawn becomes their answer.
 */
const question = (skill: string, level: number, q: Pick<Question, "prompt" | "figure" | "answer" | "hint" | "solution" | "shown">): Question => ({ skill, level, ...q });
const angleKind = (a: number) => (a < 90 ? "acute" : a === 90 ? "a right angle" : a < 180 ? "obtuse" : "a straight line");
const pickAngle = (r: () => number, level: number) => (level === 1 ? 10 * int(r, 2, 16) : level === 2 ? 5 * int(r, 3, 33) : int(r, 12, 168));

export const ks2InstrumentSkills: Skill[] = [
  {
    id: "measure-angles", name: "Measuring angles with a protractor", stage: "KS2", year: 5, strand: "Geometry", prereqs: ["angles-basic"],
    blurb: "Read the size of an angle from a protractor, using the right scale.",
    explainer: "A protractor has two scales. Line one arm up with the 0 and read round the same scale to the other arm.",
    parentNote: "Use a real protractor too. The common slip is reading the wrong scale: check whether the angle is acute (under 90°) or obtuse (over 90°) first, then choose the number that makes sense.",
    talkAbout: "How can you tell which scale to read before you look at the numbers?",
    generate(r, level) {
      const from = pick(r, ["left", "right"] as const);
      const angle = pickAngle(r, level);
      const scale = from === "right" ? "outer" : "inner";
      return question("measure-angles", level, {
        figure: { type: "protractor", angle, from, alt: `A protractor over an angle. The first arm points ${from} along the straight edge, along the 0. The other arm is the angle to read.` },
        prompt: "What is the size of the angle? Read it from the protractor.",
        answer: { kind: "number", value: angle, unit: "°", ...(level === 3 ? { tol: 2 } : {}) },
        hint: `The arm along the straight edge points ${from}, so start at the 0 on the ${scale} scale and read round to the other arm. Check: should the angle be bigger or smaller than a right angle?`,
        solution: [`One arm points ${from} along the straight edge. The 0 on that side is on the ${scale} scale.`, `Reading round the ${scale} scale to the other arm gives ${angle}°.`, `It is ${angleKind(angle)}, which fits.`],
        shown: `${angle}°`,
      });
    },
  },
  {
    id: "draw-angles", name: "Drawing angles with a protractor", stage: "KS2", year: 5, strand: "Geometry", prereqs: ["measure-angles"], interactive: true,
    blurb: "Draw an angle of a given size by turning an arm on a protractor.",
    explainer: "To draw an angle, put the protractor on the 0, find the size you want on the same scale, and draw the second arm to that mark.",
    parentNote: "Draw one on paper as well: mark the angle on a protractor, join it to the point, and measure it back to check. Drag the blue arm, or use the buttons for exact steps.",
    talkAbout: "How can you check an angle you have drawn?",
    generate(r, level) {
      const angle = pickAngle(r, level);
      const start = angle < 80 ? 150 : 20;
      return question("draw-angles", level, {
        figure: { type: "angle-draw", start, alt: `A protractor with a straight arm along the 0 and a blue arm you can turn. It is set to ${start} degrees.` },
        prompt: `Draw an angle of $${angle}^\\circ$. Turn the blue arm until the angle is the right size, then check.`,
        answer: { kind: "number", value: angle, tol: level === 1 ? 3 : 2, unit: "°" },
        hint: `Start from the 0 on the straight arm. Turn the blue arm round the scale to ${angle}°. ${angleKind(angle) === "acute" ? "It should be smaller than a right angle." : angleKind(angle) === "obtuse" ? "It should be bigger than a right angle." : ""}`.trim(),
        solution: [`The straight arm is on the 0.`, `Turn the blue arm round the scale until it points at ${angle}°.`, `The angle between the arms is ${angle}°.`],
        shown: `${angle}°`,
      });
    },
  },
  {
    id: "draw-shapes", name: "Drawing shapes from measurements", stage: "KS2", year: 6, strand: "Geometry", prereqs: ["rectangle-properties", "draw-angles"], interactive: true,
    blurb: "Draw rectangles and right-angled triangles with the sizes given, on a centimetre grid.",
    explainer: "To draw a shape from its measurements, mark the lengths on the grid. A rectangle has four right angles. A right-angled triangle has a square corner where its two short sides meet.",
    parentNote: "Try it with a ruler on squared paper too. A rectangle's opposite sides are equal, so if you know the perimeter and one side you can work out the other.",
    talkAbout: "How do you know the corner you drew is a right angle?",
    generate(r, level) {
      const w = int(r, 2, 7), h = int(r, 2, 5);
      const rectAlt = "A grid of 1 centimetre squares with a rectangle that has one corner at the bottom left. Drag the top right corner to change its size.";
      if (level === 1) return question("draw-shapes", level, {
        figure: { type: "shape-draw", cols: 8, rows: 6, shape: "rectangle", target: [w, h], alt: rectAlt },
        prompt: `Each square is 1 cm. Draw a rectangle that is $${w}$ cm wide and $${h}$ cm tall. Drag the corner, then check.`,
        answer: { kind: "number", value: 1 }, hint: `Make it ${w} squares across and ${h} squares up.`,
        solution: [`Width: ${w} squares across.`, `Height: ${h} squares up.`, `Draw the other two sides at right angles.`], shown: `${w} cm by ${h} cm`,
      });
      if (level === 2) return question("draw-shapes", level, {
        figure: { type: "shape-draw", cols: 8, rows: 6, shape: "triangle", target: [w, h], alt: "A grid of 1 centimetre squares with a right-angled triangle. Its right angle is at the bottom left. Move its two other points along the bottom and the side." },
        prompt: `Each square is 1 cm. Draw a right-angled triangle whose two short sides are $${w}$ cm and $${h}$ cm. The right angle is at the bottom left. Move the two points, then check.`,
        answer: { kind: "number", value: 1 }, hint: `One short side goes ${w} squares along the bottom. The other goes ${h} squares up the side.`,
        solution: [`The two short sides meet at the right angle.`, `Mark ${w} cm along the bottom and ${h} cm up the side.`, `Join the two ends to finish the triangle.`], shown: `short sides ${w} cm and ${h} cm`,
      });
      const perimeter = 2 * (w + h);
      return question("draw-shapes", level, {
        figure: { type: "shape-draw", cols: 8, rows: 6, shape: "rectangle", target: [w, h], alt: rectAlt },
        prompt: `Each square is 1 cm. Draw a rectangle with a perimeter of $${perimeter}$ cm and a width of $${w}$ cm. Work out its height first.`,
        answer: { kind: "number", value: 1 }, hint: `Half the perimeter is one width plus one height.`,
        solution: [`Half the perimeter is ${perimeter} ÷ 2 = ${w + h}.`, `Height = ${w + h} − ${w} = ${h} cm.`, `Draw a rectangle ${w} cm wide and ${h} cm tall.`], shown: `${w} cm by ${h} cm`,
      });
    },
  },
];

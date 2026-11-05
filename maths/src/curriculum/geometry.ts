import type { Question, Skill } from "../engine/types";
import { int, pick, round } from "../engine/rng";
import { dedupeWrong } from "./helpers";

const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];

function pythagoras(r: () => number, level: number): Question {
  let a = 0, b = 0, c = 0, findHyp: boolean;
  const integer = level < 3;
  if (integer) {
    const [x, y, z] = pick(r, TRIPLES);
    const k = level === 1 ? 1 : int(r, 1, 2);
    [a, b, c] = r() < 0.5 ? [x * k, y * k, z * k] : [y * k, x * k, z * k];
    findHyp = level === 1 ? true : r() < 0.3;
  } else {
    findHyp = r() < 0.5;
    do {
      if (findHyp) { a = int(r, 3, 12); b = int(r, 3, 12); c = Math.hypot(a, b); }
      else { c = int(r, 6, 15); b = int(r, 3, c - 1); a = Math.sqrt(c * c - b * b); }
    } while (findHyp ? Number.isInteger(c) : Number.isInteger(a));
  }
  // In every case a and b are the two short sides and c the hypotenuse.
  const hypLabel = findHyp ? "x" : `${integer ? c : round(c, 1)} cm`;
  const baseLabel = findHyp ? `${integer ? a : round(a, 1)} cm` : "x";
  const exact = findHyp ? c : a;
  const ans = integer ? exact : round(exact, 1);
  const dp = integer ? "" : " Give your answer to 1 decimal place.";
  const wrongNum = findHyp ? a * a + b * b : Math.sqrt(c * c + b * b);
  const q: Question = {
    skill: "pythagoras", level,
    prompt: `Find the length $x$ in this right-angled triangle.${dp}`,
    figure: { type: "rtriangle", base: baseLabel, height: `${b} cm`, hyp: hypLabel },
    answer: { kind: "number", value: ans, tol: integer ? 1e-9 : 1e-4, label: "x =" },
    hint: findHyp
      ? "Use $a^{2} + b^{2} = c^{2}$, where $c$ is the longest side (opposite the right angle)."
      : "Use $a^{2} + b^{2} = c^{2}$. Here you know the longest side, so you need to subtract.",
    solution: findHyp
      ? [`$x^{2} = ${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${a * a + b * b}$.`, `$x = \\sqrt{${a * a + b * b}} = ${ans}$.`]
      : [`$x^{2} + ${b}^{2} = ${integer ? c : round(c, 1)}^{2}$, so $x^{2} = ${round(c * c, 2)} - ${b * b} = ${round(c * c - b * b, 2)}$.`, `$x = \\sqrt{${round(c * c - b * b, 2)}} = ${ans}$.`],
    shown: `$x = ${ans}$`,
    wrong: dedupeWrong(
      [
        { tag: findHyp ? "forgot-root" : "added-squares", number: findHyp ? wrongNum : round(wrongNum, integer ? 0 : 1),
          message: findHyp ? "That's $x^{2}$. Take the square root to find $x$." : "When the longest side is known, subtract the squares instead of adding them." },
        ...(integer ? [] : [{ tag: "rounding", number: round(exact, 2), message: "Round your answer to 1 decimal place." }]),
      ],
      ans,
    ),
  };
  return q;
}

const POLYGONS: Record<number, string> = { 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon", 12: "dodecagon" };

function polygonAngles(r: () => number, level: number): Question {
  if (level === 1) {
    const n = pick(r, [5, 6, 7, 8, 9, 10, 12]);
    const sum = (n - 2) * 180;
    return {
      skill: "angles-polygon", level,
      prompt: `What is the sum of the interior angles of a ${POLYGONS[n]} (a ${n}-sided polygon)? Answer in degrees.`,
      answer: { kind: "number", value: sum },
      hint: "Split the polygon into triangles from one corner. Each triangle has angles adding to 180°.",
      solution: [`From one corner you can draw $${n - 3}$ lines, splitting the shape into $${n - 2}$ triangles.`, `$${n - 2} \\times 180 = ${sum}$ degrees.`],
      shown: `$${sum}^\\circ$`,
      wrong: dedupeWrong([{ tag: "forgot-minus-2", number: n * 180, message: `The number of triangles is $${n} - 2$, not $${n}$.` }], sum),
    };
  }
  if (level === 2) {
    const n = pick(r, [5, 6, 8, 9, 10, 12]);
    const each = ((n - 2) * 180) / n;
    return {
      skill: "angles-polygon", level,
      prompt: `What is the size of each interior angle of a regular ${POLYGONS[n]}? Answer in degrees.`,
      answer: { kind: "number", value: each },
      hint: "First find the sum of the interior angles, then share it equally between the angles.",
      solution: [`Sum of interior angles: $(${n} - 2) \\times 180 = ${(n - 2) * 180}$.`, `Each angle: $${(n - 2) * 180} \\div ${n} = ${each}$ degrees.`],
      shown: `$${each}^\\circ$`,
      wrong: dedupeWrong([{ tag: "forgot-divide", number: (n - 2) * 180, message: "That's the total of all the angles. A regular polygon shares it equally, so divide by the number of sides." }], each),
    };
  }
  const e = pick(r, [10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72]);
  return {
    skill: "angles-polygon", level,
    prompt: `Each exterior angle of a regular polygon is $${e}^\\circ$. How many sides does the polygon have?`,
    answer: { kind: "number", value: 360 / e },
    hint: "The exterior angles of any polygon add up to 360°.",
    solution: [`Exterior angles sum to $360^\\circ$.`, `Number of sides: $360 \\div ${e} = ${360 / e}$.`],
    shown: `$${360 / e}$`,
  };
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;
type Fn = "sin" | "cos" | "tan";
const f: Record<Fn, (x: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan };

function trig(r: () => number, level: number): Question {
  if (level === 3) {
    const kind = pick(r, ["tan", "sin", "cos"] as Fn[]);
    let opp: number, adj: number, hyp: number;
    if (kind === "tan") { opp = int(r, 3, 15); adj = int(r, 3, 15); hyp = Math.hypot(opp, adj); }
    else if (kind === "sin") { hyp = int(r, 6, 20); opp = int(r, 2, hyp - 1); adj = Math.sqrt(hyp * hyp - opp * opp); }
    else { hyp = int(r, 6, 20); adj = int(r, 2, hyp - 1); opp = Math.sqrt(hyp * hyp - adj * adj); }
    const ratio = kind === "tan" ? opp / adj : kind === "sin" ? opp / hyp : adj / hyp;
    const angle = round(deg({ sin: Math.asin, cos: Math.acos, tan: Math.atan }[kind](ratio)), 1);
    const names = { tan: ["O", "A", `\\frac{${opp}}{${adj}}`], sin: ["O", "H", `\\frac{${opp}}{${hyp}}`], cos: ["A", "H", `\\frac{${adj}}{${hyp}}`] }[kind];
    return {
      skill: "trig", level,
      prompt: `Find the angle $\\theta$. Give your answer to 1 decimal place.`,
      figure: { type: "rtriangle", base: kind === "sin" ? "" : `${adj} cm`, height: kind === "cos" ? "" : `${opp} cm`, hyp: kind === "tan" ? "" : `${hyp} cm`, angle: "θ" },
      answer: { kind: "number", value: angle, tol: 1e-4, label: "θ =" },
      hint: "Label the sides O (opposite), A (adjacent), H (hypotenuse) from the angle. Which two do you know? SOH CAH TOA tells you the ratio.",
      solution: [
        `You know the ${names[0] === "O" ? "opposite" : "adjacent"} and the ${names[1] === "A" ? "adjacent" : "hypotenuse"}, so use $\\${kind}\\theta = ${names[2]}$.`,
        `$\\theta = \\${kind}^{-1}\\left(${names[2]}\\right) = ${angle}^\\circ$ (calculator in degrees mode).`,
      ],
      shown: `$\\theta = ${angle}^\\circ$`,
    };
  }
  type Case = { fn: Fn; known: "opp" | "adj" | "hyp"; unknown: "opp" | "adj" | "hyp" };
  const easy: Case[] = [{ fn: "tan", known: "adj", unknown: "opp" }, { fn: "sin", known: "hyp", unknown: "opp" }, { fn: "cos", known: "hyp", unknown: "adj" }];
  const hard: Case[] = [...easy, { fn: "sin", known: "opp", unknown: "hyp" }, { fn: "cos", known: "adj", unknown: "hyp" }, { fn: "tan", known: "opp", unknown: "adj" }];
  const cs = pick(r, level === 1 ? easy : hard);
  const theta = int(r, 20, 70), L = int(r, 5, 20);
  const ratio = f[cs.fn](rad(theta));
  const isMult = (cs.fn === "tan" && cs.unknown === "opp") || (cs.fn === "sin" && cs.unknown === "opp") || (cs.fn === "cos" && cs.unknown === "adj");
  const val = isMult ? L * ratio : L / ratio;
  const ans = round(val, 1);
  const wrongRatio = f[cs.fn](theta);
  const wrongVal = round(isMult ? L * wrongRatio : L / wrongRatio, 1);
  const label = (s: "opp" | "adj" | "hyp") => (cs.known === s ? `${L} cm` : cs.unknown === s ? "x" : "");
  const word = { opp: "opposite", adj: "adjacent", hyp: "hypotenuse" };
  const frac = isMult ? `\\frac{x}{${L}}` : `\\frac{${L}}{x}`;
  return {
    skill: "trig", level,
    prompt: `Find the length $x$. Give your answer to 1 decimal place.`,
    figure: { type: "rtriangle", base: label("adj"), height: label("opp"), hyp: label("hyp"), angle: `${theta}°` },
    answer: { kind: "number", value: ans, tol: 1e-4, label: "x =" },
    hint: `From the ${theta}° angle, the side you know is the ${word[cs.known]} and the side you want is the ${word[cs.unknown]}. Which of SOH, CAH, TOA uses those two?`,
    solution: [
      `Known: ${word[cs.known]}. Wanted: ${word[cs.unknown]}. That's ${cs.fn === "sin" ? "SOH" : cs.fn === "cos" ? "CAH" : "TOA"}: $\\${cs.fn} ${theta}^\\circ = ${frac}$.`,
      isMult ? `Rearrange: $x = ${L} \\times \\${cs.fn} ${theta}^\\circ$.` : `Rearrange: $x = ${L} \\div \\${cs.fn} ${theta}^\\circ$.`,
      `Calculate (calculator in degrees mode): $x = ${ans}$.`,
    ],
    shown: `$x = ${ans}$`,
    wrong: dedupeWrong([{ tag: "radians", number: wrongVal, message: "That answer looks like it came from a calculator in radians mode. Switch it to degrees (DEG) and try again." }], ans),
  };
}

export const geometrySkills: Skill[] = [
  { id: "pythagoras", name: "Pythagoras' theorem", stage: "KS3", year: 9, strand: "Geometry", blurb: "Find missing sides of right-angled triangles.", prereqs: [],
    parentNote: "In a right-angled triangle the squares on the two shorter sides add up to the square on the longest side. Always identify the longest side (the hypotenuse) first.",
    talkAbout: "How do you know which side is the hypotenuse? When do you add the squares and when do you subtract?", generate: pythagoras },
  { id: "angles-polygon", name: "Angles in polygons", stage: "KS3", year: 9, strand: "Geometry", blurb: "Interior and exterior angles.", prereqs: [],
    parentNote: "Any polygon can be cut into triangles from one corner, and each triangle has 180°. Exterior angles of any polygon always total 360°.",
    talkAbout: "Why do exterior angles always add to 360°? (Imagine walking around the shape.)", generate: polygonAngles },
  { id: "trig", name: "Right-angled trigonometry", stage: "KS4", year: 10, strand: "Geometry", blurb: "Use sin, cos and tan to find sides and angles.", prereqs: ["pythagoras", "solve-linear"],
    parentNote: "Label the sides relative to the angle: opposite, adjacent, hypotenuse. SOH CAH TOA picks the right ratio. Calculators must be in degree mode.",
    talkAbout: "How do you decide whether to use sin, cos or tan?", generate: trig },
];

import { int, pick, round, type Rng } from "../engine/rng";
import { circleFig, parallelogramFig, trapeziumFig, triangleBaseHeightFig } from "./figures";
import type { Figure, Question, Skill } from "../engine/types";
import { frac } from "./helpers";

/**
 * More of Key Stage 3, GCSE and A-level, written the same way as the rest: each question works out its own answer,
 * so the answer, the worked steps and the common mistakes can never disagree. See docs/CONTENT_PLAN.md.
 */
type Task = {
  prompt: string; value: number; hint: string; solution: string[]; unit?: string; shown?: string;
  wrong?: { tag: string; message: string; number: number }[]; figure?: Figure;
};

function num(info: Omit<Skill, "generate">, task: (r: Rng, level: number) => Task): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      return {
        skill: info.id, level, prompt: t.prompt, answer: { kind: "number", value: t.value, unit: t.unit },
        hint: t.hint, solution: t.solution, shown: t.shown ?? `${t.value}${t.unit ? ` ${t.unit}` : ""}`,
        wrong: t.wrong, figure: t.figure,
      };
    },
  };
}

const paren = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const money = (n: number) => `£${n.toFixed(2).replace(/\.00$/, "")}`;
const nCr = (n: number, k: number) => { let v = 1; for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i; return Math.round(v); };

export const secondarySkills: Skill[] = [
  // ---------------------------------------------------------------- Key Stage 3
  num({
    id: "negative-ops", name: "Calculating with negative numbers", stage: "KS3", year: 7, strand: "Number", prereqs: ["negative-numbers"],
    blurb: "Add, take away, multiply and divide with negative numbers.",
    explainer: "Two minus signs together make a plus. A negative times a negative is a positive.",
    parentNote: "Use a number line for adding and taking away, then the pattern 'same signs give positive, different signs give negative' for multiplying and dividing.",
    talkAbout: "What is $5 - (-2)$ on a number line, and why does taking away a negative go up?",
  }, (r, l) => {
    if (l === 1) {
      const a = int(r, 3, 12), b = int(r, 1, a - 1);
      return { prompt: `Calculate $${a} + (-${b})$.`, value: a - b, hint: "Adding a negative number is the same as taking that number away.", solution: [`$+(-${b})$ means take away ${b}.`, `$${a} - ${b} = ${a - b}$.`] };
    }
    if (l === 2) {
      const a = int(r, 2, 12), b = int(r, 2, 12);
      return { prompt: `Calculate $${a} - (-${b})$.`, value: a + b, hint: "Two minus signs together make a plus.",
        solution: [`$-(-${b})$ becomes $+${b}$.`, `$${a} + ${b} = ${a + b}$.`], wrong: [{ tag: "minus-minus", number: a - b, message: `Taking away a negative makes the number bigger: $${a} - (-${b}) = ${a} + ${b}$.` }] };
    }
    const a = int(r, 2, 9), b = int(r, 2, 9), negA = r() < 0.5, negB = r() < 0.5;
    const x = negA ? -a : a, y = negB ? -b : b, same = negA === negB, word = same ? "positive" : "negative";
    const tell = same ? "The signs are the same" : "The signs are different";
    if (r() < 0.4) {
      const dividend = x * y, value = x; // (x times y) divided by y is x
      return { prompt: `Calculate $${paren(dividend)} \\div ${paren(y)}$.`, value, hint: "Same signs give a positive answer. Different signs give a negative answer.",
        solution: [`Ignore the signs first: $${Math.abs(dividend)} \\div ${b} = ${a}$.`, `${tell}, so the answer is ${value < 0 ? "negative" : "positive"}: $${value}$.`] };
    }
    return { prompt: `Calculate $${paren(x)} \\times ${paren(y)}$.`, value: x * y, hint: "Same signs give a positive answer. Different signs give a negative answer.",
      solution: [`Ignore the signs first: $${a} \\times ${b} = ${a * b}$.`, `${tell}, so the answer is ${word}: $${x * y}$.`] };
  }),
  num({
    id: "area-triangle", name: "Area of triangles and trapeziums", stage: "KS3", year: 7, strand: "Measures", prereqs: ["perimeter-area"],
    blurb: "Find the area of a triangle, parallelogram or trapezium.",
    explainer: "A triangle is half of a rectangle with the same base and height.",
    parentNote: "Show a triangle cut from a rectangle, so the half is something they can see. The height always meets the base at a right angle.",
    talkAbout: "Why is the area of a triangle half of base times height?",
  }, (r, l) => {
    if (l === 1) {
      const b = int(r, 2, 12) * 2, h = int(r, 3, 12);
      return { figure: triangleBaseHeightFig(b, h), prompt: `A triangle has a base of ${b} cm and a perpendicular height of ${h} cm. Work out its area.`, value: (b * h) / 2, unit: "cm²", hint: "Area of a triangle = base × height ÷ 2.",
        solution: [`Multiply the base by the height: ${b} × ${h} = ${b * h}.`, `Halve it: ${b * h} ÷ 2 = ${(b * h) / 2} cm².`] };
    }
    if (l === 2) {
      const b = int(r, 3, 12), h = int(r, 3, 10);
      return { figure: parallelogramFig(b, h), prompt: `A parallelogram has a base of ${b} cm and a perpendicular height of ${h} cm. Work out its area.`, value: b * h, unit: "cm²", hint: "Area of a parallelogram = base × perpendicular height.",
        solution: [`${b} × ${h} = ${b * h} cm².`] };
    }
    const top = int(r, 3, 10), bottom = top + int(r, 1, 4) * 2, h = int(r, 3, 9); // the two parallel sides add to an even number
    const sum = top + bottom;
    const value = (sum * h) / 2;
    return { figure: trapeziumFig(top, bottom, h), prompt: `A trapezium has parallel sides of ${top} cm and ${bottom} cm, and a perpendicular height of ${h} cm. Work out its area.`, value, unit: "cm²",
      hint: "Area of a trapezium = (sum of the parallel sides) ÷ 2 × height.", solution: [`Add the parallel sides: ${top} + ${bottom} = ${sum}.`, `Halve it and multiply by the height: ${sum} ÷ 2 × ${h} = ${value} cm².`] };
  }),
  num({
    id: "percent-change", name: "Percentage increase and decrease", stage: "KS3", year: 8, strand: "Number", prereqs: ["pct-amount"],
    blurb: "Increase or decrease an amount by a percentage, and find a percentage change.",
    explainer: "Find the percentage of the amount first, then add it on or take it off.",
    parentNote: "Work out the percentage of the original amount, then add or subtract it. To find a percentage change, divide the change by the original.",
    talkAbout: "Why is a 10% rise followed by a 10% fall not back where you started?",
  }, (r, l) => {
    if (l <= 2) {
      const pcts = l === 1 ? [10, 20, 25, 50] : [5, 15, 30, 35, 40], p = pick(r, pcts), orig = int(r, 2, 20) * 20, up = r() < 0.5;
      const change = (orig * p) / 100, value = up ? orig + change : orig - change;
      return { prompt: `A ${pick(r, ["coat", "bike", "games console", "pair of trainers"])} costs £${orig}. The price ${up ? "goes up" : "goes down"} by ${p}%. What is the new price in pounds?`, value, hint: `Work out ${p}% of £${orig}, then ${up ? "add it on" : "take it off"}.`,
        solution: [`${p}% of £${orig} = £${change}.`, `£${orig} ${up ? "+" : "−"} £${change} = £${value}.`], shown: `£${value}`,
        wrong: [{ tag: "change-only", number: change, message: `£${change} is only the change. ${up ? "Add" : "Take"} it ${up ? "to" : "from"} the original price to get the new price.` }] };
    }
    const orig = int(r, 2, 12) * 20, p = pick(r, [10, 15, 20, 25, 30, 40, 50]), up = r() < 0.6;
    const to = up ? orig + (orig * p) / 100 : orig - (orig * p) / 100;
    return { prompt: `The price of a ticket ${up ? "rises" : "falls"} from £${orig} to £${to}. Work out the percentage ${up ? "increase" : "decrease"}.`, value: p, unit: "%", shown: `${p}%`, hint: "Percentage change = change ÷ original × 100.",
      solution: [`The change is £${Math.abs(to - orig)}.`, `${Math.abs(to - orig)} ÷ ${orig} × 100 = ${p}%.`] };
  }),
  num({
    id: "angles-parallel", name: "Angles in parallel lines", stage: "KS3", year: 8, strand: "Geometry", prereqs: ["angles-basic"],
    blurb: "Use corresponding, alternate and co-interior angles.",
    explainer: "Parallel lines make angles in pairs: some equal, some adding up to 180°.",
    parentNote: "Draw a pair of parallel lines with a line across them. Corresponding (F) and alternate (Z) angles are equal. Co-interior (C) angles add to 180°.",
    talkAbout: "Which pairs of angles are equal in a Z shape, and which add to 180° in a C shape?",
  }, (r, l) => {
    const a = int(r, 2, 16) * 5 + (r() < 0.5 ? 0 : 3);
    if (l === 1) {
      const kind = pick(r, ["corresponding", "alternate"] as const);
      return { figure: { type: "parallel-lines", t: a, marks: [{ pos: "UBL", text: `${a}°` }, { pos: kind === "corresponding" ? "LBL" : "LTR", text: "?" }], alt: `Two parallel lines crossed by a straight line. One angle is ${a} degrees, and the ${kind} angle is marked with a question mark.` }, prompt: `Two parallel lines are crossed by a straight line. One angle is ${a}°. What is the size of the ${kind} angle, in degrees?`, value: a,
        hint: `${kind === "corresponding" ? "Corresponding angles (an F shape)" : "Alternate angles (a Z shape)"} are equal.`, solution: [`${kind[0].toUpperCase()}${kind.slice(1)} angles are equal, so the angle is ${a}°.`] };
    }
    if (l === 2) {
      return { figure: { type: "parallel-lines", t: a, marks: [{ pos: "UBL", text: `${a}°` }, { pos: "LTL", text: "?" }], alt: `Two parallel lines crossed by a straight line. One angle is ${a} degrees, and the co-interior angle is marked with a question mark.` }, prompt: `Two parallel lines are crossed by a straight line. One angle is ${a}°. What is the size of the co-interior angle, in degrees?`, value: 180 - a,
        hint: "Co-interior angles (a C shape) add up to 180°.", solution: [`Co-interior angles add to 180°.`, `180 − ${a} = ${180 - a}°.`], wrong: [{ tag: "equal-not-180", number: a, message: "Co-interior angles are not equal. They add up to 180°." }] };
    }
    return { figure: { type: "parallel-lines", t: a, marks: [{ pos: "UBL", text: `x = ${a}°` }, { pos: "LTR", text: "y" }, { pos: "UBR", text: "z" }], alt: `Two parallel lines crossed by a straight line. Angle x is ${a} degrees. Angle y is the alternate angle to x, and angle z is co-interior to y.` }, prompt: `Two parallel lines are crossed by a straight line. Angle $x$ is ${a}°. Angle $y$ is the alternate angle to $x$, and angle $z$ is co-interior to $y$. Work out $z$, in degrees.`, value: 180 - a,
      hint: "Find y first (alternate angles are equal), then use co-interior angles add to 180°.", solution: [`$y$ is alternate to $x$, so $y = ${a}°$.`, `$z$ is co-interior to $y$, so $z = 180 - ${a} = ${180 - a}°$.`] };
  }),
  num({
    id: "speed-distance-time", name: "Speed, distance and time", stage: "KS3", year: 8, strand: "Measures", prereqs: ["division", "word-problems"],
    blurb: "Use speed = distance ÷ time to find a missing value.",
    explainer: "Speed tells you how far you go in one hour.",
    parentNote: "Use the triangle: distance on top, speed and time underneath. Cover the one you want and read off what to do.",
    talkAbout: "If you drive at 40 mph for 2 hours, how far have you gone, and how do you know?",
  }, (r, l) => {
    const speed = int(r, 3, 15) * 5, t = int(r, 2, 6), d = speed * t;
    if (l === 1) return { prompt: `A car travels at ${speed} mph for ${t} hours. How far does it travel, in miles?`, value: d, hint: "Distance = speed × time.", solution: [`${speed} × ${t} = ${d}, so it travels ${d} miles.`] };
    if (l === 2) return { prompt: `A cyclist travels ${d} miles in ${t} hours at a steady speed. What is the speed, in mph?`, value: speed, hint: "Speed = distance ÷ time.", solution: [`${d} ÷ ${t} = ${speed}, so the speed is ${speed} mph.`] };
    return { prompt: `A train travels ${d} miles at an average speed of ${speed} mph. How many hours does the journey take?`, value: t, hint: "Time = distance ÷ speed.", solution: [`${d} ÷ ${speed} = ${t}, so the journey takes ${t} hours.`] };
  }),
  num({
    id: "circumference", name: "Circumference of a circle", stage: "KS3", year: 9, strand: "Geometry", prereqs: ["perimeter-area", "decimals"],
    blurb: "Find the distance around a circle using π.",
    explainer: "The distance around a circle is a bit more than three times the distance across it.",
    parentNote: "Circumference is diameter × π, or 2 × radius × π. Check the radius and diameter are not mixed up.",
    talkAbout: "How can you check a circumference answer is sensible without a calculator?",
  }, (r, l) => {
    const rad = int(r, 2, 12);
    if (l === 1) {
      const d = rad * 2, v = round(3.14 * d, 2);
      return { figure: circleFig("diameter", `${d} cm`), prompt: `A circle has a diameter of ${d} cm. Use $\\pi = 3.14$. Work out its circumference to 2 decimal places.`, value: v, unit: "cm", hint: "Circumference = π × diameter.", solution: [`$3.14 \\times ${d} = ${v}$ cm.`] };
    }
    if (l === 2) {
      const v = round(2 * 3.14 * rad, 2);
      return { figure: circleFig("radius", `${rad} cm`), prompt: `A circle has a radius of ${rad} cm. Use $\\pi = 3.14$. Work out its circumference to 2 decimal places.`, value: v, unit: "cm", hint: "Circumference = 2 × π × radius.",
        solution: [`The diameter is $2 \\times ${rad} = ${rad * 2}$ cm.`, `$3.14 \\times ${rad * 2} = ${v}$ cm.`],
        wrong: [{ tag: "used-radius-as-diameter", number: round(3.14 * rad, 2), message: "Circumference uses the diameter. Double the radius first." }] };
    }
    const c = round(6.28 * rad, 2);
    return { prompt: `The circumference of a circle is ${c} cm. Use $\\pi = 3.14$. Work out its radius.`, value: rad, unit: "cm", hint: "Radius = circumference ÷ (2 × π).", solution: [`$2 \\times 3.14 = 6.28$.`, `$${c} \\div 6.28 = ${rad}$ cm.`] };
  }),
  num({
    id: "index-laws", name: "Laws of indices", stage: "KS3", year: 9, strand: "Algebra", prereqs: ["order-ops"],
    blurb: "Simplify powers of the same number when multiplying, dividing and raising to a power.",
    explainer: "When you multiply powers of the same number, add the little numbers.",
    parentNote: "Show it with a few written out: $2^3 \\times 2^2 = (2 \\times 2 \\times 2) \\times (2 \\times 2) = 2^5$. The rules come from counting the twos.",
    talkAbout: "Why does $2^3 \\times 2^2$ give $2^5$ and not $2^6$?",
  }, (r, l) => {
    const base = int(r, 2, 9);
    if (l === 1) {
      const m = int(r, 2, 7), n = int(r, 2, 7);
      return { prompt: `Write $${base}^{${m}} \\times ${base}^{${n}}$ as a single power, $${base}^{n}$. What is $n$?`, value: m + n, hint: "When you multiply powers of the same number, add the powers.",
        solution: [`Add the powers: $${m} + ${n} = ${m + n}$.`, `So $${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${m + n}}$.`],
        wrong: [{ tag: "multiplied-powers", number: m * n, message: "When you multiply powers of the same number, you add the little numbers. You don't multiply them." }] };
    }
    if (l === 2) {
      const n = int(r, 2, 6), m = n + int(r, 2, 6);
      return { prompt: `Write $${base}^{${m}} \\div ${base}^{${n}}$ as a single power, $${base}^{n}$. What is $n$?`, value: m - n, hint: "When you divide powers of the same number, take the powers away.",
        solution: [`Subtract the powers: $${m} - ${n} = ${m - n}$.`, `So $${base}^{${m}} \\div ${base}^{${n}} = ${base}^{${m - n}}$.`] };
    }
    const m = int(r, 2, 5), n = int(r, 2, 5);
    return { prompt: `Write $(${base}^{${m}})^{${n}}$ as a single power, $${base}^{n}$. What is $n$?`, value: m * n, hint: "A power of a power: multiply the powers.",
      solution: [`Multiply the powers: $${m} \\times ${n} = ${m * n}$.`, `So $(${base}^{${m}})^{${n}} = ${base}^{${m * n}}$.`],
      wrong: [{ tag: "added-powers", number: m + n, message: "For a power of a power, you multiply the little numbers. Adding is for multiplying two powers." }] };
  }),
  num({
    id: "volume-prisms", name: "Volume of prisms", stage: "KS3", year: 9, strand: "Measures", prereqs: ["volume-cuboids", "area-triangle"],
    blurb: "Find the volume of a prism from its cross-section and length.",
    explainer: "A prism is the same shape all the way along. Volume is the area of that shape times the length.",
    parentNote: "Find the area of the end shape first, then multiply by the length. Keep the units: area in cm², volume in cm³.",
    talkAbout: "Why does a prism's volume use the area of its cross-section?",
  }, (r, l) => {
    const len = int(r, 3, 12);
    if (l === 1) {
      const area = int(r, 4, 20) * 2;
      return { prompt: `A prism has a cross-section area of ${area} cm² and a length of ${len} cm. Work out its volume.`, value: area * len, unit: "cm³", hint: "Volume = area of cross-section × length.", solution: [`${area} × ${len} = ${area * len} cm³.`] };
    }
    if (l === 2) {
      const b = int(r, 2, 8) * 2, h = int(r, 3, 9), area = (b * h) / 2;
      return { prompt: `A triangular prism has a triangle end with base ${b} cm and height ${h} cm. The prism is ${len} cm long. Work out its volume.`, value: area * len, unit: "cm³", hint: "Find the area of the triangle first, then multiply by the length.",
        solution: [`Area of the triangle = ${b} × ${h} ÷ 2 = ${area} cm².`, `Volume = ${area} × ${len} = ${area * len} cm³.`] };
    }
    const area = int(r, 3, 15) * 2;
    return { prompt: `A prism has a volume of ${area * len} cm³ and a cross-section area of ${area} cm². How long is the prism?`, value: len, unit: "cm", hint: "Length = volume ÷ cross-section area.", solution: [`${area * len} ÷ ${area} = ${len} cm.`] };
  }),

  // ---------------------------------------------------------------- GCSE
  num({
    id: "compound-interest", name: "Compound interest", stage: "KS4", year: 11, strand: "Number", prereqs: ["percent-change"],
    blurb: "Work out an amount after interest is added each year.",
    explainer: "Each year's interest is worked out on the new, bigger amount.",
    parentNote: "Use a multiplier: 5% growth is ×1.05. Repeat it once for each year. Compare with simple interest, which always uses the first amount.",
    talkAbout: "Why does money grow faster with compound interest than with simple interest?",
  }, (r, l) => {
    const rate = l === 1 ? 10 : pick(r, [2, 3, 4, 5, 6, 8]), years = l === 3 ? 3 : 2, p = int(r, 2, 10) * 500;
    const m = 1 + rate / 100, value = round(p * m ** years, 2);
    const steps: string[] = [`The multiplier is ${rate === 10 ? "1.1" : m.toFixed(2).replace(/0$/, "")} (${rate}% growth).`];
    let cur = p;
    for (let y = 1; y <= years; y++) { cur = round(cur * m, 2); steps.push(`After year ${y}: £${cur.toFixed(2).replace(/\.00$/, "")}.`); }
    return { prompt: `£${p} is invested for ${years} years at ${rate}% compound interest per year. How much is it worth at the end, in pounds? Give your answer to 2 decimal places if needed.`, value, hint: `Multiply by ${m} once for each year.`, solution: steps, shown: money(value),
      wrong: [{ tag: "simple-interest", number: round(p + p * (rate / 100) * years, 2), message: "That is simple interest. With compound interest, each year's interest is worked out on the new total." }] };
  }),
  num({
    id: "bounds", name: "Upper and lower bounds", stage: "KS4", year: 11, strand: "Number", prereqs: ["rounding", "decimals"],
    blurb: "Find the largest and smallest values a rounded number could have been.",
    explainer: "A rounded number could have been a little bigger or a little smaller than it looks.",
    parentNote: "The bounds are half a unit either side. Rounded to the nearest 10, the bounds are 5 below and 5 above.",
    talkAbout: "What is the smallest number that rounds to 8 when rounded to the nearest whole number?",
  }, (r, l) => {
    const upper = r() < 0.5;
    if (l === 1) {
      const v = int(r, 4, 40);
      const bound = upper ? v + 0.5 : v - 0.5;
      return { prompt: `A length is ${v} cm, correct to the nearest whole number. What is its ${upper ? "upper" : "lower"} bound?`, value: bound, unit: "cm", hint: "The bounds are half a unit either side of the rounded value.", solution: [`The rounding unit is 1, so half a unit is 0.5.`, `${v} ${upper ? "+" : "−"} 0.5 = ${bound} cm.`] };
    }
    if (l === 2) {
      const w = int(r, 21, 99) / 10, bound = round(upper ? w + 0.05 : w - 0.05, 2);
      return { prompt: `A mass is ${w} kg, correct to 1 decimal place. What is its ${upper ? "upper" : "lower"} bound?`, value: bound, unit: "kg", hint: "Half of 0.1 is 0.05. Add it on or take it off.", solution: [`To 1 decimal place the rounding unit is 0.1, so half a unit is 0.05.`, `${w} ${upper ? "+" : "−"} 0.05 = ${bound} kg.`] };
    }
    const v = int(r, 2, 12) * 10, bound = upper ? v + 5 : v - 5;
    return { prompt: `A distance is ${v} m, correct to the nearest 10 m. What is its ${upper ? "upper" : "lower"} bound?`, value: bound, unit: "m", hint: "Half of 10 is 5. Add it on or take it off.", solution: [`The rounding unit is 10, so half a unit is 5.`, `${v} ${upper ? "+" : "−"} 5 = ${bound} m.`] };
  }),
  num({
    id: "composite-functions", name: "Composite functions", stage: "KS4", year: 11, strand: "Algebra", prereqs: ["substitute"],
    blurb: "Put one function inside another.",
    explainer: "Do the inside function first, then use its answer in the outside function.",
    parentNote: "For $f(g(x))$, work out $g(x)$ first, then put that answer into $f$. Work from the inside out.",
    talkAbout: "Does $f(g(2))$ always equal $g(f(2))$? Try it.",
  }, (r, l) => {
    const a = int(r, 2, 5), b = int(r, 1, 6), c = int(r, 1, 6), x = int(r, 1, 4);
    if (l === 1) {
      const g = x + c, v = a * g + b;
      return { prompt: `$f(x) = ${a}x + ${b}$ and $g(x) = x + ${c}$. Work out $f(g(${x}))$.`, value: v, hint: "Work out g first, then put its answer into f.",
        solution: [`$g(${x}) = ${x} + ${c} = ${g}$.`, `$f(${g}) = ${a} \\times ${g} + ${b} = ${v}$.`] };
    }
    if (l === 2) {
      const g = x * x + c, v = a * g + b;
      return { prompt: `$f(x) = ${a}x + ${b}$ and $g(x) = x^{2} + ${c}$. Work out $f(g(${x}))$.`, value: v, hint: "Work out g first, then put its answer into f.",
        solution: [`$g(${x}) = ${x}^{2} + ${c} = ${g}$.`, `$f(${g}) = ${a} \\times ${g} + ${b} = ${v}$.`] };
    }
    const f = a * x + b, v = f * f + c;
    return { prompt: `$f(x) = ${a}x + ${b}$ and $g(x) = x^{2} + ${c}$. Work out $g(f(${x}))$.`, value: v, hint: "Work out f first, then put its answer into g.",
      solution: [`$f(${x}) = ${a} \\times ${x} + ${b} = ${f}$.`, `$g(${f}) = ${f}^{2} + ${c} = ${v}$.`] };
  }),
  num({
    id: "tree-probability", name: "Probability of two events", stage: "KS4", year: 11, strand: "Statistics", prereqs: ["probability-fractions", "decimals"],
    blurb: "Combine the probabilities of two independent events.",
    explainer: "For 'both', multiply the chances. For 'at least one', take away the chance of none.",
    parentNote: "Draw a tree diagram. Multiply along the branches for 'and'. Add the branches that fit for 'or'. 'At least one' is 1 minus 'none'.",
    talkAbout: "Why do we multiply along the branches of a tree diagram?",
  }, (r, l) => {
    const p = int(r, 2, 8) / 10, q = int(r, 2, 8) / 10;
    const names = pick(r, [["it rains on Saturday", "it rains on Sunday"], ["Mia scores", "Ben scores"], ["bus A is late", "bus B is late"]] as const);
    const base = `The probability that ${names[0]} is ${p}. The probability that ${names[1]} is ${q}. The two events are independent.`;
    if (l === 1) { const v = round(p * q, 2); return { prompt: `${base} What is the probability that both happen? Give your answer as a decimal.`, value: v, hint: "For both events, multiply the probabilities.", solution: [`${p} × ${q} = ${v}.`] }; }
    if (l === 2) {
      const a = round(p * (1 - q), 2), b = round((1 - p) * q, 2), v = round(a + b, 2);
      return { prompt: `${base} What is the probability that exactly one of them happens? Give your answer as a decimal.`, value: v, hint: "Add the two ways it can happen: first only, or second only.",
        solution: [`First only: ${p} × ${round(1 - q, 2)} = ${a}.`, `Second only: ${round(1 - p, 2)} × ${q} = ${b}.`, `Add: ${a} + ${b} = ${v}.`] };
    }
    const none = round((1 - p) * (1 - q), 2), v = round(1 - none, 2);
    return { prompt: `${base} What is the probability that at least one of them happens? Give your answer as a decimal.`, value: v, hint: "At least one is 1 minus the probability that neither happens.",
      solution: [`Neither: ${round(1 - p, 2)} × ${round(1 - q, 2)} = ${none}.`, `At least one: 1 − ${none} = ${v}.`] };
  }),
  num({
    id: "similar-shapes", name: "Similar shapes and scale factors", stage: "KS4", year: 11, strand: "Geometry", prereqs: ["scale-recipes", "ratio-share"],
    blurb: "Use a scale factor to find missing lengths and areas.",
    explainer: "Similar shapes are the same shape in a different size. Every length is multiplied by the same scale factor.",
    parentNote: "Find the scale factor from a pair of matching sides, then use it on the side you want. Areas change by the scale factor squared.",
    talkAbout: "If every length doubles, what happens to the area?",
  }, (r, l) => {
    if (l === 1) {
      const a = int(r, 2, 9), k = int(r, 2, 5);
      return { prompt: `Triangle B is an enlargement of triangle A with scale factor ${k}. A side on triangle A is ${a} cm. How long is the matching side on triangle B?`, value: a * k, unit: "cm", hint: "Multiply by the scale factor.", solution: [`${a} × ${k} = ${a * k} cm.`] };
    }
    if (l === 2) {
      const [q, p] = pick(r, [[2, 3], [2, 5], [3, 4], [3, 5], [3, 7], [4, 5], [4, 7]] as const); // the scale factor p/q, in its simplest form
      const u = int(r, 1, 4);
      let w = int(r, 1, 5);
      while (w === u) w = int(r, 1, 5);
      const small1 = q * u, big1 = p * u, small2 = q * w;
      return { prompt: `Two shapes are similar. A side of ${small1} cm on the small shape matches a side of ${big1} cm on the large shape. Another side on the small shape is ${small2} cm. How long is the matching side on the large shape?`, value: p * w, unit: "cm",
        hint: "Find the scale factor from the pair of matching sides first.", solution: [`Scale factor = ${big1} ÷ ${small1} = $${frac(p, q)}$.`, `${small2} × $${frac(p, q)}$ = ${p * w} cm.`] };
    }
    const area = int(r, 2, 9) * 2, k = int(r, 2, 4);
    return { prompt: `Two shapes are similar. The scale factor from the small shape to the large shape is ${k}. The small shape has an area of ${area} cm². What is the area of the large shape?`, value: area * k * k, unit: "cm²",
      hint: "Areas change by the scale factor squared.", solution: [`The area scale factor is ${k}² = ${k * k}.`, `${area} × ${k * k} = ${area * k * k} cm².`],
      wrong: [{ tag: "used-length-factor", number: area * k, message: `That uses the length scale factor. Areas change by ${k} × ${k} = ${k * k}.` }] };
  }),

  // ---------------------------------------------------------------- A-level
  num({
    id: "arithmetic-series", name: "Arithmetic sequences and series", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["sequences"],
    blurb: "Find a term, or the sum of the first terms, of an arithmetic sequence.",
    explainer: "An arithmetic sequence goes up or down by the same amount each time.",
    parentNote: "The nth term is $a + (n-1)d$. The sum of the first n terms is $\\frac{n}{2}(2a + (n-1)d)$, which comes from pairing the first and last terms.",
    talkAbout: "Why does pairing the first and last terms give a quick way to add up an arithmetic sequence?",
  }, (r, l) => {
    const a = int(r, 1, 9), d = l === 3 ? -int(r, 1, 4) : int(r, 2, 6), n = int(r, 6, 14);
    const first = `$${[0, 1, 2].map((i) => a + i * d).join(", ")}, \\ldots$`;
    if (l === 1) { const v = a + (n - 1) * d; return { prompt: `An arithmetic sequence begins ${first} Find the ${n}th term.`, value: v, hint: "nth term = first term + (n − 1) × common difference.", solution: [`The first term is ${a} and the common difference is ${d}.`, `${a} + ${n - 1} × ${paren(d)} = ${v}.`] }; }
    const sum = (n * (2 * a + (n - 1) * d)) / 2;
    return { prompt: `An arithmetic sequence begins ${first} Find the sum of the first ${n} terms.`, value: sum, hint: "Sum = n ÷ 2 × (2a + (n − 1)d).",
      solution: [`The first term is $a = ${a}$ and the common difference is $d = ${d}$.`, `$S_{${n}} = \\frac{${n}}{2}(2 \\times ${a} + ${n - 1} \\times ${paren(d)}) = \\frac{${n}}{2} \\times ${2 * a + (n - 1) * d} = ${sum}$.`] };
  }),
  num({
    id: "log-laws", name: "Logarithms and their laws", stage: "KS5", year: 12, strand: "Algebra", prereqs: ["index-laws"],
    blurb: "Evaluate logarithms and combine them using the laws.",
    explainer: "A logarithm asks: what power do I raise the base to, to get this number?",
    parentNote: "$\\log_2 8 = 3$ because $2^3 = 8$. Adding logs multiplies the numbers; taking logs away divides them.",
    talkAbout: "What does $\\log_2 32$ mean in words?",
  }, (r, l) => {
    const base = pick(r, [2, 3, 4, 5, 10]);
    const pw = (k: number) => base ** k;
    if (l === 1) {
      const k = int(r, 2, base === 10 ? 4 : 5);
      return { prompt: `Evaluate $\\log_{${base}} ${pw(k)}$.`, value: k, hint: `What power of ${base} gives ${pw(k)}?`, solution: [`${base} to the power ${k} is ${pw(k)}.`, `So $\\log_{${base}} ${pw(k)} = ${k}$.`] };
    }
    if (l === 2) {
      const lo = base === 10 ? 2 : 1, j = int(r, lo, 3), k = int(r, lo, 3);
      return { prompt: `Evaluate $\\log_{${base}} ${pw(j)} + \\log_{${base}} ${pw(k)}$.`, value: j + k, hint: "Work out each logarithm, then add the answers.", solution: [`$\\log_{${base}} ${pw(j)} = ${j}$ and $\\log_{${base}} ${pw(k)} = ${k}$.`, `$${j} + ${k} = ${j + k}$.`] };
    }
    const lo = base === 10 ? 2 : 1, m = int(r, 2, 3), j = int(r, lo, 3), k = int(r, lo, 3);
    return { prompt: `Evaluate $${m}\\log_{${base}} ${pw(j)} + \\log_{${base}} ${pw(k)}$.`, value: m * j + k, hint: "Work out each logarithm first, then do the multiplying and adding.",
      solution: [`$\\log_{${base}} ${pw(j)} = ${j}$ and $\\log_{${base}} ${pw(k)} = ${k}$.`, `$${m} \\times ${j} + ${k} = ${m * j + k}$.`] };
  }),
  num({
    id: "chain-rule", name: "Differentiating with the chain rule", stage: "KS5", year: 13, strand: "Calculus", prereqs: ["differentiate"],
    blurb: "Differentiate a function of a function, such as $(2x+1)^3$.",
    explainer: "Differentiate the outside, keep the inside, then multiply by the derivative of the inside.",
    parentNote: "For $y = (ax+b)^n$, the derivative is $n \\times a \\times (ax+b)^{n-1}$. The 'a' from the inside is the part that is easy to forget.",
    talkAbout: "Why do we multiply by the derivative of the inside part?",
  }, (r, l) => {
    const a = int(r, 2, 4), n = l === 1 ? 2 : l === 2 ? 3 : 4, x = int(r, 0, 2);
    let b = l === 1 ? int(r, -3, 4) : 0;
    while (l > 1 && b === 0) b = int(r, -3, 4);
    const inside = a * x + b, v = n * a * inside ** (n - 1);
    const bs = b === 0 ? "" : b > 0 ? ` + ${b}` : ` - ${-b}`;
    const pw = (base: string, e: number) => (e === 1 ? base : `${base}^{${e}}`);
    return { prompt: `$y = (${a}x${bs})^{${n}}$. Find the gradient of the curve when $x = ${x}$.`, value: v, hint: "Chain rule: n × (inside)^(n−1) × the derivative of the inside.",
      solution: [`$\\frac{dy}{dx} = ${n} \\times ${a} \\times ${pw(`(${a}x${bs})`, n - 1)} = ${n * a}${pw(`(${a}x${bs})`, n - 1)}$.`, `When $x = ${x}$, the inside is $${a} \\times ${paren(x)}${bs} = ${inside}$.`, `$${n * a} \\times ${pw(paren(inside), n - 1)} = ${v}$.`],
      wrong: [{ tag: "forgot-inside-derivative", number: n * inside ** (n - 1), message: `Remember to multiply by the derivative of the inside, which is ${a}.` }] };
  }),
  num({
    id: "sum-to-infinity", name: "Sum to infinity of a geometric series", stage: "KS5", year: 13, strand: "Algebra", prereqs: ["arithmetic-series", "frac-add"],
    blurb: "Find what a geometric series adds up to when it goes on for ever.",
    explainer: "If each term is a fraction of the one before, the total settles on a fixed number.",
    parentNote: "It only works when the common ratio is between −1 and 1. The sum to infinity is the first term divided by (1 minus the ratio).",
    talkAbout: "Why does a series with ratio 2 have no sum to infinity?",
  }, (r, l) => {
    const q = l === 1 ? int(r, 2, 3) : l === 2 ? int(r, 2, 5) : int(r, 3, 5), rn = l === 3 ? int(r, 2, q - 1) : 1; // ratio = rn / q
    const denom = q - rn, k = denom * int(r, 1, 3), a = k * q * q; // chosen so every shown term and the total are whole numbers
    const terms = [a, k * q * rn, k * rn * rn], ratio = frac(rn, q), v = (a * q) / denom;
    return { prompt: `Find the sum to infinity of the geometric series $${terms.join(" + ")} + \\ldots$`, value: v,
      hint: "Sum to infinity = first term ÷ (1 − common ratio).",
      solution: [`The first term is $a = ${a}$ and the common ratio is $r = ${terms[1]} \\div ${a} = ${ratio}$.`, `Since $|r| < 1$, the sum to infinity is $\\frac{a}{1 - r} = \\frac{${a}}{1 - ${ratio}}$.`, `$1 - ${ratio} = ${frac(denom, q)}$, so the sum is $${a} \\div ${frac(denom, q)} = ${v}$.`] };
  }),
  num({
    id: "binomial-coefficient", name: "Binomial expansion coefficients", stage: "KS5", year: 13, strand: "Algebra", prereqs: ["expand-double"],
    blurb: "Find the coefficient of a term when a bracket is raised to a power.",
    explainer: "The numbers in front of each term come from Pascal's triangle.",
    parentNote: "The coefficient of $x^k$ in $(1+px)^n$ is $\\binom{n}{k}p^k$. Start with the choose number, then raise p to the same power as x.",
    talkAbout: "How does Pascal's triangle give the numbers in front of each term?",
  }, (r, l) => {
    const n = int(r, 4, 8), k = l === 1 ? 2 : int(r, 2, 3), p = l === 1 ? 1 : l === 2 ? int(r, 2, 3) : -int(r, 1, 3);
    const c = nCr(n, k), v = c * p ** k;
    const inner = p === 1 ? "1 + x" : p === -1 ? "1 - x" : p > 0 ? `1 + ${p}x` : `1 - ${-p}x`;
    return { prompt: `Find the coefficient of $x^{${k}}$ in the expansion of $(${inner})^{${n}}$.`, value: v, hint: "The coefficient of x^k is (n choose k) × p^k.",
      solution: [`$\\binom{${n}}{${k}} = ${c}$.`, `The coefficient is $${c} \\times ${paren(p)}^{${k}} = ${v}$.`],
      wrong: p === 1 ? undefined : [{ tag: "forgot-p-power", number: c, message: `The number in front of x inside the bracket is also raised to the power ${k}.` }] };
  }),
];

import { int, pick, round } from "../engine/rng";
import type { Figure, Skill } from "../engine/types";
import { choiceSkill } from "./build";
import { rectFig, regularShapeFig, shapeByName } from "./figures";
import { num } from "./ks2";

/**
 * Topics that close gaps found in the Key Stage 2 coverage audit (docs/KS2_COVERAGE.md): outcomes in the National Curriculum that no
 * earlier topic covered. Each question works out its own answer.
 */
const thin = (x0: number, y0: number, w: number, h: number): [number, number][] => [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
const linesFig = (kind: "parallel" | "perpendicular" | "horizontal" | "vertical"): Figure => {
  const t = 0.09;
  const pts = { parallel: thin(0, 0, 6, t), perpendicular: thin(0, 2.5, 6, t), horizontal: thin(0, 0, 6, t), vertical: thin(0, 0, t, 4) }[kind];
  const more = { parallel: [thin(0, 1.2, 6, t)], perpendicular: [thin(2.9, 0, t, 5)], horizontal: [], vertical: [] }[kind];
  return { type: "polygon", pts, more, labels: [], alt: kind === "horizontal" ? "A horizontal line." : kind === "vertical" ? "A vertical line." : `Two ${kind} lines.` };
};
const oneAngle = (deg: number): Figure => ({ type: "angle-rays", total: deg > 180 ? 360 : 180, parts: [{ deg, label: "" }], alt: `A single angle that is ${deg === 90 ? "a right angle" : deg < 90 ? "smaller than a right angle" : deg < 180 ? "bigger than a right angle but smaller than a straight line" : "bigger than a straight line"}.` });
const irregular = (): Figure => ({ type: "polygon", pts: [[0, 0], [3.2, 0], [4, 1.8], [2.2, 3.4], [0.2, 2.2]], labels: [], alt: "A five-sided shape with sides and angles of different sizes." });

export const ks2GapSkills: Skill[] = [
  num({
    id: "time-facts", name: "Time facts", stage: "KS2", year: 3, strand: "Measures", prereqs: [],
    blurb: "Know the number of seconds in a minute, hours in a day, days in a week, month or year, and in a leap year.",
    explainer: "Some time facts are worth knowing by heart: 60 seconds in a minute, 60 minutes in an hour, 24 hours in a day, 7 days in a week, 12 months in a year.",
    parentNote: "Use a calendar. The rhyme '30 days has September…' helps with the months, and a leap year has 366 days because February gets an extra day every fourth year.",
    talkAbout: "How could you remember which months have 31 days?",
  }, (r, l) => {
    const sets: [string, number, string][][] = [
      [["How many seconds are in 1 minute?", 60, "There are 60 seconds in a minute."], ["How many hours are in 1 day?", 24, "A day has 24 hours."], ["How many days are in 1 week?", 7, "A week has 7 days."], ["How many months are in 1 year?", 12, "A year has 12 months."]],
      [["How many days are in April?", 30, "April has 30 days."], ["How many days are in July?", 31, "July has 31 days."], ["How many days are in February in a year that is not a leap year?", 28, "February has 28 days, or 29 in a leap year."], ["How many days are in a year that is not a leap year?", 365, "A normal year has 365 days."]],
      [["How many days are in a leap year?", 366, "A leap year has 366 days, because February has 29."], ["How many days are in February in a leap year?", 29, "February has 29 days in a leap year."], ["How many days are in 2 weeks?", 14, "2 × 7 = 14."], ["How many minutes are in 2 hours?", 120, "2 × 60 = 120."]],
    ];
    const [q, v, why] = pick(r, sets[l - 1]);
    return { prompt: q, value: v, hint: "Think of a clock or a calendar.", solution: [why] };
  }),
  choiceSkill({
    id: "line-types", name: "Parallel, perpendicular, horizontal and vertical lines", stage: "KS2", year: 3, strand: "Geometry", prereqs: ["right-angles"],
    blurb: "Name horizontal, vertical, parallel and perpendicular lines.",
    explainer: "A horizontal line goes side to side, like the horizon. A vertical line goes up and down. Parallel lines never meet. Perpendicular lines meet at a right angle.",
    parentNote: "Look for them around the house: a door frame has vertical and horizontal lines, and railway tracks are parallel. Perpendicular lines make a square corner.",
    talkAbout: "Where can you spot parallel lines on your way to school?",
  }, (r, l) => {
    const all = ["horizontal", "vertical", "parallel", "perpendicular"];
    const why: Record<string, string> = { horizontal: "A horizontal line goes from side to side.", vertical: "A vertical line goes straight up and down.", parallel: "Parallel lines stay the same distance apart and never meet.", perpendicular: "Perpendicular lines meet at a right angle." };
    if (l === 3) {
      const qs: [string, string][] = [["Railway tracks run side by side and never meet. What type of lines are they?", "parallel"], ["The edge of a door and the floor meet at a right angle. What type of lines are they?", "perpendicular"], ["The line where the sea meets the sky. What type of line is it?", "horizontal"], ["A flagpole stands straight up. What type of line does it make?", "vertical"]];
      const [q, right] = pick(r, qs);
      return { prompt: q, right, others: all.filter((x) => x !== right), hint: "Think about the meaning of each word.", solution: [why[right]] };
    }
    const kind = pick(r, l === 1 ? (["horizontal", "vertical"] as const) : (["parallel", "perpendicular", "horizontal", "vertical"] as const));
    return { figure: linesFig(kind), prompt: "What do we call the line or lines in the picture?", right: kind, others: all.filter((x) => x !== kind), hint: "Horizontal is side to side. Vertical is up and down. Parallel lines never meet. Perpendicular lines meet at a right angle.", solution: [why[kind]] };
  }),
  num({
    id: "count-steps-more", name: "Counting in 6, 7, 9, 25 and 1000", stage: "KS2", year: 4, strand: "Number", prereqs: ["count-steps"],
    blurb: "Count forwards and backwards in multiples of 6, 7, 9, 25 and 1000.",
    explainer: "Counting in steps is a quick way to learn a times table. Say the pattern aloud, and spot what stays the same each time.",
    parentNote: "Count in 25s with coins, and in 1000s along a number line. Counting in 9s has a trick: the tens go up by one and the ones go down by one.",
    talkAbout: "How can counting in 9s be done by counting in 10s and taking one off?",
  }, (r, l) => {
    const step = pick(r, l === 1 ? [6, 7, 9] : [6, 7, 9, 25, 1000]), start = step * int(r, 1, 4);
    if (l === 1) return { prompt: `Count in ${step}s: ${[0, 1, 2, 3].map((i) => start + i * step).join(", ")}, … What is the next number?`, value: start + 4 * step, hint: `Add ${step} each time.`, solution: [`${start + 3 * step} + ${step} = ${start + 4 * step}.`] };
    if (l === 2) return { prompt: `Count in ${step}s: ${start}, ${start + step}, __, ${start + 3 * step}. What is the missing number?`, value: start + 2 * step, hint: `Add ${step} to the number before.`, solution: [`${start + step} + ${step} = ${start + 2 * step}.`] };
    const from = step * int(r, 6, 10);
    return { prompt: `Count back in ${step}s from ${from}: ${from}, ${from - step}, ${from - 2 * step}, … What is the 5th number?`, value: from - 4 * step, hint: `Take away ${step} each time. The 5th number is 4 steps back.`, solution: [`4 steps of ${step} is ${4 * step}.`, `${from} − ${4 * step} = ${from - 4 * step}.`] };
  }),
  num({
    id: "multiply-three", name: "Multiplying three numbers", stage: "KS2", year: 4, strand: "Number", prereqs: ["times-tables"],
    blurb: "Multiply three numbers together, choosing the easiest order.",
    explainer: "You can multiply numbers in any order and get the same answer. Look for two numbers that make a friendly product, like 2 × 5 = 10 or 4 × 25 = 100, and do those first.",
    parentNote: "This is the commutative law at work. Encourage your child to look for pairs that make 10 or 100 before reaching for a written method.",
    talkAbout: "Which two numbers would you multiply first, and why?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 2, 5), b = int(r, 2, 4), c = int(r, 2, 4); return { prompt: `Work out ${a} × ${b} × ${c}.`, value: a * b * c, hint: "Multiply the first two, then multiply the answer by the third.", solution: [`${a} × ${b} = ${a * b}.`, `${a * b} × ${c} = ${a * b * c}.`] }; }
    if (l === 2) { const a = int(r, 3, 9), t = pick(r, [2, 5]); return { prompt: `Work out ${t} × ${a} × ${t === 2 ? 5 : 2}. (Look for a pair that makes 10.)`, value: a * 10, hint: "Do the 2 × 5 first.", solution: [`2 × 5 = 10.`, `${a} × 10 = ${a * 10}.`] }; }
    const a = pick(r, [3, 6, 7, 9]); return { prompt: `Work out 25 × ${a} × 4. (Look for a pair that makes 100.)`, value: a * 100, hint: "25 × 4 makes a friendly number.", solution: ["25 × 4 = 100.", `${a} × 100 = ${a * 100}.`] };
  }),
  choiceSkill({
    id: "shape-properties", name: "Comparing and classifying shapes", stage: "KS2", year: 4, strand: "Geometry", prereqs: ["symmetry-lines"],
    blurb: "Name triangles and quadrilaterals from their sides and angles.",
    explainer: "Shapes are named by their sides and angles. A square has 4 equal sides and 4 right angles. A rectangle has 4 right angles and opposite sides equal. A kite has two pairs of equal sides that meet.",
    parentNote: "Sort a pile of cut-out shapes by their properties: number of sides, equal sides, right angles. A square is also a rectangle, which surprises many children.",
    talkAbout: "How is a square different from a rectangle that is not a square?",
  }, (r, l) => {
    const names = ["square", "rectangle", "equilateral triangle", "isosceles triangle", "right-angled triangle", "kite"];
    if (l === 1) { const n = pick(r, names); return { figure: shapeByName(n), prompt: "What is the name of this shape?", right: n, others: names.filter((x) => x !== n).slice(0, 3), hint: "Count the sides and look at the angles.", solution: [`It is a ${n}.`] }; }
    const facts: [string, string, string][] = [
      ["Which shape has 3 equal sides?", "equilateral triangle", "An equilateral triangle has 3 equal sides."],
      ["Which shape has 4 equal sides and 4 right angles?", "square", "Only a square has 4 equal sides and 4 right angles."],
      ["Which shape has 4 right angles, with opposite sides equal but not all 4 sides equal?", "rectangle", "That is a rectangle."],
      ["Which shape has exactly one right angle and 3 sides?", "right-angled triangle", "A right-angled triangle has one right angle."],
      ["Which shape has 2 equal sides and 3 sides in all?", "isosceles triangle", "An isosceles triangle has 2 equal sides."],
      ["Which shape has 2 pairs of equal sides that meet at corners, and no right angles?", "kite", "That describes a kite."],
    ];
    const [q, right, why] = pick(r, l === 2 ? facts.slice(0, 4) : facts);
    return { prompt: q, right, others: names.filter((x) => x !== right).slice(0, 3), hint: "Check each shape's sides and angles.", solution: [why] };
  }),
  choiceSkill({
    id: "angle-types", name: "Acute, right, obtuse and reflex angles", stage: "KS2", year: 4, strand: "Geometry", prereqs: ["right-angles"],
    blurb: "Name angles as acute, right, obtuse, straight or reflex, and compare their sizes.",
    explainer: "A right angle is 90°. An acute angle is smaller than a right angle. An obtuse angle is bigger than a right angle but smaller than a straight line (180°). A reflex angle is bigger than a straight line.",
    parentNote: "Use the corner of a piece of paper as a right-angle checker. 'Acute' sounds like 'a cute little angle', which helps remember it is the small one.",
    talkAbout: "How could you tell an obtuse angle from an acute one without measuring?",
  }, (r, l) => {
    const names = ["acute", "right", "obtuse", "reflex"];
    const choose = (deg: number) => (deg < 90 ? "acute" : deg === 90 ? "right" : deg < 180 ? "obtuse" : "reflex");
    if (l === 1) { const deg = pick(r, [30, 45, 60, 90, 120, 135, 150]); const right = choose(deg); return { figure: oneAngle(deg), prompt: "What type of angle is shown?", right, others: names.filter((x) => x !== right).slice(0, 3), hint: "Compare it with a right angle, a square corner.", solution: [`It is ${right === "acute" ? "smaller than" : right === "right" ? "exactly" : "bigger than"} a right angle, so it is ${right}.`] }; }
    const deg = l === 2 ? pick(r, [25, 70, 100, 110, 140, 170, 210, 250, 300]) : pick(r, [15, 35, 95, 105, 125, 175, 190, 225, 270, 320]);
    const right = choose(deg);
    return { prompt: `What type of angle is ${deg}°?`, right, others: names.filter((x) => x !== right).slice(0, 3), hint: "Acute is under 90°. Right is 90°. Obtuse is between 90° and 180°. Reflex is over 180°.", solution: [`${deg}° is ${deg < 90 ? "less than 90°" : deg < 180 ? "between 90° and 180°" : "more than 180°"}, so it is ${right}.`] };
  }),
  num({
    id: "thousandths", name: "Thousandths", stage: "KS2", year: 5, strand: "Number", prereqs: ["hundredths", "decimals"],
    blurb: "Read, write and compare decimals with three decimal places, and relate thousandths to tenths and hundredths.",
    explainer: "A thousandth is one of 1000 equal parts. The first digit after the decimal point is tenths, the second hundredths, the third thousandths. So 0.375 is 3 tenths, 7 hundredths and 5 thousandths.",
    parentNote: "Use a place-value chart with columns for tenths, hundredths and thousandths. Each column is ten times smaller than the one on its left.",
    talkAbout: "Why is 0.4 the same as 0.400?",
  }, (r, l) => {
    const t = int(r, 1, 9), h = int(r, 1, 9), th = int(r, 1, 9), n = `0.${t}${h}${th}`;
    if (l === 1) return { prompt: `What digit is in the thousandths place in ${n}?`, value: th, hint: "Thousandths is the third digit after the decimal point.", solution: [`In ${n} the digits after the point are ${t} (tenths), ${h} (hundredths) and ${th} (thousandths).`] };
    if (l === 2) return { prompt: `How many thousandths are in 0.${t}${h}?`, value: t * 100 + h * 10, hint: "Write 0.${t}${h} as 0.${t}${h}0 and read the thousandths.".replace("${t}", String(t)).replace("${h}", String(h)).replace("${t}", String(t)).replace("${h}", String(h)), solution: [`0.${t}${h} = 0.${t}${h}0.`, `That is ${t * 100 + h * 10} thousandths.`] };
    return { prompt: `Write $\\frac{${t * 100 + h * 10 + th}}{1000}$ as a decimal.`, value: round((t * 100 + h * 10 + th) / 1000, 3), hint: "Thousandths go in the third decimal place.", solution: [`${t * 100 + h * 10 + th} ÷ 1000 = ${n}.`] };
  }),
  num({
    id: "rectangle-properties", name: "Properties of rectangles", stage: "KS2", year: 5, strand: "Geometry", prereqs: ["perimeter-simple"],
    blurb: "Use the properties of rectangles to find missing lengths and angles.",
    explainer: "A rectangle has 4 right angles, and its opposite sides are equal. If you know one length and one width, you know all four sides.",
    parentNote: "Draw a rectangle and label two sides. Ask which sides are the same. The perimeter is double the length plus width.",
    talkAbout: "If you know two sides of a rectangle, how many more sides do you know?",
  }, (r, l) => {
    const w = int(r, 3, 8), h = int(r, 2, w - 1);
    if (l === 1) return { figure: rectFig(w, h, `${w} cm`, "?"), prompt: `A rectangle is ${w} cm long. Its perimeter is ${2 * (w + h)} cm. How wide is it, in cm?`, value: h, unit: "cm", hint: "Opposite sides are equal. Half the perimeter is one length plus one width.", solution: [`Half of ${2 * (w + h)} is ${w + h}.`, `${w + h} − ${w} = ${h}.`] };
    if (l === 2) return { figure: rectFig(w, h, `${w} cm`, `${h} cm`), prompt: `A rectangle has sides of ${w} cm and ${h} cm. What is the total of all four sides, in cm?`, value: 2 * (w + h), unit: "cm", hint: "A rectangle has two sides of each length.", solution: [`${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}.`] };
    const a = pick(r, [4, 6, 8]); return { prompt: `Each corner of a rectangle is a right angle. How many degrees do all four corners add up to?`, value: 360, unit: "°", hint: `Each corner is 90°, and there are 4 corners. ${a === 4 ? "" : ""}`.trim(), solution: ["4 × 90 = 360."] };
  }),
  choiceSkill({
    id: "polygon-regularity", name: "Regular and irregular polygons", stage: "KS2", year: 5, strand: "Geometry", prereqs: ["shape-properties"],
    blurb: "Tell regular polygons (equal sides and angles) from irregular ones.",
    explainer: "A polygon has straight sides. In a regular polygon all the sides are the same length and all the angles are the same size. If not, it's irregular.",
    parentNote: "A square is a regular four-sided shape. A rectangle that isn't a square is irregular, because its sides aren't all equal.",
    talkAbout: "Why is a rectangle that is not a square an irregular polygon?",
  }, (r, l) => {
    if (l === 1) { const regular = r() < 0.5, n = pick(r, [5, 6]); return { figure: regular ? regularShapeFig(n) : irregular(), prompt: "Is this polygon regular or irregular?", right: regular ? "regular" : "irregular", others: [regular ? "irregular" : "regular"], hint: "Do all the sides and angles look the same?", solution: [regular ? "All the sides and angles match, so it is regular." : "The sides and angles are different sizes, so it is irregular."] }; }
    if (l === 2) { const sets: [string, string, string[]][] = [["Which of these is a regular polygon?", "a square", ["a rectangle that is not a square", "a kite", "a right-angled triangle"]], ["Which of these is a regular polygon?", "an equilateral triangle", ["an isosceles triangle", "a rectangle that is not a square", "a kite"]]]; const [q, right, others] = pick(r, sets); return { prompt: q, right, others, hint: "Regular means all sides and all angles are equal.", solution: [`${right.charAt(0).toUpperCase() + right.slice(1)} has all sides and angles equal.`] }; }
    const n = pick(r, [5, 6, 8]), s = pick(r, [3, 4, 5]); const name = { 5: "pentagon", 6: "hexagon", 8: "octagon" }[n as 5 | 6 | 8];
    return { prompt: `A regular shape has a perimeter of ${n * s} cm and each side is ${s} cm long. Which shape is it?`, right: name, others: ["pentagon", "hexagon", "octagon", "square"].filter((x) => x !== name).slice(0, 3), hint: "Divide the perimeter by the side length to find how many sides.", solution: [`${n * s} ÷ ${s} = ${n} sides.`, `A regular shape with ${n} sides is a ${name}.`] };
  }),
  num({
    id: "long-division", name: "Long division", stage: "KS2", year: 6, strand: "Number", prereqs: ["division"],
    blurb: "Divide numbers up to four digits by a two-digit number, and show remainders as whole numbers, fractions or decimals.",
    explainer: "Long division shares a big number into equal groups step by step. When there is a remainder, you can write it as a whole number, as a fraction, or carry on into decimals.",
    parentNote: "Write out the multiples of the divisor first (×1 to ×9) so the sums are quick. Check by multiplying back and adding the remainder.",
    talkAbout: "How can you check a long division answer by multiplying?",
  }, (r, l) => {
    const d = pick(r, [12, 14, 15, 16, 18, 24, 25]);
    if (l === 1) { const q = int(r, 20, 90), n = d * q; return { prompt: `Work out ${n} ÷ ${d}.`, value: q, hint: `Work out how many ${d}s fit, step by step. Check by multiplying back.`, solution: [`${q} × ${d} = ${n}.`, `So ${n} ÷ ${d} = ${q}.`] }; }
    if (l === 2) { const q = int(r, 20, 80), rem = int(r, 1, d - 1), n = d * q + rem; return { prompt: `Work out ${n} ÷ ${d}. Give the remainder only.`, value: rem, hint: `Find the biggest multiple of ${d} that fits, then see what is left.`, solution: [`${d} × ${q} = ${d * q}.`, `${n} − ${d * q} = ${rem}, so the remainder is ${rem}.`] }; }
    const pair = pick(r, [[3, 4], [5, 4], [7, 4], [9, 4], [1, 8], [3, 8], [3, 5], [7, 5], [11, 4], [13, 4]] as [number, number][]);
    const whole = int(r, 12, 60), n = whole * pair[1] + pair[0], ans = n / pair[1];
    return { prompt: `Work out ${n} ÷ ${pair[1]}. Give the answer as a decimal.`, value: ans, hint: `Divide as far as you can, then carry the remainder into tenths and hundredths.`, solution: [`${whole} × ${pair[1]} = ${whole * pair[1]}, with ${pair[0]} left over.`, `${pair[0]} ÷ ${pair[1]} = ${pair[0] / pair[1]}.`, `${n} ÷ ${pair[1]} = ${ans}.`] };
  }),
  num({
    id: "vertically-opposite", name: "Vertically opposite angles", stage: "KS2", year: 6, strand: "Geometry", prereqs: ["angles-basic"],
    blurb: "Find missing angles where two straight lines cross.",
    explainer: "When two straight lines cross, the angles opposite each other are equal. The angles next to each other add up to 180°.",
    parentNote: "Cross two pencils and look at the angles. Opposite angles match, like the top and bottom of a letter X. Neighbouring angles together make a straight line.",
    talkAbout: "Why must the angles opposite each other be the same size?",
  }, (r, l) => {
    const a = pick(r, [30, 40, 50, 60, 70, 110, 120, 130, 140]);
    const fig = (labels: string[]): Figure => ({ type: "angle-rays", total: 360, parts: [{ deg: a, label: labels[0] }, { deg: 180 - a, label: labels[1] }, { deg: a, label: labels[2] }, { deg: 180 - a, label: labels[3] }], alt: `Two straight lines crossing. One angle is ${a} degrees. The angle to find is marked x.` });
    if (l === 1) return { figure: fig([`${a}°`, "", "x", ""]), prompt: `Two straight lines cross. One angle is ${a}°. What is the angle opposite it, marked x?`, value: a, unit: "°", hint: "Opposite angles are equal.", solution: [`Opposite angles are equal, so x = ${a}°.`] };
    if (l === 2) return { figure: fig([`${a}°`, "x", "", ""]), prompt: `Two straight lines cross. One angle is ${a}°. What is the angle next to it, marked x?`, value: 180 - a, unit: "°", hint: "Angles on a straight line add up to 180°.", solution: [`180 − ${a} = ${180 - a}.`, `So x = ${180 - a}°.`] };
    return { figure: fig([`${a}°`, "", "", "x"]), prompt: `Two straight lines cross. One angle is ${a}°. What is the angle marked x, which is next to the angle opposite it?`, value: 180 - a, unit: "°", hint: "Find the angle opposite first, then use angles on a straight line.", solution: [`The angle opposite ${a}° is also ${a}°.`, `x is next to it on a straight line: 180 − ${a} = ${180 - a}.`] };
  }),
  num({
    id: "place-value-millions", name: "Numbers up to ten million", stage: "KS2", year: 6, strand: "Number", prereqs: ["large-numbers"],
    blurb: "Read, write, order and compare numbers up to 10,000,000 and find the value of each digit.",
    explainer: "Each place is ten times the one to its right: ones, tens, hundreds, thousands, ten thousands, hundred thousands, millions and ten millions. Commas help you read big numbers in groups of three.",
    parentNote: "Use a place-value chart that goes up to ten millions. Reading aloud in groups, '7 million, 305 thousand, 2 hundred and 40', builds confidence with the biggest numbers.",
    talkAbout: "How do the commas help you read a seven-digit number?",
  }, (r, l) => {
    const digits = Array.from({ length: 7 }, (_, i) => (i === 0 ? int(r, 1, 9) : int(r, 0, 9))), n = Number(digits.join("")), comma = n.toLocaleString("en-GB");
    if (l === 1) { const pos = int(r, 0, 6), places = ["millions", "hundred thousands", "ten thousands", "thousands", "hundreds", "tens", "ones"], mult = 10 ** (6 - pos); return { prompt: `In ${comma}, what is the value of the digit in the ${places[pos]} place?`, value: digits[pos] * mult, hint: "Find the digit's place, then multiply it by the value of that place.", solution: [`The digit is ${digits[pos]} in the ${places[pos]} place.`, `${digits[pos]} × ${mult.toLocaleString("en-GB")} = ${(digits[pos] * mult).toLocaleString("en-GB")}.`] }; }
    if (l === 2) { const step = pick(r, [1000, 10000, 100000, 1000000]), more = r() < 0.5; return { prompt: `What is ${step.toLocaleString("en-GB")} ${more ? "more" : "less"} than ${comma}?`, value: more ? n + step : n - step, hint: `${more ? "Add" : "Take away"} ${step.toLocaleString("en-GB")}, changing only the right digit.`, solution: [`${comma} ${more ? "+" : "−"} ${step.toLocaleString("en-GB")} = ${(more ? n + step : n - step).toLocaleString("en-GB")}.`] }; }
    const a = int(r, 1, 9), b = int(r, 1, 9), c = int(r, 1, 9); return { prompt: `Write $${a} \\times 1\\,000\\,000 + ${b} \\times 100\\,000 + ${c} \\times 1\\,000$ as one number, with no commas.`, value: a * 1_000_000 + b * 100_000 + c * 1000, hint: "Each part fills one place. The empty places are zeros.", solution: [`${a * 1_000_000} + ${b * 100_000} + ${c * 1000} = ${a * 1_000_000 + b * 100_000 + c * 1000}.`] };
  }),
  num({
    id: "area-perimeter-link", name: "Same area, different perimeter", stage: "KS2", year: 6, strand: "Measures", prereqs: ["perimeter-area"],
    blurb: "See that shapes with the same area can have different perimeters, and the other way round.",
    explainer: "Area is the space inside a shape. Perimeter is the distance around the outside. Two rectangles can cover the same area but have very different perimeters.",
    parentNote: "Use 12 square tiles to make different rectangles. The area is always 12, but a long thin rectangle has a longer perimeter than a squarer one.",
    talkAbout: "Which 12-tile rectangle has the shortest perimeter, and why?",
  }, (r, l) => {
    const pairs: [number, number, number, number][] = [[6, 4, 12, 2], [8, 3, 12, 2], [5, 4, 10, 2], [9, 4, 12, 3], [6, 6, 12, 3]];
    const [a1, b1, a2, b2] = pick(r, pairs), area = a1 * b1, p1 = 2 * (a1 + b1), p2 = 2 * (a2 + b2);
    if (l === 1) return { figure: rectFig(a1, b1), prompt: `A rectangle is ${a1} cm by ${b1} cm. What is its area in cm²?`, value: area, unit: "cm²", hint: "Area is length × width.", solution: [`${a1} × ${b1} = ${area}.`] };
    if (l === 2) return { prompt: `A ${a1} cm by ${b1} cm rectangle and a ${a2} cm by ${b2} cm rectangle have the same area, ${area} cm². What is the perimeter of the ${a2} cm by ${b2} cm rectangle in cm?`, value: p2, unit: "cm", hint: "Perimeter is double the length plus the width.", solution: [`2 × (${a2} + ${b2}) = 2 × ${a2 + b2} = ${p2}.`] };
    return { prompt: `A ${a1} cm by ${b1} cm rectangle and a ${a2} cm by ${b2} cm rectangle both have an area of ${area} cm². How much longer is the perimeter of the ${p2 > p1 ? `${a2} by ${b2}` : `${a1} by ${b1}`} rectangle than the other, in cm?`, value: Math.abs(p2 - p1), unit: "cm", hint: "Work out both perimeters and take one from the other.", solution: [`${a1} by ${b1}: 2 × ${a1 + b1} = ${p1}.`, `${a2} by ${b2}: 2 × ${a2 + b2} = ${p2}.`, `${Math.max(p1, p2)} − ${Math.min(p1, p2)} = ${Math.abs(p2 - p1)}.`] };
  }),
];

import { int, pick, round, type Rng } from "../engine/rng";
import { lShapeFig, lShapeOutsideFig, rectFig, regularPolygonFig, triangleSidesFig } from "./figures";
import type { Figure, Question, Skill } from "../engine/types";

/**
 * More Key Stage 2, from the gaps listed in docs/ROADMAP.md (Years 3 and 4 first). Written the same way as the rest: each question
 * works out its own answer, so the answer, the worked steps and the hint can never disagree.
 */
type Task = { prompt: string; value: number; hint: string; solution: string[]; unit?: string; shown?: string; figure?: Figure };

export type { Task };
export function num(info: Omit<Skill, "generate">, task: (r: Rng, level: number) => Task): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      return {
        skill: info.id, level, prompt: t.prompt, answer: { kind: "number", value: t.value, unit: t.unit },
        hint: t.hint, solution: t.solution, shown: t.shown ?? `${t.value}${t.unit ? ` ${t.unit}` : ""}`, figure: t.figure,
      };
    },
  };
}

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const neg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const toRoman = (n: number): string => ROMAN.reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v; } return out; }, "");

export const ks2Skills: Skill[] = [
  // ---------------------------------------------------------------- Year 3
  num({
    id: "count-steps", name: "Counting in steps", stage: "KS2", year: 3, strand: "Number", prereqs: [],
    blurb: "Count forwards and backwards in 2s, 3s, 4s, 5s, 8s, 10s, 50s and 100s, and find the missing number.",
    explainer: "Counting in steps means adding the same number each time. Find the jump, then keep going.",
    parentNote: "Say the sequence out loud together, then hide one number and ask for it. Counting in 4s and 8s links straight to those times tables.",
    talkAbout: "How did you work out the jump between the numbers?",
  }, (r, l) => {
    if (l === 1) {
      const s = pick(r, [2, 3, 4, 5, 10]), a = s * int(r, 1, 5), seq = [a, a + s, a + 2 * s, a + 3 * s];
      return { prompt: `Count in ${s}s: ${seq.join(", ")}, … What is the next number?`, value: a + 4 * s, hint: `Each number is ${s} more than the one before.`, solution: [`The numbers go up by ${s} each time.`, `${seq[3]} + ${s} = ${a + 4 * s}.`] };
    }
    if (l === 2) {
      const s = pick(r, [4, 8, 50, 100]), a = s * int(r, 1, 6), seq = [a, a + s, a + 2 * s, a + 3 * s, a + 4 * s];
      return { prompt: `Count in ${s}s: ${seq[0]}, ${seq[1]}, ${seq[2]}, __, ${seq[4]}. What is the missing number?`, value: seq[3], hint: `Find the jump between the numbers you can see.`, solution: [`${seq[1]} − ${seq[0]} = ${s}, so the jump is ${s}.`, `${seq[2]} + ${s} = ${seq[3]}.`] };
    }
    const s = pick(r, [5, 10, 50, 100]), start = s * int(r, 12, 20), k = int(r, 5, 7);
    return { prompt: `Count back in ${s}s from ${start}: ${start}, ${start - s}, ${start - 2 * s}, … What is the ${k}th number?`, value: start - (k - 1) * s, hint: `The first number is ${start}. Take away ${s} each time.`, solution: [`The ${k}th number is ${k - 1} jumps after the first.`, `${k - 1} × ${s} = ${(k - 1) * s}, and ${start} − ${(k - 1) * s} = ${start - (k - 1) * s}.`] };
  }),
  num({
    id: "frac-same-denom", name: "Fractions with the same bottom number", stage: "KS2", year: 3, strand: "Number", prereqs: ["fraction-order"],
    blurb: "Add and subtract fractions with the same denominator, within one whole.",
    explainer: "When the bottom numbers match, add or take away the top numbers. The bottom number stays the same.",
    parentNote: "Use a drawn bar or a pizza cut into equal slices. 2 eighths and 3 eighths is 5 eighths, just as 2 apples and 3 apples is 5 apples.",
    talkAbout: "Why does the bottom number stay the same when you add?",
  }, (r, l) => {
    const d = pick(r, l === 1 ? [4, 5, 6, 8, 10] : [5, 6, 8, 10, 12]);
    if (l === 1) { const a = int(r, 1, d - 2), b = int(r, 1, d - a - 1 || 1); return { prompt: `$\\frac{${a}}{${d}} + \\frac{${b}}{${d}} = \\frac{?}{${d}}$. What is the missing top number?`, value: a + b, hint: "The bottom numbers match, so just add the top numbers.", solution: [`${a} + ${b} = ${a + b}.`, `So the answer is $\\frac{${a + b}}{${d}}$.`] }; }
    if (l === 2) { const a = int(r, 3, d - 1), b = int(r, 1, a - 1); return { prompt: `$\\frac{${a}}{${d}} - \\frac{${b}}{${d}} = \\frac{?}{${d}}$. What is the missing top number?`, value: a - b, hint: "The bottom numbers match, so take away the top numbers.", solution: [`${a} − ${b} = ${a - b}.`, `So the answer is $\\frac{${a - b}}{${d}}$.`] }; }
    const b = int(r, 1, d - 1);
    return { prompt: `A pizza is cut into ${d} equal slices. ${b} slices are eaten. What fraction is left? Give the top number of $\\frac{?}{${d}}$.`, value: d - b, hint: `The whole pizza is $\\frac{${d}}{${d}}$.`, solution: [`The whole pizza is $\\frac{${d}}{${d}}$.`, `${d} − ${b} = ${d - b}, so $\\frac{${d - b}}{${d}}$ is left.`] };
  }),
  num({
    id: "measure-add", name: "Adding and taking away lengths and amounts", stage: "KS2", year: 3, strand: "Measures", prereqs: ["add-sub"],
    blurb: "Add and subtract lengths (m, cm, mm), mass (kg, g) and volume or capacity (l, ml).",
    explainer: "Work in the same unit, then add or take away. Change the bigger unit to the smaller one first if you need to.",
    parentNote: "Check both amounts are in the same unit before calculating. 1 m is 100 cm, 1 kg is 1,000 g and 1 l is 1,000 ml.",
    talkAbout: "Which unit did you change to, and why?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 25, 60), b = int(r, 20, 45); return { prompt: `A ribbon is ${a} cm long. Another is ${b} cm long. How long are they altogether in cm?`, value: a + b, unit: "cm", hint: "Add the two lengths.", solution: [`${a} + ${b} = ${a + b}.`] }; }
    if (l === 2) { const m = int(r, 1, 3), c = int(r, 10, 80), b = int(r, 30, 95); return { prompt: `A rope is ${m} m ${c} cm long. A second rope is ${b} cm long. How long are they altogether in cm?`, value: m * 100 + c + b, unit: "cm", hint: "Change the metres to centimetres first.", solution: [`${m} m = ${m * 100} cm, so the first rope is ${m * 100 + c} cm.`, `${m * 100 + c} + ${b} = ${m * 100 + c + b}.`] }; }
    const used = int(r, 15, 90) * 10, litres = int(r, 1, 2);
    return { prompt: `A jug holds ${litres} l of juice. ${used} ml is poured out. How much is left in ml?`, value: litres * 1000 - used, unit: "ml", hint: "Change the litres to millilitres first.", solution: [`${litres} l = ${litres * 1000} ml.`, `${litres * 1000} − ${used} = ${litres * 1000 - used}.`] };
  }),
  num({
    id: "perimeter-simple", name: "Perimeter of shapes", stage: "KS2", year: 3, strand: "Measures", prereqs: ["add-sub"],
    blurb: "Measure and calculate the perimeter of simple shapes.",
    explainer: "The perimeter is the distance all the way around the outside of a shape.",
    parentNote: "Walk round the edge of a shape with a finger and add up each side. Mark where you started so no side is counted twice.",
    talkAbout: "How can you be sure you have counted every side?",
  }, (r, l) => {
    if (l === 1) { const w = int(r, 4, 12), h = int(r, 2, 9); return { figure: rectFig(w, h), prompt: `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter in cm?`, value: 2 * (w + h), unit: "cm", hint: "A rectangle has two long sides and two short sides.", solution: [`${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}.`] }; }
    if (l === 2) { const a = int(r, 3, 9), b = int(r, 4, 10), c = int(r, Math.max(5, Math.abs(a - b) + 1), Math.min(11, a + b - 1)); return { figure: triangleSidesFig(a, b, c), prompt: `A triangle has sides of ${a} cm, ${b} cm and ${c} cm. What is its perimeter in cm?`, value: a + b + c, unit: "cm", hint: "Add all three sides.", solution: [`${a} + ${b} + ${c} = ${a + b + c}.`] }; }
    const n = pick(r, [5, 6, 8]), s = int(r, 3, 9), name = { 5: "pentagon", 6: "hexagon", 8: "octagon" }[n as 5 | 6 | 8];
    return { figure: regularPolygonFig(n, s), prompt: `A regular ${name} has ${n} sides, each ${s} cm long. What is its perimeter in cm?`, value: n * s, unit: "cm", hint: "All the sides of a regular shape are the same length.", solution: [`${n} sides of ${s} cm: ${n} × ${s} = ${n * s}.`] };
  }),
  num({
    id: "right-angles", name: "Right angles and turns", stage: "KS2", year: 3, strand: "Geometry", prereqs: [],
    blurb: "Recognise right angles, and describe quarter, half and three-quarter turns.",
    explainer: "A right angle is a square corner. A quarter turn is one right angle. Four quarter turns make a full turn.",
    parentNote: "Use the corner of a piece of paper as a right-angle checker. A half turn is two right angles and a full turn is four.",
    talkAbout: "How many right angles are in a half turn, and how do you know?",
  }, (r, l) => {
    if (l === 1) {
      const shapes: [string, number][] = [["square", 4], ["rectangle", 4], ["right-angled triangle", 1], ["rectangle with one corner cut off at a slant", 3]];
      const [name, n] = pick(r, shapes.slice(0, 3));
      return { prompt: `How many right angles does a ${name} have?`, value: n, hint: "A right angle is a square corner.", solution: [`Look for the square corners: a ${name} has ${n}.`] };
    }
    if (l === 2) { const q = int(r, 1, 4), words = ["a quarter turn", "a half turn", "a three-quarter turn", "a full turn"]; return { prompt: `How many right angles are there in ${words[q - 1]}?`, value: q, hint: "One quarter turn is one right angle.", solution: [`${cap(words[q - 1])} is ${q} quarter turn${q > 1 ? "s" : ""}, which is ${q} right angle${q > 1 ? "s" : ""}.`] }; }
    const a = int(r, 1, 3), b = int(r, 1, 3);
    return { prompt: `You turn through ${a} right angle${a > 1 ? "s" : ""} and then ${b} more. How many right angles is that in total?`, value: a + b, hint: "Add the number of right angles.", solution: [`${a} + ${b} = ${a + b} right angles.`, a + b === 4 ? "That makes a full turn." : `That is ${a + b} quarter turns.`] };
  }),
  num({
    id: "pictograms", name: "Pictograms", stage: "KS2", year: 3, strand: "Statistics", prereqs: ["times-tables"],
    blurb: "Read and answer questions about pictograms where each symbol stands for more than one.",
    explainer: "In a pictogram each picture stands for a number. Read the key first, then count the pictures and multiply.",
    parentNote: "Always read the key before anything else. A half symbol is half the value of a whole one.",
    talkAbout: "What does one symbol stand for, and how did that help?",
  }, (r, l) => {
    const each = pick(r, l === 1 ? [2, 5, 10] : l === 2 ? [2, 4, 10] : [2, 4, 5, 10]);
    const food = ["pizza", "pasta", "salad", "soup"], i = int(r, 0, 3), j = (i + int(r, 1, 3)) % 4;
    const a = int(r, 3, 7), b = int(r, 2, 6);
    if (l === 1) return { prompt: `In a pictogram, each ☺ stands for ${each} children. The row for ${food[i]} has ${a} ☺. How many children chose ${food[i]}?`, value: a * each, hint: "Multiply the number of pictures by what each one stands for.", solution: [`${a} × ${each} = ${a * each}.`] };
    if (l === 2) return { prompt: `In a pictogram, each ☺ stands for ${each} children. The row for ${food[i]} has ${a} whole ☺ and one half ☺. How many children chose ${food[i]}?`, value: a * each + each / 2, hint: "A half ☺ stands for half as many children.", solution: [`${a} whole ☺ is ${a} × ${each} = ${a * each}.`, `A half ☺ is ${each / 2}.`, `${a * each} + ${each / 2} = ${a * each + each / 2}.`] };
    return { prompt: `In a pictogram, each ☺ stands for ${each} children. ${cap(food[i])} has ${a + b} ☺ and ${food[j]} has ${b} ☺. How many more children chose ${food[i]} than ${food[j]}?`, value: a * each, hint: "Find how many more ☺ there are, then multiply.", solution: [`${a + b} − ${b} = ${a} more ☺.`, `${a} × ${each} = ${a * each} more children.`] };
  }),

  // ---------------------------------------------------------------- Year 4
  num({
    id: "roman-numerals", name: "Roman numerals", stage: "KS2", year: 4, strand: "Number", prereqs: ["place-value"],
    blurb: "Read Roman numerals to 100, and then to 1,000.",
    explainer: "I is 1, V is 5, X is 10, L is 50, C is 100, D is 500 and M is 1,000. A smaller letter before a bigger one is taken away.",
    parentNote: "Add the letters left to right, except where a smaller one comes first: IV is 5 − 1 = 4 and XC is 100 − 10 = 90.",
    talkAbout: "Why is IX 9 and not 11?",
  }, (r, l) => {
    const n = l === 1 ? int(r, 4, 39) : l === 2 ? int(r, 40, 199) : int(r, 200, 1999);
    const rn = toRoman(n);
    const parts = romanParts(rn);
    return { prompt: `What number is the Roman numeral ${rn}?`, value: n, hint: "Add the letters from left to right. If a smaller letter comes before a bigger one, take it away.",
      solution: [`Split ${rn} into parts: ${parts.map(([sym, v]) => `${sym} = ${v}`).join(", ")}.`, `${parts.map(([, v]) => v).join(" + ")} = ${n}.`] };
  }),
  num({
    id: "count-through-zero", name: "Counting through zero", stage: "KS2", year: 4, strand: "Number", prereqs: ["add-sub"],
    blurb: "Count backwards through zero into negative numbers, in temperatures and on number lines.",
    explainer: "Going down past zero gives negative numbers. Zero is just a point on the number line that you pass through.",
    parentNote: "A thermometer is the best picture. Count down to zero first, then carry on the rest of the way below it.",
    talkAbout: "How far did you go down to reach zero, and how much further was left?",
  }, (r, l) => {
    if (l === 1) { const t = int(r, 2, 6), d = t + int(r, 1, 5); return { prompt: `The temperature is ${t}°C. It falls by ${d} degrees. What is the new temperature in °C?`, value: t - d, hint: "Count down to 0 first, then carry on below zero.", solution: [`${t} degrees takes you down to 0.`, `${d} − ${t} = ${d - t} more degrees below zero.`, `The new temperature is −${d - t}°C.`] }; }
    if (l === 2) { const s = pick(r, [2, 3, 4, 5]), a = s * int(r, 1, 3) + int(r, 0, 1), seq = [a, a - s, a - 2 * s], fourth = a - 3 * s, fifth = a - 4 * s; return { prompt: `Count back in ${s}s: ${seq.map(neg).join(", ")}, … What is the 5th number in the sequence?`, value: fifth, hint: `Take away ${s} each time. You will go past zero.`, solution: [`The 4th number is ${neg(seq[2])} − ${s} = ${neg(fourth)}.`, `The 5th number is ${neg(fourth)} − ${s} = ${neg(fifth)}.`] }; }
    const t = int(r, 3, 9), d = int(r, 10, 15), up = int(r, 2, 8); return { prompt: `The temperature is ${t}°C. It falls by ${d} degrees and then rises by ${up} degrees. What is the new temperature in °C?`, value: t - d + up, hint: "Do the fall first, then the rise.", solution: [`${t} − ${d} = ${neg(t - d)}.`, `${neg(t - d)} + ${up} = ${neg(t - d + up)}.`, `The new temperature is ${neg(t - d + up)}°C.`] };
  }),
  num({
    id: "divide-10-100", name: "Dividing by 10 and 100", stage: "KS2", year: 4, strand: "Number", prereqs: ["place-value"],
    blurb: "Divide whole numbers by 10 and 100, giving tenths and hundredths.",
    explainer: "Dividing by 10 moves every digit one place to the right. Dividing by 100 moves it two places.",
    parentNote: "The digits stay the same and the decimal point moves, or you can say the digits slide to the right. 345 ÷ 10 is 34.5.",
    talkAbout: "Which way do the digits move when you divide, and by how many places?",
  }, (r, l) => {
    if (l === 1) { const n = 10 * int(r, 4, 90); return { prompt: `What is ${n} ÷ 10?`, value: n / 10, hint: "Each digit moves one place to the right.", solution: [`Moving each digit one place right: ${n} ÷ 10 = ${n / 10}.`] }; }
    if (l === 2) { const n = int(r, 11, 99) * 10 + int(r, 1, 9); return { prompt: `What is ${n} ÷ 10?`, value: round(n / 10, 1), hint: "Each digit moves one place to the right, so the ones become tenths.", solution: [`Moving each digit one place right: ${n} ÷ 10 = ${round(n / 10, 1)}.`] }; }
    const n = int(r, 101, 999); return { prompt: `What is ${n} ÷ 100?`, value: round(n / 100, 2), hint: "Each digit moves two places to the right.", solution: [`Moving each digit two places right: ${n} ÷ 100 = ${round(n / 100, 2)}.`] };
  }),
  num({
    id: "convert-time", name: "Converting units of time", stage: "KS2", year: 4, strand: "Measures", prereqs: ["elapsed-time"],
    blurb: "Convert between seconds, minutes, hours, days and weeks.",
    explainer: "60 seconds make a minute and 60 minutes make an hour. 24 hours make a day and 7 days make a week.",
    parentNote: "Learn the links once: 60, 60, 24, 7. Then multiply to go to a smaller unit, and divide to go to a bigger one.",
    talkAbout: "Do you multiply or divide to change hours into minutes, and why?",
  }, (r, l) => {
    if (l === 1) { const h = int(r, 2, 9); return { prompt: `How many minutes are there in ${h} hours?`, value: h * 60, unit: "min", hint: "There are 60 minutes in 1 hour.", solution: [`${h} × 60 = ${h * 60}.`] }; }
    if (l === 2) { const h = int(r, 1, 4), m = pick(r, [10, 15, 20, 30, 45]); return { prompt: `How many minutes are there in ${h} hour${h > 1 ? "s" : ""} and ${m} minutes?`, value: h * 60 + m, unit: "min", hint: "Change the hours to minutes first.", solution: [`${h} × 60 = ${h * 60} minutes.`, `${h * 60} + ${m} = ${h * 60 + m}.`] }; }
    const w = int(r, 2, 6), d = int(r, 1, 6); return { prompt: `How many days are there in ${w} weeks and ${d} day${d > 1 ? "s" : ""}?`, value: w * 7 + d, hint: "There are 7 days in a week.", solution: [`${w} × 7 = ${w * 7} days.`, `${w * 7} + ${d} = ${w * 7 + d}.`] };
  }),
  num({
    id: "area-counting", name: "Area by counting squares", stage: "KS2", year: 4, strand: "Measures", prereqs: ["times-tables"],
    blurb: "Find the area of rectangles and simple compound shapes by counting or multiplying squares.",
    explainer: "Area is the space inside a shape. Count the squares, or multiply the rows by the number in each row.",
    parentNote: "Rows times columns gives the number of squares in a rectangle. For a shape with a corner missing, find the whole rectangle and take the missing part away.",
    talkAbout: "Why does multiplying the rows by the columns give the same as counting every square?",
  }, (r, l) => {
    if (l === 1) { const a = int(r, 3, 9), b = int(r, 3, 9); return { prompt: `A rectangle covers ${a} rows of ${b} squares. Each square is 1 cm². What is its area in cm²?`, value: a * b, unit: "cm²", hint: "Multiply the rows by the squares in each row.", solution: [`${a} × ${b} = ${a * b} squares.`, `So the area is ${a * b} cm².`] }; }
    if (l === 2) { const w = int(r, 5, 9), h = int(r, 4, 8), cw = int(r, 1, 3), ch = int(r, 1, 3); return { prompt: `A rectangle is ${w} squares wide and ${h} squares tall. A ${cw} by ${ch} corner is cut out. Each square is 1 cm². What is the area of what is left in cm²?`, value: w * h - cw * ch, unit: "cm²", hint: "Find the whole rectangle, then take the cut-out away.", solution: [`The whole rectangle: ${w} × ${h} = ${w * h}.`, `The cut-out: ${cw} × ${ch} = ${cw * ch}.`, `${w * h} − ${cw * ch} = ${w * h - cw * ch}.`] }; }
    const a1 = int(r, 3, 7), b1 = int(r, 3, 6), a2 = int(r, 2, 5), b2 = int(r, 2, 5); return { prompt: `A shape is made of two rectangles joined together. One is ${a1} cm by ${b1} cm and the other is ${a2} cm by ${b2} cm. What is the total area in cm²?`, value: a1 * b1 + a2 * b2, unit: "cm²", hint: "Find the area of each rectangle, then add them.", solution: [`${a1} × ${b1} = ${a1 * b1}.`, `${a2} × ${b2} = ${a2 * b2}.`, `${a1 * b1} + ${a2 * b2} = ${a1 * b1 + a2 * b2}.`] };
  }),
  num({
    id: "perimeter-lshape", name: "Perimeter of compound shapes", stage: "KS2", year: 4, strand: "Measures", prereqs: ["perimeter-simple"],
    blurb: "Find the perimeter of rectilinear shapes, such as an L-shape.",
    explainer: "Add up every side. On a shape with only square corners, the outside edge is as long as the rectangle that fits round it.",
    parentNote: "For an L-shape, the perimeter equals the perimeter of the rectangle drawn round it. Sides that are not labelled can be worked out from the ones that are.",
    talkAbout: "Which sides are not labelled, and how could you work out their length?",
  }, (r, l) => {
    const w = int(r, 6, 12), h = int(r, 5, 10), cw = int(r, 2, w - 3), ch = int(r, 2, h - 3);
    if (l <= 2) return { figure: lShapeFig(w, h, cw, ch), prompt: `An L-shape is made by cutting a ${cw} cm by ${ch} cm corner from a ${w} cm by ${h} cm rectangle. What is the perimeter of the L-shape in cm?`, value: 2 * (w + h), unit: "cm", hint: "The cut-out corner does not change the perimeter. Add up all the outside sides.", solution: [`The outside of the L-shape has the same length as the whole rectangle.`, `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}.`] };
    const a = int(r, 4, 8), b = int(r, 4, 8), c = int(r, 2, 3), d = int(r, 2, 3);
    return { figure: lShapeOutsideFig(a + c, b + d, a, b), prompt: `An L-shape fits inside a rectangle ${a + c} cm wide and ${b + d} cm tall. What is the perimeter of the L-shape in cm?`, value: 2 * (a + c + b + d), unit: "cm", hint: "The perimeter is the same as the rectangle that goes round the shape.", solution: [`Width ${a + c} cm and height ${b + d} cm.`, `2 × (${a + c} + ${b + d}) = ${2 * (a + c + b + d)}.`] };
  }),
  num({
    id: "symmetry-lines", name: "Lines of symmetry", stage: "KS2", year: 4, strand: "Geometry", prereqs: [],
    blurb: "Find and count the lines of symmetry in 2-D shapes and letters.",
    explainer: "A line of symmetry cuts a shape into two halves that are mirror images of each other.",
    parentNote: "Fold a paper shape to test a line of symmetry: both halves should match exactly. A rectangle has two lines of symmetry, not four.",
    talkAbout: "How can you test whether a line really is a line of symmetry?",
  }, (r, l) => {
    const sets: [string, number][][] = [
      [["square", 4], ["rectangle", 2], ["equilateral triangle", 3]],
      [["isosceles triangle", 1], ["regular pentagon", 5], ["regular hexagon", 6], ["kite", 1]],
      [["capital letter H", 2], ["capital letter A", 1], ["capital letter T", 1], ["capital letter M", 1], ["capital letter X", 2]],
    ];
    const [name, n] = pick(r, sets[l - 1]);
    return { prompt: `How many lines of symmetry does a ${name} have?`, value: n, hint: "Imagine folding it in half so that both halves match.", solution: [`A ${name} has ${n} line${n > 1 ? "s" : ""} of symmetry.`] };
  }),
  num({
    id: "read-tables", name: "Reading tables and lists", stage: "KS2", year: 4, strand: "Statistics", prereqs: ["add-sub"],
    blurb: "Solve sum and difference problems using data in tables and lists.",
    explainer: "Read the headings so you know what each number means. Then add or take away to answer the question.",
    parentNote: "Ask them to say what the numbers stand for before they calculate. Most mistakes come from using the wrong row or column.",
    talkAbout: "What does each number in the table stand for?",
  }, (r, l) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday"], v = days.map(() => int(r, 6, 24));
    const list = days.map((d, i) => `${d} ${v[i]}`).join(", ");
    if (l === 1) return { prompt: `Books read at school this week: ${list}. How many books were read on ${days[0]} and ${days[1]} together?`, value: v[0] + v[1], hint: "Add the two numbers.", solution: [`${v[0]} + ${v[1]} = ${v[0] + v[1]}.`] };
    if (l === 2) { const hi = Math.max(...v), lo = Math.min(...v); return { prompt: `Books read at school this week: ${list}. How many more books were read on the busiest day than on the quietest day?`, value: hi - lo, hint: "Find the biggest number and the smallest number, then take one from the other.", solution: [`The busiest day had ${hi} and the quietest had ${lo}.`, `${hi} − ${lo} = ${hi - lo}.`] }; }
    const total = v.reduce((a, b) => a + b, 0); return { prompt: `Books read at school this week: ${list}. On Friday, ${int(r, 5, 15)} more were read than on ${days[0]}. How many books were read from Monday to Thursday in total?`, value: total, hint: "Only add the four days Monday to Thursday.", solution: [`${v.join(" + ")} = ${total}.`] };
  }),
];

/** "XLIV" → [["XL", 40], ["IV", 4]]. Used to show the working for a Roman numeral. */
function romanParts(rn: string): [string, number][] {
  const parts: [string, number][] = [];
  let rest = rn;
  for (const [v, sym] of ROMAN) while (rest.startsWith(sym)) { parts.push([sym, v]); rest = rest.slice(sym.length); }
  return parts;
}

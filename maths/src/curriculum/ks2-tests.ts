import { int, pick } from "../engine/rng";
import type { Figure, Question, Skill } from "../engine/types";
import { choiceSkill } from "./build";
import { num } from "./ks2";

/**
 * Topics added after comparing quarter with the Key Stage 2 tests (docs/SATS_COVERAGE.md): estimating and checking with the inverse, correspondence
 * and scaling problems, listing the combinations of two variables, and translating on a grid in Year 4. Each question works out its own answer.
 */
const money = (p: number) => (p >= 100 ? `£${(p / 100).toFixed(2)}` : `${p}p`);
const n$ = (n: number) => n.toLocaleString("en-GB");
const near = (x: number, to: number) => Math.round(x / to) * to;
const sq = (n: number) => `${n} square${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------------------------------------- estimating, then checking with the inverse
const estimateNum = num({
  id: "estimate-check", name: "Estimate, then check", stage: "KS2", year: 4, strand: "Number", prereqs: ["add-sub", "rounding"],
  blurb: "Estimate an answer by rounding, and check a calculation with the inverse.",
  explainer: "Before you work something out, round the numbers to get a rough answer. Afterwards, use the opposite (inverse) calculation to check: adding checks taking away, and dividing checks multiplying.",
  parentNote: "Ask 'About how big should the answer be?' before they start. Rounding to the first digit is quick: 4,718 is about 5,000. To check, work backwards: if 6,432 − 1,759 = 4,673 is right, then 4,673 + 1,759 must make 6,432.",
  talkAbout: "How can adding help you check a subtraction?",
}, (r, l) => {
  if (l === 1) {
    const a = int(r, 120, 890), b = int(r, 120, 890), add = r() < 0.6, hi = Math.max(a, b), lo = Math.min(a, b);
    const ra = near(add ? a : hi, 100), rb = near(add ? b : lo, 100), v = add ? ra + rb : ra - rb;
    return { prompt: `Estimate ${n$(add ? a : hi)} ${add ? "+" : "−"} ${n$(add ? b : lo)} by rounding each number to the nearest 100.`, value: v, hint: "Round each number first, then do the calculation with the rounded numbers.",
      solution: [`${n$(add ? a : hi)} rounds to ${n$(ra)} and ${n$(add ? b : lo)} rounds to ${n$(rb)}.`, `${n$(ra)} ${add ? "+" : "−"} ${n$(rb)} = ${n$(v)}.`] };
  }
  if (l === 2) {
    const form = int(r, 0, 2);
    if (form === 0) { const a = int(r, 1200, 8800), b = int(r, 1200, 8800), hi = Math.max(a, b), lo = Math.min(a, b), v = near(hi, 1000) - near(lo, 1000);
      return { prompt: `Estimate ${n$(hi)} − ${n$(lo)} by rounding each number to the nearest 1,000.`, value: v, hint: "Round each number to the nearest thousand, then subtract.",
        solution: [`${n$(hi)} rounds to ${n$(near(hi, 1000))} and ${n$(lo)} rounds to ${n$(near(lo, 1000))}.`, `${n$(near(hi, 1000))} − ${n$(near(lo, 1000))} = ${n$(v)}.`] }; }
    if (form === 1) { const a = int(r, 12, 88), b = int(r, 12, 88), v = near(a, 10) * near(b, 10);
      return { prompt: `Estimate ${a} × ${b} by rounding each number to the nearest 10.`, value: v, hint: "Round both numbers to the nearest 10, then multiply.",
        solution: [`${a} rounds to ${near(a, 10)} and ${b} rounds to ${near(b, 10)}.`, `${near(a, 10)} × ${near(b, 10)} = ${n$(v)}.`] }; }
    const a = int(r, 12, 88) * 10 + int(r, 0, 9), b = int(r, 2, 9), v = near(a, 100) * b;
    return { prompt: `Estimate ${a} × ${b} by rounding ${a} to the nearest 100.`, value: v, hint: `Round ${a} to the nearest hundred, then multiply by ${b}.`,
      solution: [`${a} rounds to ${near(a, 100)}.`, `${near(a, 100)} × ${b} = ${n$(v)}.`] };
  }
  // level 3 and above: use the inverse to check someone's answer, and say what the check gives
  const sub = r() < 0.5, a = int(r, 1200, 8800), b = int(r, 200, 999);
  const total = a + b, right = r() < 0.5, claimed = sub ? (right ? a : a + pick(r, [10, -10, 100, -100])) : (right ? total : total + pick(r, [10, -10, 100, -100]));
  if (sub) return { prompt: `Maya works out ${n$(total)} − ${n$(b)} = ${n$(claimed)}. To check, she adds ${n$(b)} to her answer. What does she get?`, value: claimed + b,
    hint: "Add the number that was taken away to her answer. If she gets back to the starting number, her answer is right.",
    solution: [`${n$(claimed)} + ${n$(b)} = ${n$(claimed + b)}.`, claimed + b === total ? `That is ${n$(total)}, the number she started with, so her answer is right.` : `That is not ${n$(total)}, the number she started with, so her answer is wrong. The right answer is ${n$(a)}.`] };
  return { prompt: `Ben works out ${n$(a)} + ${n$(b)} = ${n$(claimed)}. To check, he takes ${n$(b)} away from his answer. What does he get?`, value: claimed - b,
    hint: "Take the number that was added away from his answer. If he gets back to the first number, his answer is right.",
    solution: [`${n$(claimed)} − ${n$(b)} = ${n$(claimed - b)}.`, claimed - b === a ? `That is ${n$(a)}, the number he started with, so his answer is right.` : `That is not ${n$(a)}, the number he started with, so his answer is wrong. The right answer is ${n$(total)}.`] };
});

// the "which calculation checks it?" version, offered at the top levels
const estimateChoice = choiceSkill({ id: "estimate-check", name: "Estimate, then check", stage: "KS2", year: 4, strand: "Number", prereqs: ["add-sub", "rounding"], blurb: "", parentNote: "", talkAbout: "" }, (r) => {
  const kind = int(r, 0, 3);
  if (kind === 0) { const a = int(r, 1200, 8800), b = int(r, 200, 900), t = a + b; return { prompt: `${n$(a)} + ${n$(b)} = ${n$(t)}. Which calculation checks this?`, right: `${n$(t)} − ${n$(b)}`, others: [`${n$(t)} + ${n$(b)}`, `${n$(a)} − ${n$(b)}`, `${n$(a)} × ${n$(b)}`], hint: "Adding is checked by taking away.", solution: [`The inverse of adding ${n$(b)} is taking ${n$(b)} away, so work out ${n$(t)} − ${n$(b)}. It should give ${n$(a)}.`] }; }
  if (kind === 1) { const a = int(r, 3000, 8800), b = int(r, 200, 900), d = a - b; return { prompt: `${n$(a)} − ${n$(b)} = ${n$(d)}. Which calculation checks this?`, right: `${n$(d)} + ${n$(b)}`, others: [`${n$(d)} − ${n$(b)}`, `${n$(a)} + ${n$(b)}`, `${n$(a)} − ${n$(d)} − ${n$(b)}`], hint: "Taking away is checked by adding.", solution: [`The inverse of taking ${n$(b)} away is adding ${n$(b)}, so work out ${n$(d)} + ${n$(b)}. It should give ${n$(a)}.`] }; }
  if (kind === 2) { const a = int(r, 120, 480), b = int(r, 3, 9), p = a * b; return { prompt: `${a} × ${b} = ${n$(p)}. Which calculation checks this?`, right: `${n$(p)} ÷ ${b}`, others: [`${n$(p)} × ${b}`, `${a} ÷ ${b}`, `${n$(p)} − ${b}`], hint: "Multiplying is checked by dividing.", solution: [`The inverse of multiplying by ${b} is dividing by ${b}, so work out ${n$(p)} ÷ ${b}. It should give ${a}.`] }; }
  const b = int(r, 3, 9), q = int(r, 120, 480), n = b * q; return { prompt: `${n$(n)} ÷ ${b} = ${q}. Which calculation checks this?`, right: `${q} × ${b}`, others: [`${q} ÷ ${b}`, `${n$(n)} × ${b}`, `${n$(n)} − ${q}`], hint: "Dividing is checked by multiplying.", solution: [`The inverse of dividing by ${b} is multiplying by ${b}, so work out ${q} × ${b}. It should give ${n$(n)}.`] };
});
export const estimateCheck: Skill = { ...estimateNum, generate: (r, level): Question => (level >= 4 ? estimateChoice.generate(r, level) : estimateNum.generate(r, level)) };

// ---------------------------------------------------------------------------------------------- correspondence and scaling problems
const THINGS: [string, string, string][] = [["T-shirts", "pairs of shorts", "outfits"], ["sandwiches", "drinks", "different lunches"], ["flavours of ice cream", "toppings", "different ice creams"], ["hats", "scarves", "different outfits"], ["starters", "main meals", "different meals"], ["bikes", "helmets", "different pairs"]];
const SCALE: [string, string, string][] = [["A pencil costs", "A pen costs", "p"], ["A bun costs", "A cake costs", "p"], ["A ribbon is", "A rope is", " cm long"], ["A bag of apples weighs", "A bag of potatoes weighs", " g"]];
export const correspondence: Skill = num({
  id: "correspondence", name: "Scaling and correspondence problems", stage: "KS2", year: 4, strand: "Number", prereqs: ["times-tables", "mult-written"],
  blurb: "Solve problems about 'times as many' and about pairing each of one thing with each of another.",
  explainer: "'4 times as much' means multiply by 4. To find how many ways to pair things up, multiply: 3 hats and 4 scarves make 3 × 4 = 12 different outfits.",
  parentNote: "Draw it out: list the hats down the side and the scarves along the top, and fill in a grid. Counting the squares is the same as multiplying. For 'times as much' draw one bar and a longer bar made of equal bars.",
  talkAbout: "How would you show 3 hats and 4 scarves as a grid?",
}, (r, l) => {
  if (l === 1) {
    const [a, b, unit] = pick(r, SCALE), x = int(r, 3, 9) * (unit === "p" ? 2 : 3), k = int(r, 3, 9), v = x * k;
    const word = unit === " cm long" || unit === " g" ? `${x}${unit === " g" ? " g" : " cm"}` : money(x);
    return { prompt: `${a} ${word}${unit === " cm long" ? " long" : ""}. ${b} ${k} times as ${unit === "p" ? "much" : unit === " g" ? "heavy" : "long"}. How ${unit === "p" ? "much does it cost, in pence" : unit === " g" ? "heavy is it, in grams" : "long is it, in centimetres"}?`, value: v,
      hint: `'${k} times as ${unit === "p" ? "much" : "long"}' means multiply by ${k}.`, solution: [`Multiply by ${k}: ${x} × ${k} = ${v}.`] };
  }
  if (l === 2) {
    const [a, b, what] = pick(r, THINGS), x = int(r, 2, 6), y = int(r, 3, 8);
    return { prompt: `A shop has ${x} different ${a} and ${y} different ${b}. How many ${what} can be made with one of each?`, value: x * y,
      hint: `Pair each of the ${x} with each of the ${y}. Draw a grid if it helps.`, solution: [`Each of the ${x} can be paired with ${y} different ones.`, `${x} × ${y} = ${x * y}.`] };
  }
  if (l === 3) {
    const k1 = int(r, 2, 5), k2 = int(r, 2, 5), x = int(r, 3, 9) * 2, middle = x * k1;
    if (r() < 0.5) return { prompt: `A rope is ${k1} times as long as a ribbon that is ${x} cm long. A string is ${k2} times as long as the rope. How long is the string, in centimetres?`, value: middle * k2,
      hint: "Find the rope first, then the string.", solution: [`The rope is ${x} × ${k1} = ${middle} cm.`, `The string is ${middle} × ${k2} = ${middle * k2} cm.`] };
    const [a, b, what] = pick(r, THINGS), p = int(r, 2, 5), q = int(r, 2, 5), extra = int(r, 2, 4);
    return { prompt: `A shop has ${p} different ${a} and ${q} different ${b}. It then gets ${extra} more different ${b}. How many ${what} can be made now, with one of each?`, value: p * (q + extra),
      hint: "Find how many kinds of the second thing there are now, then pair each with each.", solution: [`There are ${q} + ${extra} = ${q + extra} different ${b} now.`, `${p} × ${q + extra} = ${p * (q + extra)}.`] };
  }
  const k = int(r, 3, 9), toy = int(r, 6, 19), tall = toy * k;
  return { prompt: `A tower is ${tall} cm tall. It is ${k} times as tall as a toy. How tall is the toy, in centimetres?`, value: toy, hint: `The tower is ${k} times the toy, so divide to go back.`, solution: [`${tall} ÷ ${k} = ${toy}.`, `Check: ${toy} × ${k} = ${tall}.`] };
});

// ---------------------------------------------------------------------------------------------- listing the combinations of two variables
export const combinations: Skill = num({
  id: "combinations", name: "Listing combinations", stage: "KS2", year: 6, strand: "Algebra", prereqs: ["correspondence", "two-unknowns"],
  blurb: "List and count the pairs of numbers that fit a rule, and the ways of arranging digits.",
  explainer: "To find every possibility, be organised. Start with the smallest first number and work through in order, so you don't miss any or count one twice.",
  parentNote: "A tidy list is the whole skill. Write the pairs in a table, going up one at a time: 1 and 9, 2 and 8, 3 and 7… Seeing the pattern then lets them count without listing every one.",
  talkAbout: "How can you be sure you haven't missed a pair or counted one twice?",
}, (r, l) => {
  if (l === 1) {
    const t = int(r, 5, 11), pairs = Array.from({ length: t - 1 }, (_, i) => `${i + 1} and ${t - i - 1}`);
    return { prompt: `How many different pairs of whole numbers (both more than 0) have a total of ${t}? Count 1 and ${t - 1} as different from ${t - 1} and 1.`, value: t - 1,
      hint: "Start with 1 and the number that goes with it, then 2, and so on.", solution: [`The pairs are: ${pairs.join(", ")}.`, `That is ${t - 1} pairs.`] };
  }
  if (l === 2) {
    const n = pick(r, [12, 18, 20, 24, 30, 36]), pairs: string[] = [];
    for (let a = 1; a <= n; a++) if (n % a === 0) pairs.push(`${a} × ${n / a}`);
    return { prompt: `a and b are whole numbers more than 0, and a × b = ${n}. How many different pairs (a, b) are there? (a = 2, b = ${n / 2} is different from a = ${n / 2}, b = 2.)`, value: pairs.length,
      hint: `Find every number that divides exactly into ${n}. Each one is a possible a.`, solution: [`The pairs are: ${pairs.join(", ")}.`, `That is ${pairs.length} pairs.`] };
  }
  if (l === 3) {
    const digits = pick(r, [[2, 5, 7], [3, 4, 8], [1, 6, 9], [2, 3, 6]]), count = digits.length * (digits.length - 1);
    const list: string[] = []; for (const a of digits) for (const b of digits) if (a !== b) list.push(`${a}${b}`);
    return { prompt: `Using two different digits from ${digits.join(", ")}, how many different two-digit numbers can be made?`, value: count, hint: "Choose the tens digit first, then the ones digit from the others.",
      solution: [`With each tens digit there are ${digits.length - 1} choices for the ones digit.`, `The numbers are: ${list.join(", ")}.`, `That is ${digits.length} × ${digits.length - 1} = ${count}.`] };
  }
  if (l === 4) {
    const total = pick(r, [10, 12, 14, 16, 20]), pairs: string[] = [];
    for (let b = 1; 2 * b < total; b++) pairs.push(`a = ${total - 2 * b}, b = ${b}`);
    return { prompt: `a and b are whole numbers more than 0, and a + 2 × b = ${total}. How many different pairs (a, b) are there?`, value: pairs.length, hint: "Try b = 1, then b = 2, and so on. Work out a each time and stop when a would be 0 or less.",
      solution: [`The pairs are: ${pairs.join("; ")}.`, `That is ${pairs.length} pairs.`] };
  }
  const digits = pick(r, [[2, 5, 7], [3, 4, 8], [1, 6, 9]]), list: string[] = [];
  for (const a of digits) for (const b of digits) for (const c of digits) if (a !== b && b !== c && a !== c) list.push(`${a}${b}${c}`);
  return { prompt: `Using the digits ${digits.join(", ")} once each, how many different three-digit numbers can be made?`, value: list.length, hint: "There are 3 choices for the hundreds digit, then fewer for each digit after.",
    solution: [`3 choices for the hundreds digit, 2 for the tens, 1 for the ones: 3 × 2 × 1 = 6.`, `The numbers are: ${list.join(", ")}.`] };
});

// ---------------------------------------------------------------------------------------------- translating on a grid
const grid = (max: number, pts: { x: number; y: number; label: string }[], poly: [number, number][] | undefined, alt: string): Figure => ({ type: "coord-grid", max, points: pts, poly, alt });
export const translateGrid: Skill = {
  id: "translate-grid", name: "Translating on a grid", stage: "KS2", year: 4, strand: "Geometry", prereqs: ["coordinates"],
  blurb: "Move a point or shape left, right, up or down on a grid, and describe the move.",
  explainer: "A translation slides a shape without turning it. Right or left changes the first number of the coordinates, and up or down changes the second.",
  parentNote: "Use a chess board or a drawn grid. Move a counter and say the move aloud: '3 right, 2 up'. The first number of a coordinate is always how far along, the second how far up.",
  talkAbout: "Which coordinate changes when a shape moves up?",
  generate(r, level): Question {
    const max = 8;
    if (level === 1) {
      const dx = int(r, 2, 4), right = r() < 0.5, x = int(r, 1, right ? 8 - dx : 5), y = int(r, 1, right ? 5 : 8 - dx), nx = right ? x + dx : x, ny = right ? y : y + dx;
      return { skill: "translate-grid", level, figure: grid(max, [{ x, y, label: "A" }], undefined, `A grid with point A at (${x}, ${y}).`),
        prompt: `Point A is at (${x}, ${y}). It moves ${sq(dx)} ${right ? "right" : "up"}. What are its new coordinates?`,
        answer: { kind: "multi", fields: [{ label: "x =", value: nx }, { label: "y =", value: ny }] }, hint: right ? "Moving right changes the first number." : "Moving up changes the second number.",
        solution: [right ? `Moving right adds to the first number: ${x} + ${dx} = ${nx}.` : `Moving up adds to the second number: ${y} + ${dx} = ${ny}.`, `The new point is (${nx}, ${ny}).`], shown: `(${nx}, ${ny})` };
    }
    if (level === 2) {
      const dx = int(r, 1, 4), dy = int(r, 1, 4), left = r() < 0.5, down = r() < 0.5, x = left ? int(r, 1 + dx, 8) : int(r, 1, 8 - dx), y = down ? int(r, 1 + dy, 8) : int(r, 1, 8 - dy);
      const nx = left ? x - dx : x + dx, ny = down ? y - dy : y + dy;
      return { skill: "translate-grid", level, figure: grid(max, [{ x, y, label: "P" }], undefined, `A grid with point P at (${x}, ${y}).`),
        prompt: `Point P is at (${x}, ${y}). It moves ${sq(dx)} ${left ? "left" : "right"} and ${sq(dy)} ${down ? "down" : "up"}. What are its new coordinates?`,
        answer: { kind: "multi", fields: [{ label: "x =", value: nx }, { label: "y =", value: ny }] }, hint: "Left and right change the first number. Up and down change the second.",
        solution: [`${left ? "Left takes away from" : "Right adds to"} the first number: ${x} ${left ? "−" : "+"} ${dx} = ${nx}.`, `${down ? "Down takes away from" : "Up adds to"} the second number: ${y} ${down ? "−" : "+"} ${dy} = ${ny}.`, `The new point is (${nx}, ${ny}).`], shown: `(${nx}, ${ny})` };
    }
    // levels 3 to 5: describe a translation, and move a shape
    const dx = int(r, 1, 4) * (r() < 0.5 ? -1 : 1), dy = int(r, 1, 4) * (r() < 0.5 ? -1 : 1);
    const x = int(r, Math.max(1, 1 - dx), Math.min(7, 7 - dx)), y = int(r, Math.max(1, 1 - dy), Math.min(7, 7 - dy));
    if (level === 3) {
      const horizontal = r() < 0.5, how = horizontal ? Math.abs(dx) : Math.abs(dy);
      return { skill: "translate-grid", level, figure: grid(max, [{ x, y, label: "A" }, { x: x + dx, y: y + dy, label: "B" }], undefined, `A grid with point A at (${x}, ${y}) and point B at (${x + dx}, ${y + dy}).`),
        prompt: `Point A (${x}, ${y}) is moved to point B (${x + dx}, ${y + dy}). How many squares ${horizontal ? (dx > 0 ? "right" : "left") : dy > 0 ? "up" : "down"} did it move?`, answer: { kind: "number", value: how }, hint: horizontal ? "Compare the first numbers." : "Compare the second numbers.",
        solution: [horizontal ? `The first number went from ${x} to ${x + dx}, a move of ${how}.` : `The second number went from ${y} to ${y + dy}, a move of ${how}.`], shown: String(how) };
    }
    const px = int(r, 1, 2), py = int(r, 1, 3), shape: [number, number][] = [[px, py], [px + 2, py], [px + 2, py + 1], [px, py + 1]];
    const dx2 = int(r, 1, 3), dy2 = int(r, 1, 4), target = pick(r, shape.map((s, i) => [s, i] as const));
    const moved = shape.map(([a, b]) => [a + dx2, b + dy2] as [number, number]), which = target[1];
    const [tx, ty] = moved[which];
    return { skill: "translate-grid", level, figure: grid(max, shape.map(([a, b], i) => ({ x: a, y: b, label: "ABCD"[i] })), shape, `A rectangle with corners A (${shape[0]}), B (${shape[1]}), C (${shape[2]}) and D (${shape[3]}).`),
      prompt: `The rectangle ABCD is moved ${sq(dx2)} right and ${sq(dy2)} up. Corner ${"ABCD"[which]} starts at (${shape[which][0]}, ${shape[which][1]}). What are the new coordinates of ${"ABCD"[which]}?`,
      answer: { kind: "multi", fields: [{ label: "x =", value: tx }, { label: "y =", value: ty }] }, hint: "Add the move right to the first number and the move up to the second number.",
      solution: [`Right adds to the first number: ${shape[which][0]} + ${dx2} = ${tx}.`, `Up adds to the second number: ${shape[which][1]} + ${dy2} = ${ty}.`, `Corner ${"ABCD"[which]} is now at (${tx}, ${ty}).`], shown: `(${tx}, ${ty})` };
  },
};

export const ks2TestSkills: Skill[] = [estimateCheck, correspondence, combinations, translateGrid];

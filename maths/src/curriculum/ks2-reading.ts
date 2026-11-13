import { int, pick } from "../engine/rng";
import { shuffle } from "./helpers";
import type { Question, Skill } from "../engine/types";

/**
 * Test-style problems for Key Stage 2. The Key Stage 2 reasoning papers (docs/SATS_COVERAGE.md) use longer wording than most of our questions (about
 * three times as many words, a named person, details that are not needed) and often ask which statement is true or whether someone is right. These
 * topics practise reading a longer problem, picking out what matters, and judging a claim. Each question works out its own answer.
 */
const NAMES = ["Maya", "Ben", "Zara", "Leo", "Priya", "Sam", "Amy", "Omar", "Ella", "Kai", "Ruby", "Dev"];
const n$ = (n: number) => n.toLocaleString("en-GB");
const two = (r: () => number) => { const a = pick(r, NAMES); let b = pick(r, NAMES); while (b === a) b = pick(r, NAMES); return [a, b] as const; };

// ---------------------------------------------------------------------------------------------- longer problems, with a detail that isn't needed
function story(r: () => number, level: number): Question {
  const [N, M] = two(r), t = int(r, 1, 5);
  const big = level >= 3;
  let prompt = "", value = 0, solution: string[] = [], pre = "", post = "";
  const hint = "Underline what you need. Some of the numbers are not needed.";
  if (t === 1) {
    const friends = int(r, 6, 12), packs = int(r, 2, big ? 9 : 5), stickers = int(r, 6, 12), price = int(r, 2, big ? 9 : 4), card = int(r, 2, 9), extra = level >= 4 ? int(r, 3, 8) : 0;
    value = packs * price + card + extra; pre = "£";
    prompt = `${N} is making party bags for ${friends} friends. ${N} buys ${packs} packs of stickers. Each pack has ${stickers} stickers and costs £${price}. ${N} also buys a card for £${card}${extra ? ` and a balloon for £${extra}` : ""}. How much does ${N} spend, in pounds?`;
    solution = [`The number of stickers in a pack (${stickers}) and the number of friends (${friends}) are not needed.`, `${packs} packs cost ${packs} × ${price} = £${packs * price}.`, `Add the card${extra ? " and the balloon" : ""}: ${packs * price} + ${card}${extra ? ` + ${extra}` : ""} = £${value}.`];
  } else if (t === 2) {
    const flour = int(r, 4, 9) * 25, per = pick(r, [4, 5, 6, 8]), k = int(r, 2, big ? 6 : 4), kids = int(r, 18, 32);
    value = flour * k; post = " g";
    prompt = `${N} is baking for a class of ${kids} children. A recipe uses ${flour} g of flour to make ${per} biscuits. ${N} wants to make ${per * k} biscuits. How many grams of flour does ${N} need?`;
    solution = [`The class size (${kids}) is not needed.`, `${per * k} biscuits is ${k} times the recipe (${per * k} ÷ ${per} = ${k}).`, `${flour} × ${k} = ${value} g of flour.`];
  } else if (t === 3) {
    let a = int(r, 3, big ? 9 : 6), b = int(r, 2, a - 1); const d = pick(r, [3, 4, 5]), school = int(r, 120, 480);
    if (a <= b) a = b + 1;
    value = 2 * d * (a - b); post = " km";
    prompt = `${N} lives ${a} km from school and ${M} lives ${b} km from school. Each of them walks to school and back home again, ${d} days a week. The school has ${school} pupils. How many more kilometres does ${N} walk in a week than ${M}?`;
    solution = [`The number of pupils (${school}) is not needed.`, `A day's walk is there and back, so ${N} walks ${a} × 2 = ${a * 2} km and ${M} walks ${b} × 2 = ${b * 2} km.`, `The difference is ${2 * (a - b)} km a day, and ${2 * (a - b)} × ${d} = ${value} km a week.`];
  } else if (t === 4) {
    const fiction = int(r, 120, big ? 480 : 240), non = int(r, 90, 300), comics = int(r, 30, 90), out = int(r, 20, 70), staff = int(r, 3, 9);
    value = fiction + non + comics - out;
    prompt = `The library at ${N}'s school has ${n$(fiction)} fiction books, ${n$(non)} non-fiction books and ${comics} comics. ${staff} teachers help to run it. ${out} of the fiction books are lent out this week. How many books and comics are in the library now?`;
    solution = [`The number of teachers (${staff}) is not needed.`, `All together: ${fiction} + ${non} + ${comics} = ${fiction + non + comics}.`, `Take away the ones lent out: ${fiction + non + comics} − ${out} = ${value}.`];
  } else {
    const price = int(r, 3, 9), k = int(r, 3, big ? 8 : 5), pay = Math.ceil((price * k + 1) / 5) * 5 + (level >= 4 ? 10 : 0), bag = int(r, 1, 4);
    value = pay - price * k; pre = "£";
    prompt = `${N} buys ${k} notebooks at £${price} each and a bag for £${bag}, which is free because of a voucher. ${N} pays with £${pay}. How much change does ${N} get, in pounds?`;
    solution = [`The bag is free, so it costs nothing.`, `${k} notebooks cost ${k} × ${price} = £${price * k}.`, `Change: ${pay} − ${price * k} = £${value}.`];
  }
  return { skill: "test-problems", level, prompt, answer: { kind: "number", value }, hint, solution, shown: `${pre}${n$(value)}${post}` };
}

// ---------------------------------------------------------------------------------------------- which statement is true, and is someone right
type Claim = { text: string; true: boolean; why: string };
function claims(r: () => number, level: number): Claim[] {
  const out: Claim[] = [];
  const mk = (text: string, ok: boolean, why: string) => out.push({ text, true: ok, why });
  const kind = int(r, 0, 3);
  if (kind === 0) {        // rounding
    const n = int(r, 1200, 8800), to = pick(r, level >= 3 ? [10, 100, 1000] : [10, 100]);
    const right = Math.round(n / to) * to, wrongs = [right + to, right - to, Math.floor(n / to) * to === right ? Math.ceil(n / to) * to + to : Math.floor(n / to) * to];
    mk(`${n$(n)} rounded to the nearest ${n$(to)} is ${n$(right)}.`, true, `${n$(n)} is closest to ${n$(right)}.`);
    for (const w of [...new Set(wrongs)].filter((x) => x !== right).slice(0, 3)) mk(`${n$(n)} rounded to the nearest ${n$(to)} is ${n$(w)}.`, false, `${n$(n)} rounds to ${n$(right)}, not ${n$(w)}.`);
  } else if (kind === 1) { // multiples: exactly one of the four numbers named is a divisor
    let n = 0, yes: number[] = [], no: number[] = [];
    do { n = int(r, 6, 11) * int(r, 3, 9); yes = [2, 3, 4, 5, 6, 7, 8, 9].filter((d) => n % d === 0); no = [2, 3, 4, 5, 6, 7, 8, 9].filter((d) => n % d !== 0); } while (!yes.length || no.length < 3);
    const d1 = pick(r, yes);
    mk(`${n} is a multiple of ${d1}.`, true, `${n} ÷ ${d1} = ${n / d1}, so it is a multiple of ${d1}.`);
    for (const d of shuffle(r, no).slice(0, 3)) mk(`${n} is a multiple of ${d}.`, false, `${n} ÷ ${d} is not a whole number.`);
  } else if (kind === 2) { // comparing fractions of an amount: one true comparison and three false ones
    const total = pick(r, [24, 36, 48, 60, 72]), fr: [number, number][] = [[1, 2], [1, 3], [1, 4], [1, 6], [2, 3], [3, 4]];
    const pairs: [[number, number], [number, number]][] = [];
    for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) pairs.push([fr[i], fr[j]]);
    const chosen = shuffle(r, pairs).slice(0, 4), word = (f: [number, number]) => `${f[0]}/${f[1]}`, val = (f: [number, number]) => (total * f[0]) / f[1];
    chosen.forEach(([f, g], i) => {
      const [big, small] = val(f) > val(g) ? [f, g] : [g, f];
      if (i === 0) mk(`${word(big)} of ${total} is greater than ${word(small)} of ${total}.`, true, `${word(big)} of ${total} = ${val(big)} and ${word(small)} of ${total} = ${val(small)}.`);
      else mk(`${word(small)} of ${total} is greater than ${word(big)} of ${total}.`, false, `${word(small)} of ${total} = ${val(small)}, which is less than ${word(big)} of ${total} = ${val(big)}.`);
    });
  } else {                 // place value and size
    const a = int(r, 1000, 9999), b = int(r, 1000, 9999) || a + 1, d = pick(r, [10, 100]);
    const fn = (x: number) => x * d;
    mk(`${n$(a)} × ${d} = ${n$(fn(a))}.`, true, `Multiplying by ${d} moves every digit ${d === 10 ? "one place" : "two places"} to the left.`);
    mk(`${n$(a)} × ${d} = ${n$(a + d)}.`, false, `Multiplying by ${d} is not the same as adding ${d}.`);
    mk(`${n$(b)} ÷ ${d} is bigger than ${n$(b)}.`, false, `Dividing by ${d} makes a number smaller.`);
    mk(`${n$(a)} × ${d} = ${n$(a * d * 10)}.`, false, `That is ${d * 10} times ${n$(a)}, not ${d} times.`);
  }
  return out;
}

function pickTrue(r: () => number, level: number): Question {
  let cs = claims(r, level), guard = 0;
  while (cs.filter((c) => c.true).length !== 1 && guard++ < 30) cs = claims(r, level);
  const options = shuffle(r, cs), right = options.find((c) => c.true)!;
  return { skill: "test-claims", level, prompt: "Tick the statement that is true.", answer: { kind: "choice", options: options.map((c) => ({ text: c.text })), correct: options.indexOf(right) },
    hint: "Check each statement. Only one is true.", solution: options.map((c) => `${c.text} ${c.true ? "True." : "Not true."} ${c.why}`), shown: right.text };
}

function isCorrect(r: () => number, level: number): Question {
  const [N] = two(r), kind = int(r, 0, 2);
  let said = "", ok = true, why = "";
  if (kind === 0) {
    const a = int(r, 1100, 8800), b = int(r, 200, 900), claimed = r() < 0.5 ? a + b : a + b + pick(r, [10, -10, 100, -100]);
    said = `${N} says: "${n$(a)} + ${n$(b)} = ${n$(claimed)}."`; ok = claimed === a + b; why = `${n$(a)} + ${n$(b)} = ${n$(a + b)}.${ok ? "" : ` ${N}'s answer is not right.`}`;
  } else if (kind === 1) {
    const total = pick(r, [40, 60, 80, 120, 200]), p = pick(r, [10, 20, 25, 50]), claimed = r() < 0.5 ? (total * p) / 100 : (total * p) / 100 + pick(r, [5, -5, 10]);
    said = `${N} says: "${p}% of ${total} is ${claimed}."`; ok = claimed === (total * p) / 100; why = `${p}% of ${total} = ${(total * p) / 100}.${ok ? "" : ` ${N}'s answer is not right.`}`;
  } else {
    const a = int(r, 3, 9), b = int(r, 3, 9), c = int(r, 2, 6), claimed = r() < 0.5 ? a * b + c : a * (b + c);
    said = `${N} works out ${a} × ${b} + ${c} and says the answer is ${claimed}.`; ok = claimed === a * b + c; why = `Multiplication comes before addition: ${a} × ${b} = ${a * b}, then ${a * b} + ${c} = ${a * b + c}.${ok ? "" : ` ${N}'s answer is not right.`}`;
  }
  const options = [{ text: "Yes, " + N + " is correct." }, { text: "No, " + N + " is not correct." }];
  return { skill: "test-claims", level, prompt: `${said} Is ${N} correct?`, answer: { kind: "choice", options, correct: ok ? 0 : 1 }, hint: "Work it out yourself, then compare.", solution: [why], shown: ok ? options[0].text : options[1].text };
}

export const testProblems: Skill = {
  id: "test-problems", name: "Longer test-style problems", stage: "KS2", year: 6, strand: "Number", prereqs: ["word-problems"],
  blurb: "Read a longer problem, pick out what matters, and work it out in steps.",
  explainer: "Test problems can be long, and some of the numbers aren't needed. Read it twice, underline the question, then decide which numbers you need and what to do with them.",
  parentNote: "Most mistakes on long problems are reading mistakes, not sums. Ask them to say in their own words what the question is asking, then cross out the numbers they don't need before they start.",
  talkAbout: "Which number in the problem did you not need, and how did you know?",
  generate: story,
};

export const testClaims: Skill = {
  id: "test-claims", name: "True or false? Is it correct?", stage: "KS2", year: 6, strand: "Number", prereqs: ["word-problems"],
  blurb: "Decide which statement is true, or whether someone's answer is right, and say why.",
  explainer: "Some questions give you statements to judge. Work each one out for yourself, then pick the one that is true, or say whether someone is right.",
  parentNote: "Encourage them to test every statement rather than hunt for the one that 'looks' right. After they answer, ask them to say why the others are wrong.",
  talkAbout: "How did you know the other statements weren't true?",
  generate: (r, level): Question => (level % 2 === 0 ? isCorrect(r, level) : pickTrue(r, level)),
};

export const ks2ReadingSkills: Skill[] = [testProblems, testClaims];

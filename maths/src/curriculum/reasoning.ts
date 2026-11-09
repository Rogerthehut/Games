/**
 * Reasoning: verbal reasoning, non-verbal reasoning, and problem solving.
 * Everything here is original. Each generator checks its own answer (by brute force or by an independent solver that the
 * tests reuse), so a puzzle with two right answers is never shown.
 */
import type { ChoiceOption, Glyph, Mark, Misconception, Question, Skill } from "../engine/types";
import { int, pick } from "../engine/rng";
import { shuffle } from "./helpers";

type R = () => number;

/* ------------------------------------------------------------------ choices */

interface Wrong { opt: ChoiceOption; tag?: string; message?: string }
const key = (o: ChoiceOption) => ("glyph" in o ? `g:${visualKey(o.glyph)}` : JSON.stringify(o));
const text = (t: string): ChoiceOption => ({ text: t });
const glyph = (g: Glyph): ChoiceOption => ({ glyph: g });
const LETTERS = "ABCDE";

/** Shuffle the right answer in with up to four wrong ones. Duplicates of the right answer or of each other are dropped. */
function choose(r: R, right: ChoiceOption, wrongs: (ChoiceOption | Wrong)[], want = 5) {
  const seen = new Set([key(right)]);
  const unique: Wrong[] = [];
  for (const w of wrongs) {
    const item: Wrong = "opt" in w ? w : { opt: w };
    if (seen.has(key(item.opt))) continue;
    seen.add(key(item.opt));
    unique.push(item);
  }
  // keep the ones with a message first, then fill from the rest in a random order
  const withMessage = unique.filter((w) => w.message);
  const rest = shuffle(r, unique.filter((w) => !w.message));
  const chosen = [...shuffle(r, withMessage), ...rest].slice(0, want - 1);
  const order = shuffle(r, [{ opt: right } as Wrong, ...chosen]);
  const correct = order.findIndex((w) => w.opt === right);
  const misconceptions: Misconception[] = order.flatMap((w, i) => (w.message && w.tag ? [{ tag: w.tag, message: w.message, number: i }] : []));
  return {
    answer: { kind: "choice" as const, options: order.map((w) => w.opt), correct },
    wrong: misconceptions.length ? misconceptions : undefined,
    letter: LETTERS[correct],
    shown: "text" in right ? `${LETTERS[correct]}: ${right.text}` : LETTERS[correct],
  };
}

function build(skill: string, level: number, prompt: string, built: ReturnType<typeof choose>, hint: string, solution: string[], figure?: Question["figure"]): Question {
  return { skill, level, prompt, figure, answer: built.answer, hint, solution, shown: built.shown, wrong: built.wrong };
}

const NAMES = ["Maya", "Ben", "Aisha", "Tom", "Zara", "Leo", "Priya", "Sam", "Ella", "Omar", "Ruth", "Kai"];
const letter = (n: number) => String.fromCharCode(65 + n);
const code = (c: string) => c.charCodeAt(0) - 65;

/* ------------------------------------------------------------------ verbal: letter series */

function letterSeries(r: R, level: number): Question {
  let seq: number[] = [], rule = "";
  for (let tries = 0; tries < 200; tries++) {
    if (level === 1) {
      const d = int(r, 1, 3) * (r() < 0.25 ? -1 : 1), start = int(r, 0, 25);
      seq = Array.from({ length: 5 }, (_, i) => start + d * i);
      rule = `${d > 0 ? "forward" : "back"} ${Math.abs(d)} each time`;
    } else if (level === 2) {
      const a = int(r, 1, 4), b = int(r, 1, 4), start = int(r, 0, 25);
      if (a === b) continue;
      seq = [start];
      for (let i = 0; i < 5; i++) seq.push(seq[i] + (i % 2 === 0 ? a : b));
      rule = `forward ${a}, then forward ${b}, then ${a}, then ${b}, and so on`;
    } else {
      // two interleaved series: odd places go up, even places go down (or up by different steps)
      const a = int(r, 1, 3), b = int(r, 1, 3) * (r() < 0.5 ? -1 : 1), s1 = int(r, 0, 25), s2 = int(r, 0, 25);
      seq = Array.from({ length: 7 }, (_, i) => (i % 2 === 0 ? s1 + a * (i / 2) : s2 + b * ((i - 1) / 2)));
      rule = `two series mixed together: the 1st, 3rd, 5th... go forward ${a}; the 2nd, 4th, 6th... go ${b > 0 ? "forward" : "back"} ${Math.abs(b)}`;
    }
    if (seq.every((n) => n >= 0 && n <= 25)) break;
    seq = [];
  }
  if (!seq.length) return letterSeries(r, level);
  const shown = seq.slice(0, -1), next = seq[seq.length - 1];
  const lastStep = shown[shown.length - 1] - shown[shown.length - 2];
  const wrongs: Wrong[] = [
    ...(level >= 2 ? [{ opt: text(letter(shown[shown.length - 1] + lastStep)), tag: "series-same-step", message: "That keeps the last step going. The gaps change, so look at the pattern of gaps." } as Wrong] : []),
    ...[-3, -2, -1, 1, 2, 3].filter((d) => next + d >= 0 && next + d <= 25).map((d) => ({ opt: text(letter(next + d)) })),
  ];
  const b = choose(r, text(letter(next)), wrongs);
  const gaps = shown.slice(1).map((n, i) => n - shown[i]);
  return build("vr-letter-series", level,
    `Which letter comes next in this series? ${shown.map(letter).join(", ")}, ?`, b,
    "Count how many places each letter moves along the alphabet.",
    [`Count the steps between the letters: ${gaps.map((g) => (g > 0 ? `+${g}` : `${g}`)).join(", ")}.`, `The pattern is: ${rule}.`, `So the next letter is ${letter(next)}.`]);
}

/* ------------------------------------------------------------------ verbal: alphabet codes */

const CODE_WORDS = ["CAT", "DOG", "SUN", "BOX", "HAT", "PEN", "MAP", "CUP", "BED", "FOX", "JAM", "KEY", "NET", "ZOO", "WEB"];
const shiftWord = (w: string, s: number) => [...w].map((c) => letter(((code(c) + s) % 26 + 26) % 26)).join("");
const mirrorWord = (w: string) => [...w].map((c) => letter(25 - code(c))).join("");
const wordValue = (w: string) => [...w].reduce((t, c) => t + code(c) + 1, 0);

function alphabetCodes(r: R, level: number): Question {
  const [w1, w2] = shuffle(r, CODE_WORDS);
  if (level === 1) {
    const s = pick(r, [1, 2, 3, -1, -2]);
    const right = shiftWord(w2, s);
    const b = choose(r, text(right), [
      { opt: text(shiftWord(w2, -s)), tag: "code-wrong-way", message: "That moves the letters the wrong way along the alphabet." },
      { opt: text(shiftWord(w2, s + 1)) }, { opt: text(shiftWord(w2, s - 1)) },
      { opt: text(shiftWord(w2, s).slice(0, 2) + w2[2]) }, { opt: text(mirrorWord(w2)) },
    ]);
    return build("vr-alphabet-codes", level,
      `In a code, ${w1} is written as ${shiftWord(w1, s)}. How is ${w2} written in the same code?`, b,
      "Compare the first letter of the word with the first letter of its code. How many places has it moved, and which way?",
      [`${w1[0]} to ${shiftWord(w1, s)[0]}: the letter moves ${Math.abs(s)} place${Math.abs(s) > 1 ? "s" : ""} ${s > 0 ? "forward" : "back"}.`, `Move every letter of ${w2} the same way.`, `${w2} is written ${right}.`]);
  }
  if (level === 2) {
    const v = wordValue(w2);
    const b = choose(r, text(String(v)), [
      { opt: text(String(v - 1)) }, { opt: text(String(v + 1)) }, { opt: text(String(v + 10)) },
      { opt: text(String(wordValue(w2.slice(0, 2)))), tag: "code-missed-letter", message: "That adds only the first two letters. Add every letter." },
      { opt: text(String(code(w2[0]) + code(w2[1]) + code(w2[2]))), tag: "code-from-zero", message: "A is 1, not 0. Each letter is one more than its place counted from 0." },
    ]);
    return build("vr-alphabet-codes", level,
      `In a code, A = 1, B = 2, C = 3 and so on up to Z = 26. What is the value of the word ${w2}? Add up its letters.`, b,
      "Write the number for each letter, then add them.",
      [...[...w2].map((c) => `${c} = ${code(c) + 1}`), `${[...w2].map((c) => code(c) + 1).join(" + ")} = ${v}.`]);
  }
  const right = mirrorWord(w2);
  const b = choose(r, text(right), [
    { opt: text(shiftWord(w2, 1)) }, { opt: text(shiftWord(w2, -1)) }, { opt: text(shiftWord(w2, 13)), tag: "code-half-way", message: "That moves each letter half way round, which is a different code." },
    { opt: text([...right].reverse().join("")) }, { opt: text(right.slice(0, 2) + w2[2]) },
  ]);
  return build("vr-alphabet-codes", level,
    `In a code, the alphabet is written backwards: A becomes Z, B becomes Y, and so on. ${w1} is written ${mirrorWord(w1)}. How is ${w2} written?`, b,
    "A and Z swap, B and Y swap. Find the partner of each letter.",
    ["The letters are swapped in pairs: A with Z, B with Y, C with X.", `${[...w2].map((c) => `${c} becomes ${letter(25 - code(c))}`).join(", ")}.`, `${w2} is written ${right}.`]);
}

/* ------------------------------------------------------------------ verbal: odd one out */

export const WORD_GROUPS: Record<string, string[]> = {
  mammals: ["dog", "cat", "horse", "cow", "sheep", "rabbit", "fox", "deer", "mouse", "whale", "goat", "pig"],
  birds: ["robin", "eagle", "owl", "sparrow", "swan", "parrot", "crow", "duck", "hen", "goose"],
  fish: ["salmon", "trout", "cod", "haddock", "tuna", "carp", "eel"],
  insects: ["ant", "bee", "wasp", "beetle", "fly", "moth", "ladybird"],
  fruit: ["apple", "pear", "plum", "grape", "peach", "melon", "cherry", "lemon", "banana"],
  vegetables: ["carrot", "leek", "pea", "onion", "cabbage", "turnip", "celery", "parsnip", "sprout"],
  colours: ["red", "blue", "green", "pink", "grey", "brown", "yellow", "purple"],
  clothes: ["coat", "hat", "scarf", "glove", "shirt", "sock", "skirt", "jumper"],
  tools: ["hammer", "saw", "drill", "spanner", "chisel", "pliers"],
  furniture: ["chair", "table", "sofa", "desk", "shelf", "stool", "bed"],
  vehicles: ["bus", "train", "tram", "lorry", "taxi", "van", "car"],
  body: ["arm", "leg", "knee", "elbow", "wrist", "ankle", "hand", "foot"],
  instruments: ["drum", "flute", "harp", "piano", "violin", "oboe"],
  weather: ["rain", "snow", "wind", "fog", "hail", "frost"],
  sports: ["rugby", "tennis", "golf", "hockey", "squash", "boxing"],
  countries: ["france", "spain", "italy", "japan", "chile", "kenya"],
  buildings: ["school", "church", "castle", "library", "shop", "hospital"],
};
export const NEAR_GROUPS: [string, string][] = [
  ["mammals", "birds"], ["birds", "insects"], ["fruit", "vegetables"], ["mammals", "fish"], ["tools", "furniture"], ["body", "clothes"], ["instruments", "sports"], ["vehicles", "buildings"],
];

function oddWord(r: R, level: number): Question {
  const names = Object.keys(WORD_GROUPS);
  let main: string, other: string;
  if (level === 1) { main = pick(r, names); do other = pick(r, names); while (other === main || NEAR_GROUPS.some(([a, b]) => (a === main && b === other) || (a === other && b === main))); }
  else { [main, other] = pick(r, NEAR_GROUPS); if (r() < 0.5) [main, other] = [other, main]; }
  const four = shuffle(r, WORD_GROUPS[main]).slice(0, 4);
  const odd = pick(r, WORD_GROUPS[other]);
  const b = choose(r, text(odd), four.map((w) => text(w)));
  const nice = (g: string) => g === "mammals" ? "mammals" : g;
  return build("vr-odd-word", level, "Which word is the odd one out?", b,
    "Think about what four of the words have in common.",
    [`${four.join(", ")} are all ${nice(main)}.`, `${odd} is ${nice(other)}, so it does not belong.`]);
}

/* ------------------------------------------------------------------ verbal: analogies */

type Analogy = { a: string; b: string; c: string; answer: string; others: string[]; level: 1 | 2 | 3 };
export const ANALOGIES: Analogy[] = [
  { a: "cat", b: "kitten", c: "dog", answer: "puppy", others: ["bark", "bone", "tail", "lead"], level: 1 },
  { a: "bird", b: "nest", c: "bee", answer: "hive", others: ["honey", "wing", "flower", "sting"], level: 1 },
  { a: "teacher", b: "school", c: "doctor", answer: "hospital", others: ["nurse", "medicine", "patient", "stethoscope"], level: 1 },
  { a: "eye", b: "see", c: "ear", answer: "hear", others: ["sound", "head", "music", "noise"], level: 1 },
  { a: "hot", b: "cold", c: "day", answer: "night", others: ["sun", "light", "evening", "moon"], level: 1 },
  { a: "pen", b: "write", c: "knife", answer: "cut", others: ["fork", "sharp", "handle", "kitchen"], level: 1 },
  { a: "fish", b: "swim", c: "bird", answer: "fly", others: ["nest", "feather", "egg", "wing"], level: 1 },
  { a: "baker", b: "bread", c: "butcher", answer: "meat", others: ["knife", "shop", "cow", "chop"], level: 1 },
  { a: "leaf", b: "tree", c: "petal", answer: "flower", others: ["stem", "bud", "garden", "scent"], level: 2 },
  { a: "second", b: "minute", c: "minute", answer: "hour", others: ["day", "clock", "watch", "tick"], level: 2 },
  { a: "north", b: "south", c: "east", answer: "west", others: ["compass", "direction", "left", "map"], level: 2 },
  { a: "glove", b: "hand", c: "sock", answer: "foot", others: ["leg", "shoe", "wool", "toe"], level: 2 },
  { a: "cub", b: "bear", c: "lamb", answer: "sheep", others: ["wool", "farm", "goat", "field"], level: 2 },
  { a: "thermometer", b: "temperature", c: "ruler", answer: "length", others: ["wood", "straight", "draw", "metal"], level: 2 },
  { a: "library", b: "books", c: "gallery", answer: "paintings", others: ["artist", "frame", "museum", "visitors"], level: 2 },
  { a: "seed", b: "plant", c: "egg", answer: "chicken", others: ["shell", "nest", "farm", "yolk"], level: 2 },
  { a: "brave", b: "coward", c: "generous", answer: "selfish", others: ["kind", "rich", "happy", "giving"], level: 3 },
  { a: "increase", b: "decrease", c: "expand", answer: "contract", others: ["grow", "stretch", "bigger", "widen"], level: 3 },
  { a: "hungry", b: "eat", c: "tired", answer: "sleep", others: ["bed", "night", "pillow", "dream"], level: 3 },
  { a: "drought", b: "water", c: "famine", answer: "food", others: ["hunger", "crops", "farm", "rain"], level: 3 },
  { a: "map", b: "navigate", c: "recipe", answer: "cook", others: ["kitchen", "food", "chef", "oven"], level: 3 },
  { a: "clock", b: "time", c: "scale", answer: "weight", others: ["balance", "kitchen", "numbers", "heavy"], level: 3 },
];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function wordAnalogy(r: R, level: number): Question {
  const pool = ANALOGIES.filter((a) => a.level === level);
  const an = pick(r, pool);
  const b = choose(r, text(an.answer), an.others.map((o) => text(o)));
  return build("vr-analogy", level, `${cap(an.a)} is to ${an.b} as ${an.c} is to ...?`, b,
    `Work out how "${an.a}" and "${an.b}" are linked. Then find the word that links to "${an.c}" in the same way.`,
    [`The link: ${an.a} goes with ${an.b}.`, `Use the same link for ${an.c}.`, `${cap(an.c)} goes with ${an.answer}.`]);
}

/* ------------------------------------------------------------------ verbal: number series */

/** Every simple rule that fits these numbers, and the number each would give next. Used by the generator and the tests. */
export function numberSeriesNext(n: number[]): number[] {
  const out: number[] = [];
  const L = n.length;
  const d = n.slice(1).map((x, i) => x - n[i]);
  if (d.every((x) => x === d[0])) out.push(n[L - 1] + d[0]);
  if (n.every((x) => x !== 0) && n.slice(1).every((x, i) => x * n[0] === n[i + 1] * n[0] && x === n[i] * (n[1] / n[0]))) out.push(n[L - 1] * (n[1] / n[0]));
  if (L >= 4 && d.every((x, i) => x === d[i % 2])) out.push(n[L - 1] + d[(L - 1) % 2]);
  const dd = d.slice(1).map((x, i) => x - d[i]);
  if (L >= 4 && dd.every((x) => x === dd[0])) out.push(n[L - 1] + d[d.length - 1] + dd[0]);
  if (L >= 4 && n.slice(2).every((x, i) => x === n[i] + n[i + 1])) out.push(n[L - 1] + n[L - 2]);
  if (L >= 3) {
    // x -> k x + c
    const k = (n[2] - n[1]) / (n[1] - n[0]);
    if (Number.isInteger(k) && n[1] !== n[0]) {
      const c = n[1] - k * n[0];
      if (n.slice(1).every((x, i) => x === k * n[i] + c)) out.push(k * n[L - 1] + c);
    }
  }
  const roots = n.map(Math.sqrt);
  if (roots.every(Number.isInteger) && roots.slice(1).every((x, i) => x === roots[i] + 1)) out.push((roots[L - 1] + 1) ** 2);
  if (L >= 4 && n.every((x, i) => x === (i + 1) * (i + 2) / 2 + (n[0] - 1))) out.push((L + 1) * (L + 2) / 2 + (n[0] - 1));
  return [...new Set(out)];
}

function numberSeries(r: R, level: number): Question {
  for (let tries = 0; tries < 300; tries++) {
    let seq: number[]; let rule: string;
    if (level === 1) {
      const kind = int(r, 0, 3);
      if (kind === 0) { const d = int(r, 2, 9), s = int(r, 1, 30); seq = Array.from({ length: 6 }, (_, i) => s + d * i); rule = `Add ${d} each time.`; }
      else if (kind === 1) { const d = int(r, 2, 9), s = int(r, 40, 90); seq = Array.from({ length: 6 }, (_, i) => s - d * i); rule = `Subtract ${d} each time.`; }
      else if (kind === 2) { const s = int(r, 1, 5); seq = Array.from({ length: 6 }, (_, i) => s * 2 ** i); rule = "Double each time."; }
      else { const s = int(r, 1, 4); seq = Array.from({ length: 6 }, (_, i) => s * 3 ** i); rule = "Multiply by 3 each time."; }
    } else if (level === 2) {
      const kind = int(r, 0, 1);
      if (kind === 0) { const a = int(r, 2, 8), b = int(r, 1, 5), s = int(r, 1, 20); if (a === b) continue; seq = [s]; for (let i = 0; i < 6; i++) seq.push(seq[i] + (i % 2 === 0 ? a : -b)); rule = `The steps go +${a}, then -${b}, and repeat.`; }
      else { const s = int(r, 1, 12), step = int(r, 1, 3); seq = [s]; for (let i = 0; i < 5; i++) seq.push(seq[i] + step * (i + 1)); rule = `The gaps grow by ${step} each time: ${seq.slice(1).map((x, i) => x - seq[i]).join(", ")}.`; }
    } else {
      const kind = int(r, 0, 3);
      if (kind === 0) { const o = int(r, 1, 4); seq = Array.from({ length: 6 }, (_, i) => (i + o) ** 2); rule = "These are square numbers."; }
      else if (kind === 1) { const a = int(r, 1, 4), b = int(r, 1, 6); seq = [a, b]; for (let i = 0; i < 4; i++) seq.push(seq[i] + seq[i + 1]); rule = "Each number is the sum of the two before it."; }
      else if (kind === 2) { const s = int(r, 1, 6); seq = [s]; for (let i = 0; i < 5; i++) seq.push(seq[i] * 2 + 1); rule = "Double, then add 1, each time."; }
      else { const s = int(r, 1, 4); seq = [s]; for (let i = 0; i < 5; i++) seq.push(seq[i] * 3 - 1); rule = "Treble, then take away 1, each time."; }
    }
    const shown = seq.slice(0, -1), next = seq[seq.length - 1];
    const fits = numberSeriesNext(shown);
    if (fits.length !== 1 || fits[0] !== next || next > 2000) continue;
    const lastStep = shown[shown.length - 1] - shown[shown.length - 2];
    const wrongs: Wrong[] = [
      { opt: text(String(shown[shown.length - 1] + lastStep)), tag: "series-same-step", message: "That repeats the last step. Check whether the step stays the same." },
      ...[-2, -1, 1, 2, 10].map((d) => ({ opt: text(String(next + d)) })),
    ];
    const b = choose(r, text(String(next)), wrongs.filter((w) => (w.opt as { text: string }).text !== "NaN"));
    return build("vr-number-series", level, `What number comes next in this series? ${shown.join(", ")}, ?`, b,
      "Look at the differences between neighbouring numbers. If they change, look at how they change.",
      [`Look at the steps between the numbers: ${shown.slice(1).map((x, i) => (x - shown[i] >= 0 ? "+" : "") + (x - shown[i])).join(", ")}.`, rule, `So the next number is ${next}.`]);
  }
  return numberSeries(r, level);
}

/* ------------------------------------------------------------------ verbal: ordering clues */

const COMPARE = [
  { more: "taller", less: "shorter", top: "tallest", bottom: "shortest", second: "second tallest" },
  { more: "older", less: "younger", top: "oldest", bottom: "youngest", second: "second oldest" },
  { more: "heavier", less: "lighter", top: "heaviest", bottom: "lightest", second: "second heaviest" },
  { more: "faster", less: "slower", top: "fastest", bottom: "slowest", second: "second fastest" },
];

function ordering(r: R, level: number): Question {
  const n = level === 1 ? 3 : level === 2 ? 4 : 5;
  const people = shuffle(r, NAMES).slice(0, n);   // people[0] is the top, people[n-1] the bottom
  const cmp = pick(r, COMPARE);
  const clues: { hi: number; lo: number; text: string }[] = [];
  const say = (hi: number, lo: number, flip: boolean) => {
    const [x, y] = flip ? [lo, hi] : [hi, lo];
    return { hi, lo, text: `${people[x]} is ${flip ? cmp.less : cmp.more} than ${people[y]}.` };
  };
  for (let i = 0; i < n - 1; i++) clues.push(say(i, i + 1, level >= 2 && r() < 0.5));
  if (level === 3) { const a = int(r, 0, n - 3), b = int(r, a + 2, n - 1); clues.push(say(a, b, r() < 0.5)); } // a redundant clue
  const shuffled = shuffle(r, clues);
  // brute force: how many orders (top to bottom) agree with every clue?
  const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  const ok = perms(people.map((_, i) => i)).filter((p) => clues.every((c) => p.indexOf(c.hi) < p.indexOf(c.lo)));
  if (ok.length !== 1) return ordering(r, level);
  const askTop = level === 1 ? r() < 0.5 : level === 2 ? r() < 0.4 : false;
  const askRank = level === 1 || (level === 2 && askTop) ? (askTop ? 0 : n - 1) : level === 2 ? 1 : 2;
  const label = askRank === 0 ? cmp.top : askRank === n - 1 ? cmp.bottom : askRank === 1 ? cmp.second : "in the middle";
  const answerName = people[askRank];
  const b = choose(r, text(answerName), people.filter((p) => p !== answerName).map((p) => text(p)));
  const bigger = askRank === 0 || askRank === n - 1 ? `Who is the ${label}?` : `Who is ${label}?`;
  return build("vr-ordering", level, `${shuffled.map((c) => c.text).join(" ")} ${bigger}`, b,
    `Put the people in a line from ${cmp.top} to ${cmp.bottom}, one clue at a time.`,
    [`From ${cmp.top} to ${cmp.bottom}: ${people.join(", ")}.`, `The ${askRank === 0 ? cmp.top : askRank === n - 1 ? cmp.bottom : label === "in the middle" ? "one in the middle" : label} is ${answerName}.`]);
}

/* ------------------------------------------------------------------ non-verbal: shapes */

const mk = (shape: Mark["shape"], size: Mark["size"] = 2, rot = 0, fill: Mark["fill"] = "none", extra: Partial<Mark> = {}): Mark => ({ shape, size, rot, fill, ...extra });
const one = (m: Mark): Glyph => ({ marks: [m] });
const POLYGONS: Mark["shape"][] = ["triangle", "square", "pentagon", "hexagon", "diamond", "circle", "star", "cross"];
const ASYM: Mark["shape"][] = ["arrow", "ell", "half"];
const FILLS: Mark["fill"][] = ["none", "solid", "stripe", "light"];
/**
 * What you would actually see. A circle looks the same however it is turned, a square repeats every quarter turn, and most shapes
 * look the same when flipped, so two pictures that differ only in those ways are the same picture.
 */
const ROTATION_ORDER: Record<Mark["shape"], number> = {
  circle: 360, square: 4, triangle: 3, diamond: 2, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, star: 5, cross: 4, arrow: 1, ell: 1, half: 1,
};
const canonicalMark = (m: Mark) => {
  const period = m.shape === "circle" ? 360 : 360 / ROTATION_ORDER[m.shape];
  const rot = Math.round((((m.rot % period) + period) % period) * 100) / 100;
  return { shape: m.shape, size: m.size, fill: m.fill, rot: m.shape === "circle" ? 0 : rot === period ? 0 : rot, x: m.x ?? 0, y: m.y ?? 0, flip: m.shape === "ell" ? !!m.flip : false };
};
export const visualKey = (g: Glyph) => JSON.stringify("grid" in g ? g : { marks: g.marks.map(canonicalMark) });
const gkey = visualKey;
const turn = (g: Glyph, deg: number): Glyph => "grid" in g ? g : { marks: g.marks.map((m) => ({ ...m, rot: m.rot + deg })) };

/** What a shape "is", ignoring its size and how it is turned. Used for odd-one-out. */
export const signature = (g: Glyph) => ("grid" in g ? JSON.stringify(g.grid) : g.marks.map((m) => `${m.shape}:${m.fill}`).sort().join("|"));
/** The position of the one picture whose signature appears once, when all the others share the same signature. */
export function oddIndex(items: Glyph[]): number {
  const sigs = items.map(signature);
  const unique = sigs.filter((s) => sigs.filter((t) => t === s).length === 1);
  return unique.length === 1 && sigs.filter((s) => s !== unique[0]).every((s) => s === sigs.find((t) => t !== unique[0])) ? sigs.indexOf(unique[0]) : -1;
}

function oddShape(r: R, level: number): Question {
  const shape = pick(r, POLYGONS);
  const fill = pick(r, FILLS);
  let items: Glyph[], oddAt = int(r, 0, 4), what: string;
  if (level === 1) {
    let other = pick(r, POLYGONS); while (other === shape) other = pick(r, POLYGONS);
    items = Array.from({ length: 5 }, (_, i) => one(mk(i === oddAt ? other : shape, 2, 0, fill)));
    what = "shape";
  } else if (level === 2) {
    const changeFill = r() < 0.5;
    let otherFill = pick(r, FILLS); while (otherFill === fill) otherFill = pick(r, FILLS);
    let otherShape = pick(r, POLYGONS); while (otherShape === shape) otherShape = pick(r, POLYGONS);
    items = Array.from({ length: 5 }, (_, i) => {
      const size = pick(r, [1, 2, 3] as const), rot = pick(r, [0, 45, 90, 135, 180]);
      return one(mk(i === oddAt && !changeFill ? otherShape : shape, size, rot, i === oddAt && changeFill ? otherFill : fill));
    });
    what = changeFill ? "shading" : "shape";
  } else {
    // two shapes, one inside the other; the odd one differs in the inner or the outer shape
    const inner = pick(r, POLYGONS.filter((s) => s !== shape)), innerFill = pick(r, FILLS);
    const changeInner = r() < 0.5;
    let alt = pick(r, POLYGONS); while (alt === (changeInner ? inner : shape) || alt === (changeInner ? shape : inner)) alt = pick(r, POLYGONS);
    items = Array.from({ length: 5 }, (_, i) => {
      const rot = pick(r, [0, 45, 90, 180]);
      const out = i === oddAt && !changeInner ? alt : shape, inn = i === oddAt && changeInner ? alt : inner;
      return { marks: [mk(out, 3, rot, fill), mk(inn, 1, rot, innerFill === fill ? (fill === "solid" ? "none" : "solid") : innerFill)] };
    });
    what = changeInner ? "inside shape" : "outside shape";
  }
  if (oddIndex(items) !== oddAt) return oddShape(r, level);
  const options = items.map(glyph);
  const built = { answer: { kind: "choice" as const, options, correct: oddAt }, wrong: undefined, letter: LETTERS[oddAt], shown: LETTERS[oddAt] };
  return build("nvr-odd-one-out", level, "Which picture is the odd one out?", built,
    level === 1 ? "Look at the shape of each picture." : "Ignore size and how the shape is turned. Look for what four of them share.",
    [`Four pictures match: they have the same ${level === 3 ? "shapes" : "shape and shading"}.`, `Picture ${LETTERS[oddAt]} is different: its ${what} is not the same.`]);
}

/* ---- series ---- */

const SIDE_SHAPES: Mark["shape"][] = ["triangle", "square", "pentagon", "hexagon", "heptagon", "octagon"];
const CORNERS: [number, number][] = [[-26, -26], [26, -26], [26, 26], [-26, 26]];

/** Shape i of a "rotate and cycle" series. `cycle` holds the first few pictures, already turned for their own place. */
function rotateCycle(cycle: Glyph[], step: number, i: number): Glyph {
  const p = cycle.length, base = cycle[i % p];
  return turn(base, i * step - (i % p) * step);
}
const sidesAt = (shape0: number, fill: Mark["fill"], i: number): Glyph => one(mk(SIDE_SHAPES[shape0 + i], 2, 0, fill));
const countAt = (shape: Mark["shape"], fill: Mark["fill"], i: number): Glyph => {
  const n = i + 1;
  return { marks: Array.from({ length: n }, (_, k) => mk(shape, 1, 0, fill, { x: (k - (n - 1) / 2) * 17, y: 0 })) };
};
const dotAt = (clockwise: boolean, start: number, i: number): Glyph => {
  const c = CORNERS[((start + (clockwise ? i : -i)) % 4 + 4) % 4];
  return { marks: [mk("square", 3, 0, "none"), mk("circle", 1, 0, "solid", { x: c[0], y: c[1] })] };
};

const dotAndCentre = (clockwise: boolean, start: number, shape: Mark["shape"], i: number): Glyph => {
  const base = dotAt(clockwise, start, i) as { marks: Mark[] };
  return { marks: [...base.marks, mk(shape, 1, 0, i % 2 ? "solid" : "none", { x: 0, y: 0 })] };
};

/** Every simple rule that fits the pictures shown, and the picture each would put next. Used by the generator and the tests. */
export function fittingNext(items: Glyph[]): Glyph[] {
  const out = new Map<string, Glyph>();
  const n = items.length;
  const same = (a: Glyph, b: Glyph) => gkey(a) === gkey(b);
  for (const p of [1, 2, 3]) {
    if (n <= p) continue;
    for (const step of [0, 45, 90, 135, 180, -45, -90, -135]) {
      if (p === 1 && step === 0) continue;
      if (items.every((g, i) => same(g, rotateCycle(items.slice(0, p), step, i)))) { const g = rotateCycle(items.slice(0, p), step, n); out.set(gkey(g), g); }
    }
  }
  for (const s0 of [0, 1, 2]) for (const fill of FILLS) {
    if (s0 + n < SIDE_SHAPES.length && items.every((g, i) => same(g, sidesAt(s0, fill, i)))) { const g = sidesAt(s0, fill, n); out.set(gkey(g), g); }
  }
  for (const shape of POLYGONS) for (const fill of FILLS) {
    if (n < 5 && items.every((g, i) => same(g, countAt(shape, fill, i)))) { const g = countAt(shape, fill, n); out.set(gkey(g), g); }
  }
  for (const cw of [true, false]) for (let s = 0; s < 4; s++) {
    if (items.every((g, i) => same(g, dotAt(cw, s, i)))) { const g = dotAt(cw, s, n); out.set(gkey(g), g); }
    for (const sh of POLYGONS) if (items.every((g, i) => same(g, dotAndCentre(cw, s, sh, i)))) { const g = dotAndCentre(cw, s, sh, n); out.set(gkey(g), g); }
  }
  return [...out.values()];
}

function mutate(r: R, g: Glyph, step: number): Glyph[] {
  if ("grid" in g) return [];
  const m = g.marks;
  const variants: Glyph[] = [];
  const first = m[0];
  variants.push(turn(g, step || 90), turn(g, -(step || 90)), turn(g, 180));
  variants.push({ marks: [{ ...first, size: (first.size === 3 ? 2 : first.size + 1) as Mark["size"] }, ...m.slice(1)] });
  variants.push({ marks: [{ ...first, fill: first.fill === "solid" ? "none" : "solid" }, ...m.slice(1)] });
  variants.push({ marks: [{ ...first, fill: first.fill === "stripe" ? "light" : "stripe" }, ...m.slice(1)] });
  variants.push({ marks: [{ ...first, flip: !first.flip }, ...m.slice(1)] });
  return shuffle(r, variants);
}

function shapeSeries(r: R, level: number): Question {
  for (let tries = 0; tries < 200; tries++) {
    let shown: Glyph[], answer: Glyph, rule: string, step = 0;
    const kind = level === 1 ? pick(r, ["rotate", "fill", "sides", "count"]) : level === 2 ? pick(r, ["size", "dot", "fill", "rotate-asym"]) : pick(r, ["rotate-fill", "rotate-size", "dot-rotate"]);
    if (kind === "rotate" || kind === "rotate-asym") {
      step = pick(r, [45, 90, 135, -90, -45]);
      const sh = pick(r, ASYM), fill = pick(r, FILLS), cycle = [one(mk(sh, 2, 0, fill))];
      shown = Array.from({ length: 4 }, (_, i) => rotateCycle(cycle, step, i)); answer = rotateCycle(cycle, step, 4);
      rule = `The shape turns ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} each time.`;
    } else if (kind === "fill") {
      const sh = pick(r, POLYGONS), order = shuffle(r, FILLS).slice(0, 3);
      const cycle = order.map((f) => one(mk(sh, 2, 0, f)));
      shown = Array.from({ length: 4 }, (_, i) => cycle[i % 3]); answer = cycle[4 % 3];
      rule = `The shading repeats every three pictures: ${order.join(", ")}.`;
    } else if (kind === "size") {
      const sh = pick(r, POLYGONS), fill = pick(r, FILLS), sizes = pick(r, [[1, 2, 3], [3, 2, 1], [1, 3, 2]]) as Mark["size"][];
      const cycle = sizes.map((z) => one(mk(sh, z, 0, fill)));
      shown = Array.from({ length: 4 }, (_, i) => cycle[i % 3]); answer = cycle[4 % 3];
      rule = "The size repeats every three pictures: small, medium, large in the same order each time.";
    } else if (kind === "sides") {
      const s0 = int(r, 0, 1), fill = pick(r, FILLS);
      shown = Array.from({ length: 4 }, (_, i) => sidesAt(s0, fill, i)); answer = sidesAt(s0, fill, 4);
      rule = "The shape gains one side each time.";
    } else if (kind === "count") {
      const sh = pick(r, POLYGONS), fill = pick(r, FILLS);
      shown = Array.from({ length: 4 }, (_, i) => countAt(sh, fill, i)); answer = countAt(sh, fill, 4);
      rule = "One more shape is added each time.";
    } else if (kind === "dot") {
      const cw = r() < 0.5, s = int(r, 0, 3);
      shown = Array.from({ length: 4 }, (_, i) => dotAt(cw, s, i)); answer = dotAt(cw, s, 4);
      rule = `The dot moves to the next corner ${cw ? "clockwise" : "anticlockwise"} each time.`;
    } else if (kind === "rotate-fill") {
      step = pick(r, [45, 90, -90]);
      const sh = pick(r, ASYM), cycle = [one(mk(sh, 2, 0, "none")), one(mk(sh, 2, step, "solid"))];
      shown = Array.from({ length: 4 }, (_, i) => rotateCycle(cycle, step, i)); answer = rotateCycle(cycle, step, 4);
      rule = `The shape turns ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} each time, and the shading swaps between empty and solid.`;
    } else if (kind === "rotate-size") {
      step = pick(r, [45, 90, -90]);
      const sh = pick(r, ASYM), cycle = [one(mk(sh, 1, 0, "solid")), one(mk(sh, 3, step, "solid"))];
      shown = Array.from({ length: 4 }, (_, i) => rotateCycle(cycle, step, i)); answer = rotateCycle(cycle, step, 4);
      rule = `The shape turns ${Math.abs(step)}° ${step > 0 ? "clockwise" : "anticlockwise"} each time, and the size swaps between small and large.`;
    } else {
      // dot-rotate: a dot moves round the corners while the whole picture does not turn; a second small shape alternates fill
      const cw = r() < 0.5, s = int(r, 0, 3), sh = pick(r, POLYGONS);
      shown = Array.from({ length: 4 }, (_, i) => dotAndCentre(cw, s, sh, i)); answer = dotAndCentre(cw, s, sh, 4);
      rule = "The dot moves round the corners, and the small shape in the middle swaps between empty and solid.";
    }
    const fits = fittingNext(shown);
    if (fits.length === 0 || fits.some((g) => gkey(g) !== gkey(answer))) continue;
    const pool = [...mutate(r, answer, step), shown[shown.length - 1], shown[0]].filter((g) => gkey(g) !== gkey(answer));
    const b = choose(r, glyph(answer), pool.map(glyph));
    if (b.answer.options.length < 4) continue;
    return build("nvr-series", level, "Which picture comes next in the series?", b,
      "Look at how the first picture changes into the second, then the second into the third.",
      [rule, "Follow the same change one more time to get the fifth picture."], { type: "glyphs", layout: "series", items: [...shown, null] });
  }
  return shapeSeries(r, level);
}

/* ---- analogy: A is to B as C is to ? ---- */

type Transform = { id: string; words: string; ok: (g: Glyph) => boolean; apply: (g: Glyph) => Glyph };
const mapMarks = (g: Glyph, f: (m: Mark) => Mark): Glyph => ("grid" in g ? g : { marks: g.marks.map(f) });
const TRANSFORMS: Transform[] = [
  { id: "turn90", words: "turned a quarter turn clockwise", ok: () => true, apply: (g) => turn(g, 90) },
  { id: "turn180", words: "turned upside down", ok: () => true, apply: (g) => turn(g, 180) },
  { id: "flip", words: "flipped left to right", ok: () => true, apply: (g) => mapMarks(g, (m) => ({ ...m, flip: !m.flip })) },
  { id: "solid", words: "made solid", ok: (g) => !("grid" in g) && g.marks[0].fill !== "solid", apply: (g) => mapMarks(g, (m) => ({ ...m, fill: "solid" })) },
  { id: "empty", words: "made empty", ok: (g) => !("grid" in g) && g.marks[0].fill !== "none", apply: (g) => mapMarks(g, (m) => ({ ...m, fill: "none" })) },
  { id: "grow", words: "made bigger", ok: (g) => !("grid" in g) && g.marks[0].size < 3, apply: (g) => mapMarks(g, (m) => ({ ...m, size: Math.min(3, m.size + 1) as Mark["size"] })) },
  { id: "shrink", words: "made smaller", ok: (g) => !("grid" in g) && g.marks[0].size > 1, apply: (g) => mapMarks(g, (m) => ({ ...m, size: Math.max(1, m.size - 1) as Mark["size"] })) },
];
/** Every transformation that turns `a` into `b`. */
export const transformsBetween = (a: Glyph, b: Glyph) => TRANSFORMS.filter((t) => t.ok(a) && gkey(t.apply(a)) === gkey(b));
export const applyTransform = (id: string, g: Glyph) => TRANSFORMS.find((t) => t.id === id)!.apply(g);

function shapeAnalogy(r: R, level: number): Question {
  for (let tries = 0; tries < 300; tries++) {
    const t = pick(r, level === 1 ? TRANSFORMS.filter((x) => ["solid", "empty", "grow", "shrink"].includes(x.id)) : TRANSFORMS);
    const pool = ["turn90", "turn180", "flip"].includes(t.id) ? ASYM : POLYGONS;
    const shapeA = pick(r, pool), shapeC = pick(r, pool.filter((s) => s !== shapeA));
    // only shapes that look different when turned start at an angle; a tilted star would be an extra thing to track
    const startAngle = (sh: Mark["shape"]) => (ASYM.includes(sh) ? pick(r, [0, 90]) : 0);
    const a = one(mk(shapeA, pick(r, [1, 2, 3] as const), startAngle(shapeA), pick(r, FILLS)));
    const c = one(mk(shapeC, pick(r, [1, 2, 3] as const), startAngle(shapeC), pick(r, FILLS)));
    if (!t.ok(a) || !t.ok(c)) continue;
    const bGlyph = t.apply(a), answer = t.apply(c);
    const fits = transformsBetween(a, bGlyph);
    if (fits.length !== 1 || gkey(bGlyph) === gkey(a) || gkey(answer) === gkey(c)) continue;
    const others = TRANSFORMS.filter((x) => x.id !== t.id && x.ok(c)).map((x) => x.apply(c));
    const pool2 = [...others, c, ...mutate(r, answer, 90)].filter((g) => gkey(g) !== gkey(answer));
    const b = choose(r, glyph(answer), pool2.map(glyph));
    if (b.answer.options.length < 4) continue;
    return build("nvr-analogy", level, "The first picture changes into the second. Which picture goes in the gap so the second pair changes in the same way?", b,
      "Describe exactly what happens to the first picture. Do the same to the third picture.",
      [`The first picture is ${t.words}.`, "Do the same to the third picture.", "That gives the missing picture."],
      { type: "glyphs", layout: "analogy", items: [a, bGlyph, c, null] });
  }
  return shapeAnalogy(r, level);
}

/* ---- grids: reflection and rotation ---- */

type Grid = number[][];
export const reflectGrid = (g: Grid): Grid => g.map((row) => [...row].reverse());          // mirror line on the right
export const flipGridUpDown = (g: Grid): Grid => [...g].reverse().map((row) => [...row]);
export const rotateGridCW = (g: Grid): Grid => g[0].map((_, c) => g.map((row) => row[c]).reverse());
export const rotateGridCCW = (g: Grid): Grid => g[0].map((_, c) => g.map((row) => row[g[0].length - 1 - c]));
export const rotateGrid180 = (g: Grid): Grid => g.map((row) => [...row].reverse()).reverse();
const gridKey = (g: Grid) => g.map((row) => row.join("")).join("/");

function randomGrid(r: R, size: number): Grid {
  const cells = size * size, target = int(r, Math.ceil(cells * 0.3), Math.ceil(cells * 0.55));
  const flat = shuffle(r, Array.from({ length: cells }, (_, i) => (i < target ? 1 : 0)));
  return Array.from({ length: size }, (_, row) => flat.slice(row * size, row * size + size));
}

function gridPuzzle(skill: "nvr-reflection" | "nvr-rotation", r: R, level: number): Question {
  const size = level === 1 ? 3 : 4;
  for (let tries = 0; tries < 300; tries++) {
    const g = randomGrid(r, size);
    const refl = reflectGrid(g), cw = rotateGridCW(g), ccw = rotateGridCCW(g), half = rotateGrid180(g), ud = flipGridUpDown(g);
    const right = skill === "nvr-reflection" ? refl : cw;
    const wrongs: Grid[] = skill === "nvr-reflection" ? [g, ud, half, ccw, cw] : [ccw, half, refl, ud, g];
    const changed = right.map((row) => [...row]); const cr = int(r, 0, size - 1), cc = int(r, 0, size - 1); changed[cr][cc] = changed[cr][cc] ? 0 : 1;
    wrongs.push(changed);
    const keys = new Set([gridKey(right)]);
    const usable = wrongs.filter((w) => !keys.has(gridKey(w)) && (keys.add(gridKey(w)), true));
    if (usable.length < 4) continue;
    const messages: Record<string, { tag: string; message: string }> = skill === "nvr-reflection"
      ? { [gridKey(g)]: { tag: "reflect-unchanged", message: "That is the original picture. A mirror image swaps left and right." }, [gridKey(ud)]: { tag: "reflect-wrong-line", message: "That is the picture flipped upside down. This mirror line goes straight up and down, so left and right swap." } }
      : { [gridKey(ccw)]: { tag: "turn-wrong-way", message: "That turns the picture anticlockwise. Check which way is clockwise." }, [gridKey(half)]: { tag: "turn-too-far", message: "That is a half turn. A quarter turn is a quarter of a full turn." } };
    const b = choose(r, glyph({ grid: right }), usable.map((w) => ({ opt: glyph({ grid: w }), ...messages[gridKey(w)] })));
    if (skill === "nvr-reflection") {
      return build(skill, level, "The picture on the left is reflected in the mirror line. Which picture shows the reflection?", b,
        "Imagine the mirror is a straight line. Each square on the left ends up the same distance on the other side.",
        ["The square closest to the mirror stays closest to the mirror.", "So each row is written backwards.", "Check each row of the answer against the original."],
        { type: "glyphs", layout: "mirror", items: [{ grid: g }] });
    }
    return build(skill, level, "Which picture shows this pattern after a quarter turn clockwise?", b,
      "Turn the page a quarter turn clockwise, or follow the top row to see where it ends up.",
      ["A clockwise quarter turn moves the top row to the right-hand column.", "The left-hand column becomes the top row.", "Check each square of the answer."],
      { type: "glyphs", layout: "single", items: [{ grid: g }] });
  }
  return gridPuzzle(skill, r, level);
}

/* ------------------------------------------------------------------ problem solving */

type Claim = { text: string; vars: 1 | 2; domain: (a: number, b: number) => boolean; claim: (a: number, b: number) => boolean };
const odd = (n: number) => n % 2 === 1, even = (n: number) => n % 2 === 0;
const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d);
export const CLAIMS: Claim[] = [
  { text: "The sum of two odd numbers is even.", vars: 2, domain: (a, b) => odd(a) && odd(b), claim: (a, b) => even(a + b) },
  { text: "The sum of two odd numbers is odd.", vars: 2, domain: (a, b) => odd(a) && odd(b), claim: (a, b) => odd(a + b) },
  { text: "The sum of two even numbers is even.", vars: 2, domain: (a, b) => even(a) && even(b), claim: (a, b) => even(a + b) },
  { text: "An odd number plus an even number is odd.", vars: 2, domain: (a, b) => odd(a) && even(b), claim: (a, b) => odd(a + b) },
  { text: "An even number multiplied by any whole number is even.", vars: 2, domain: (a) => even(a), claim: (a, b) => even(a * b) },
  { text: "The product of two odd numbers is even.", vars: 2, domain: (a, b) => odd(a) && odd(b), claim: (a, b) => even(a * b) },
  { text: "The product of two odd numbers is odd.", vars: 2, domain: (a, b) => odd(a) && odd(b), claim: (a, b) => odd(a * b) },
  { text: "Any multiple of 6 is also a multiple of 3.", vars: 1, domain: (a) => a % 6 === 0, claim: (a) => a % 3 === 0 },
  { text: "Any multiple of 3 is also a multiple of 6.", vars: 1, domain: (a) => a % 3 === 0, claim: (a) => a % 6 === 0 },
  { text: "Any multiple of 8 is also a multiple of 4.", vars: 1, domain: (a) => a % 8 === 0, claim: (a) => a % 4 === 0 },
  { text: "Any multiple of 4 is also a multiple of 8.", vars: 1, domain: (a) => a % 4 === 0, claim: (a) => a % 8 === 0 },
  { text: "A number that ends in 0 is a multiple of 5.", vars: 1, domain: (a) => a % 10 === 0, claim: (a) => a % 5 === 0 },
  { text: "A number that ends in 5 is a multiple of 10.", vars: 1, domain: (a) => a % 10 === 5, claim: (a) => a % 10 === 0 },
  { text: "The difference between two odd numbers is odd.", vars: 2, domain: (a, b) => odd(a) && odd(b), claim: (a, b) => odd(Math.abs(a - b)) },
  { text: "The sum of two consecutive whole numbers is odd.", vars: 1, domain: () => true, claim: (a) => odd(a + (a + 1)) },
  { text: "The sum of two consecutive whole numbers is even.", vars: 1, domain: () => true, claim: (a) => even(a + (a + 1)) },
  { text: "The sum of three consecutive whole numbers is a multiple of 3.", vars: 1, domain: () => true, claim: (a) => (a + (a + 1) + (a + 2)) % 3 === 0 },
  { text: "A square number is always even.", vars: 1, domain: () => true, claim: (a) => even(a * a) },
  { text: "Doubling an odd number always gives a multiple of 4.", vars: 1, domain: (a) => odd(a), claim: (a) => (2 * a) % 4 === 0 },
  { text: "All prime numbers are odd.", vars: 1, domain: (a) => isPrime(a), claim: (a) => odd(a) },
  { text: "The sum of two prime numbers is always even.", vars: 2, domain: (a, b) => isPrime(a) && isPrime(b), claim: (a, b) => even(a + b) },
  { text: "A number is even if its last digit is even.", vars: 1, domain: (a) => even(a % 10), claim: (a) => even(a) },
];
/** Test a claim against every pair of whole numbers from 1 to 60. Returns the first pair that breaks it, or null if none does. */
export function counterexample(c: Claim): [number, number] | null {
  for (let a = 1; a <= 60; a++) for (let b = 1; b <= (c.vars === 2 ? 60 : 1); b++) if (c.domain(a, b) && !c.claim(a, b)) return [a, b];
  return null;
}

function alwaysTrue(r: R, level: number): Question {
  const holds = CLAIMS.filter((c) => counterexample(c) === null);
  const fails = CLAIMS.filter((c) => counterexample(c) !== null);
  const right = pick(r, holds);
  const wrongs = shuffle(r, fails).slice(0, level === 1 ? 3 : 4);
  const b = choose(r, text(right.text), wrongs.map((w) => text(w.text)), wrongs.length + 1);
  const sol = [
    `Test each statement with real numbers. A statement is "always true" only if no example breaks it.`,
    ...wrongs.map((w) => { const [x, y] = counterexample(w)!; return `"${w.text.replace(/\.$/, "")}" breaks when ${w.vars === 2 ? `the numbers are ${x} and ${y}` : `the number is ${x}`}.`; }),
    `No example breaks: "${right.text.replace(/\.$/, "")}". That one is always true.`,
  ];
  return build("ps-always-true", level, "Which of these statements is always true?", b,
    "Try a few numbers in each statement. One counter-example is enough to show that a statement is not always true.", sol);
}

/* ---- find the mistake ---- */

type Step = { a: number; op: "+" | "×" | "÷" | "-"; b: number; c: number };
const lineText = (s: Step, tail = "") => `$${s.a} ${s.op === "×" ? "\\times" : s.op === "÷" ? "\\div" : s.op} ${s.b} = ${s.c}$${tail}`;
const lineOk = (s: Step) => (s.op === "+" ? s.a + s.b : s.op === "-" ? s.a - s.b : s.op === "×" ? s.a * s.b : s.a / s.b) === s.c;

function findError(r: R, level: number): Question {
  const name = pick(r, NAMES);
  const kind = int(r, 0, level === 1 ? 2 : 3);
  const hasMistake = level < 3 || r() < 0.65;
  let intro: string, steps: Step[], lines: string[] | undefined, methodLine = -1;
  if (kind === 0) {
    const tens = int(r, 2, 9) * 10, ones = int(r, 3, 9), m = int(r, 3, 9);
    steps = [{ a: tens, op: "×", b: m, c: tens * m }, { a: ones, op: "×", b: m, c: ones * m }, { a: tens * m, op: "+", b: ones * m, c: tens * m + ones * m }];
    intro = `${name} works out ${tens + ones} × ${m}.`;
  } else if (kind === 1) {
    const d = pick(r, [4, 5, 8]), q = int(r, 3, 9), num = int(r, 2, d - 1), N = d * q;
    steps = [{ a: N, op: "÷", b: d, c: q }, { a: q, op: "×", b: num, c: q * num }];
    intro = `${name} finds ${num}/${d} of ${N}.`;
  } else if (kind === 2) {
    const base = int(r, 2, 9) * 10, p = pick(r, [20, 30, 40]);
    steps = [{ a: base, op: "÷", b: 10, c: base / 10 }, { a: base / 10, op: "×", b: p / 10, c: (base / 10) * (p / 10) }];
    intro = `${name} finds ${p}% of ${base}. First they find 10%, then they multiply.`;
  } else {
    const a = int(r, 2, 9), b = int(r, 2, 6), c2 = int(r, 2, 6);
    steps = [{ a: b, op: "×", b: c2, c: b * c2 }, { a, op: "+", b: b * c2, c: a + b * c2 }];
    intro = `${name} works out ${a} + ${b} × ${c2}.`;
    if (hasMistake && r() < 0.7) {
      // the mistake is in method, not arithmetic: adding first
      steps = [{ a, op: "+", b, c: a + b }, { a: a + b, op: "×", b: c2, c: (a + b) * c2 }];
      methodLine = 0;
    }
  }
  let wrongLine = methodLine;
  if (hasMistake && methodLine < 0) {
    wrongLine = int(r, 0, steps.length - 1);
    const s = steps[wrongLine];
    const bad = s.c + pick(r, [-10, -1, 1, 2, 10].filter((d) => s.c + d > 0 && s.c + d !== s.c));
    steps = steps.map((x, i) => (i === wrongLine ? { ...x, c: bad } : x));
    // later lines carry the wrong value forward, so they stay correct given the line before
    for (let i = wrongLine + 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      steps[i] = { ...steps[i], a: steps[i].op === "×" && kind !== 0 ? prev.c : steps[i].a };
      if (kind === 0 && i === steps.length - 1) steps[i] = { a: steps[0].c, op: "+", b: steps[1].c, c: steps[0].c + steps[1].c };
      if (kind !== 0) steps[i] = { ...steps[i], c: steps[i].op === "×" ? steps[i].a * steps[i].b : steps[i].c };
    }
  }
  // independent check: exactly the intended lines are wrong (method mistakes are the exception, flagged by methodLine)
  const bad = steps.map(lineOk).map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0);
  if (methodLine < 0 && (hasMistake ? bad.length !== 1 || bad[0] !== wrongLine : bad.length !== 0)) return findError(r, level);
  lines = steps.map((s) => lineText(s));
  const optionsText = [...steps.map((_, i) => `Line ${i + 1}`), "There is no mistake"];
  const rightText = hasMistake ? `Line ${wrongLine + 1}` : "There is no mistake";
  const b = choose(r, text(rightText), optionsText.filter((o) => o !== rightText).map((o) => text(o)), optionsText.length);
  const sol = hasMistake
    ? methodLine >= 0 ? [`Line 1 adds first. Multiplication must be done before addition.`, `So line 1 is where it goes wrong.`] : [`Check each line by doing the calculation yourself.`, `Line ${wrongLine + 1} should say ${steps[wrongLine].a} ${steps[wrongLine].op === "×" ? "×" : steps[wrongLine].op} ${steps[wrongLine].b} = $${(() => { const s = steps[wrongLine]; return s.op === "+" ? s.a + s.b : s.op === "-" ? s.a - s.b : s.op === "×" ? s.a * s.b : s.a / s.b; })()}$.`]
    : ["Check each line by doing the calculation yourself.", "Every line is correct, so there is no mistake."];
  return build("ps-find-error", level, `${intro} Which line of their working has a mistake?`, b,
    "Check each line yourself. A line can be wrong because of the sum, or because of the method.", sol, { type: "working", lines });
}

/* ---- counting possibilities ---- */

function combinations(r: R, level: number): Question {
  const mk2 = (prompt: string, value: number, hint: string, solution: string[]): Question => ({
    skill: "ps-combinations", level, prompt, answer: { kind: "number", value }, hint, solution, shown: `$${value}$`,
  });
  if (level === 1) {
    const tops = int(r, 2, 5), bottoms = int(r, 2, 4);
    let count = 0; for (let t = 0; t < tops; t++) for (let b = 0; b < bottoms; b++) count++;
    const [item1, item2] = pick(r, [["T-shirts", "pairs of shorts"], ["bowls of ice cream flavours", "cones"], ["sandwich fillings", "types of bread"]]);
    const first = item1 === "bowls of ice cream flavours" ? "ice cream flavours" : item1;
    return mk2(`${NAMES[int(r, 0, 5)]} has ${tops} ${first} and ${bottoms} ${item2}. How many different pairs can be made by choosing one of each?`, count,
      "Pair the first choice with each of the second choices, then repeat for the next first choice.",
      [`Each of the ${tops} choices can go with ${bottoms} others.`, `${tops} × ${bottoms} = ${count}.`]);
  }
  if (level === 2) {
    const digits = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, pick(r, [3, 4]));
    let count = 0; for (const a of digits) for (const b of digits) if (a !== b) count++;
    return mk2(`How many different two-digit numbers can be made using the digits ${digits.join(", ")}? Each number uses two different digits.`, count,
      "Choose the tens digit first. Then count how many digits are left for the units.",
      [`There are ${digits.length} choices for the tens digit.`, `Then ${digits.length - 1} are left for the units digit.`, `${digits.length} × ${digits.length - 1} = ${count}.`]);
  }
  const kind = int(r, 0, 1);
  if (kind === 0) {
    const n = int(r, 4, 8);
    let count = 0; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) count++;
    return mk2(`${n} friends meet and each person shakes hands once with every other person. How many handshakes are there in total?`, count,
      "Don't count the same handshake twice. Person A and person B is the same handshake as B and A.",
      [`The 1st person shakes hands with ${n - 1} others, the next with ${n - 2} more, and so on.`, `${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(" + ")} = ${count}.`]);
  }
  const target = pick(r, [8, 9, 10, 11]);
  let count = 0; for (let t = 1; t <= 9; t++) for (let u = 0; u <= 9; u++) if (t + u === target) count++;
  return mk2(`How many two-digit numbers have digits that add up to ${target}? For example, ${target === 8 ? "17" : target === 9 ? "18" : target === 10 ? "19" : "29"} is one of them.`, count,
    "Work through the tens digits one at a time and see which units digit is needed.",
    [`Try each tens digit from 1 to 9 and work out the units digit: it must be ${target} take away the tens digit.`, `The units digit has to be 0 to 9, so some tens digits don't work.`, `Count the ones that do: ${count}.`]);
}

/* ---- logic puzzles ---- */

const THINGS: [string, string[], (x: string) => string][] = [
  ["pet", ["cat", "dog", "rabbit", "hamster", "fish"], (x) => `the ${x}`],
  ["fruit", ["apple", "banana", "pear", "plum", "grape"], (x) => `the ${x}`],
  ["colour", ["red", "blue", "green", "yellow", "purple"], (x) => `the ${x} coat`],
];

function deduction(r: R, level: number): Question {
  const n = level === 1 ? 3 : 4;
  const [kind, pool, noun] = pick(r, THINGS);
  const people = shuffle(r, NAMES).slice(0, n), items = shuffle(r, pool).slice(0, n);
  const secret = shuffle(r, items.map((_, i) => i));            // person i has items[secret[i]]
  const facts: { p: number; it: number; has: boolean; text: string }[] = [];
  for (let p = 0; p < n; p++) for (let it = 0; it < n; it++) {
    const has = secret[p] === it;
    facts.push({ p, it, has, text: has ? `${people[p]} has ${kind === "pet" ? "the " + items[it] : kind === "fruit" ? "the " + items[it] : "the " + items[it] + " coat"}.` : `${people[p]} does not have ${kind === "pet" ? "the " + items[it] : kind === "fruit" ? "the " + items[it] : "the " + items[it] + " coat"}.` });
  }
  const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((q) => [x, ...q])));
  const all = perms(items.map((_, i) => i));
  const solutions = (cl: typeof facts) => all.filter((perm) => cl.every((f) => (perm[f.p] === f.it) === f.has));
  const pickFrom = level === 3 ? facts.filter((f) => !f.has) : shuffle(r, facts);
  const clues: typeof facts = [];
  for (const f of shuffle(r, pickFrom)) {
    clues.push(f);
    if (solutions(clues).length === 1) break;
    if (clues.length > 9) break;
  }
  if (solutions(clues).length !== 1 || clues.length > (level === 1 ? 3 : 6)) return deduction(r, level);
  // drop clues that were not needed
  let trimmed = [...clues];
  for (const c of clues) { const without = trimmed.filter((x) => x !== c); if (without.length && solutions(without).length === 1) trimmed = without; }
  const target = int(r, 0, n - 1);
  const wanted = items[secret[target]];
  const ask = `Who has ${noun(wanted)}?`;
  const answerName = people[secret.indexOf(secret[target])];
  const b = choose(r, text(answerName), people.filter((p) => p !== answerName).map((p) => text(p)), n);
  const intro = `${people.slice(0, -1).join(", ")} and ${people[n - 1]} each have one ${kind === "pet" ? "pet" : kind === "fruit" ? "piece of fruit" : "coat"}: ${items.map((x) => (kind === "colour" ? x : x)).join(", ")}.`;
  return build("ps-deduction", level, `${intro} ${shuffle(r, trimmed).map((c) => c.text).join(" ")} ${ask}`, b,
    "Cross things off. Each person has exactly one, and nobody shares.",
    ["Use the clues one at a time. A clue that says who does not have something rules that out.", `When only one person is left for ${noun(wanted)}, that is the answer.`, `${answerName} has ${noun(wanted)}.`]);
}

/* ------------------------------------------------------------------ the skills */

const common = { stage: "KS2" as const, prereqs: [] as string[], strand: "Reasoning" as const };

export const reasoningSkills: Skill[] = [
  { ...common, id: "vr-odd-word", name: "Odd one out (words)", year: 4, blurb: "Find the word that does not belong with the others.",
    parentNote: "Verbal reasoning is not taught in most primary schools, so it helps to talk about groups: what do these words have in common?", talkAbout: "Say four things that are fruit and one that is not. How did you decide?", generate: oddWord },
  { ...common, id: "vr-ordering", name: "Who is first? (ordering clues)", year: 4, blurb: "Put people in order from clues like 'Ben is taller than Cara'.",
    parentNote: "Draw a line and put each name on it as you read the clues. Redo the line when a new clue arrives.", talkAbout: "Make up three clues about your family's heights. Can someone work out who is tallest?", generate: ordering },
  { ...common, id: "vr-letter-series", name: "Letter series", year: 5, blurb: "Spot the pattern in a row of letters and find the next one.",
    parentNote: "Write the alphabet with numbers underneath. Then letter patterns become number patterns.", talkAbout: "What comes next in A, C, E, G? How many places does each letter move?", generate: letterSeries },
  { ...common, id: "vr-alphabet-codes", name: "Alphabet codes", year: 5, blurb: "Work out a secret code and use it on a new word.",
    parentNote: "Compare one letter with its code to find the rule. Then check the rule on a second letter before using it.", talkAbout: "If A becomes C, what does B become? What would Z become?", generate: alphabetCodes },
  { ...common, id: "vr-number-series", name: "Number series", year: 5, blurb: "Find the rule in a row of numbers and carry it on.",
    parentNote: "Look at the gaps between the numbers. If the gaps are not the same, look at how the gaps change.", talkAbout: "What comes next in 2, 4, 8, 16? How do you know it is not 2, 4, 8, 14?", generate: numberSeries },
  { ...common, id: "vr-analogy", name: "Word links", year: 6, blurb: "Cat is to kitten as dog is to...? Find the link and use it again.",
    parentNote: "Say the link in a full sentence first: 'A kitten is a baby cat.' Then use the same sentence for the new word.", talkAbout: "Can you make up a word link of your own for someone else to solve?", generate: wordAnalogy },
  { ...common, id: "nvr-odd-one-out", name: "Odd one out (shapes)", year: 4, blurb: "Find the picture that is different from the rest.",
    parentNote: "Non-verbal reasoning checks whether children can spot patterns in shapes. Ask what is the same about four of them.", talkAbout: "Show me which pictures match. What is different about the odd one?", generate: oddShape },
  { ...common, id: "nvr-series", name: "Shape series", year: 5, blurb: "See how a shape changes and draw the next one.",
    parentNote: "Look at one thing at a time: turning, shading, size, number of shapes. Check each against all the pictures.", talkAbout: "What changes from the first picture to the second? Does it change the same way next?", generate: shapeSeries },
  { ...common, id: "nvr-reflection", name: "Mirror images", year: 5, blurb: "Find the reflection of a pattern in a mirror line.",
    parentNote: "Holding a small mirror next to the page makes this real. The square nearest the mirror stays nearest.", talkAbout: "If you hold a mirror here, what do you see? Which square is closest to the mirror?", generate: (r, l) => gridPuzzle("nvr-reflection", r, l) },
  { ...common, id: "nvr-rotation", name: "Quarter turns", year: 6, blurb: "Turn a pattern a quarter turn and find the new picture.",
    parentNote: "Turn the page itself. Mark the top left corner of the pattern so you can see where it ends up.", talkAbout: "Which way is clockwise? Where does the top row go after a quarter turn?", generate: (r, l) => gridPuzzle("nvr-rotation", r, l) },
  { ...common, id: "nvr-analogy", name: "Picture links", year: 6, blurb: "The first picture changes into the second. Do the same to the third.",
    parentNote: "Say what has happened in words ('it turned and got bigger'). Then do exactly that to the third picture.", talkAbout: "What happened to the first shape? Do you need to do more than one thing?", generate: shapeAnalogy },
  { ...common, id: "ps-always-true", name: "Always, sometimes, never", year: 5, blurb: "Decide whether a statement about numbers is always true.",
    parentNote: "One example that breaks a statement proves it is not always true. Hunting for that example is the skill.", talkAbout: "Can you find an example that proves 'all prime numbers are odd' is not always true?", generate: alwaysTrue },
  { ...common, id: "ps-find-error", name: "Spot the mistake", year: 5, blurb: "Look at someone's working and find the line that goes wrong.",
    parentNote: "Checking someone else's working builds the habit of checking your own. Redo each line before deciding.", talkAbout: "Which line would you check first, and why? Is the mistake in the sum or in the method?", generate: findError },
  { ...common, id: "ps-combinations", name: "Counting possibilities", year: 5, blurb: "Count all the different ways, without missing any or counting twice.",
    parentNote: "Listing in an order stops you missing any: start with the first choice and work through the second.", talkAbout: "How many different outfits could you make from 3 tops and 2 skirts? Can you list them?", generate: combinations },
  { ...common, id: "ps-deduction", name: "Logic puzzles", year: 6, blurb: "Use clues to work out who has what.",
    parentNote: "A small grid with ticks and crosses keeps track. Every cross can help fill in a tick elsewhere.", talkAbout: "Which clue helped most? What did it let you rule out?", generate: deduction },
];

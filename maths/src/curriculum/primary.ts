import { busStopWork, columnWork, gridWork } from "../engine/worked";
import type { Question, Skill } from "../engine/types";
import { lShapeFig, pointAnglesFig, quadAnglesFig, rectFig, straightLineAnglesFig, triangleAnglesFig, triangleBaseHeightFig } from "./figures";
import { gcd, int, lcm, nonZero, pick, round } from "../engine/rng";
import { dedupeWrong, frac, shuffle } from "./helpers";

/** Numbers for use inside $maths$: thin-space grouping from 5 digits up. */
const n$ = (n: number) => (Math.abs(n) >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\\,") : String(n));
const money = (n: number) => `£${n}`;
const NAMES = ["Maya", "Ben", "Aisha", "Tom", "Zara", "Leo", "Priya", "Sam", "Ella", "Omar"];
const dec = (x: number) => String(round(x, 4));
/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st, 22nd. */
export const ord = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;

type R = () => number;

/* ---------- Year 3 ---------- */

function placeValue(r: R, level: number): Question {
  const digits = (len: number) => {
    const pool = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, len);
    if (pool[0] === 0) pool.reverse();
    return pool;
  };
  if (level <= 2) {
    const len = level === 1 ? 4 : 6;
    const ds = digits(len);
    const n = Number(ds.join(""));
    if (level === 2 && r() < 0.5) {
      const k = int(r, 1, 4), up = r() < 0.5, step = 10 ** k;
      const ans = up ? n + step : n - step;
      return {
        skill: "place-value", level,
        prompt: `What is ${String(step).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${up ? "more" : "less"} than $${n$(n)}$?`,
        answer: { kind: "number", value: ans },
        hint: `Find the ${["", "tens", "hundreds", "thousands", "ten-thousands"][k]} digit and change it by 1.`,
        solution: [`${step.toLocaleString("en-GB")} is one in the ${["", "tens", "hundreds", "thousands", "ten-thousands"][k]} column.`, `$${n$(n)} ${up ? "+" : "-"} ${n$(step)} = ${n$(ans)}$.`],
        shown: `$${n$(ans)}$`,
      };
    }
    const pos = int(r, 0, len - 1);
    const d = ds[len - 1 - pos];
    if (d === 0) return placeValue(r, level);
    const value = d * 10 ** pos;
    return {
      skill: "place-value", level,
      prompt: `What is the value of the digit $${d}$ in $${n$(n)}$?`,
      answer: { kind: "number", value },
      hint: "Look at which column the digit is in: ones, tens, hundreds, thousands…",
      solution: [`The $${d}$ is in the ${["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands"][pos]} column.`, `So its value is $${n$(value)}$.`],
      shown: `$${n$(value)}$`,
    };
  }
  const a = int(r, 1, 9), b = int(r, 1, 9), c = int(r, 1, 9), d = int(r, 1, 9);
  if (r() < 0.5) {
    const total = a * 100000 + b * 1000 + c * 10 + d;
    return {
      skill: "place-value", level,
      prompt: `Write this as a number: $${a} \\times 100\\,000 + ${b} \\times 1000 + ${c} \\times 10 + ${d}$`,
      answer: { kind: "number", value: total },
      hint: "Put each digit in its column. A column with nothing in it needs a zero.",
      solution: [`$${a}$ hundred-thousands, $0$ ten-thousands, $${b}$ thousands, $0$ hundreds, $${c}$ tens, $${d}$ ones.`, `$${n$(total)}$.`],
      shown: `$${n$(total)}$`,
    };
  }
  const n = int(r, 12, 99) * 100;
  return {
    skill: "place-value", level,
    prompt: `How many tens are there in $${n$(n)}$?`,
    answer: { kind: "number", value: n / 10 },
    hint: "How many times does 10 go into the number?",
    solution: [`$${n$(n)} \\div 10 = ${n / 10}$.`],
    shown: `$${n / 10}$`,
  };
}

function addSub(r: R, level: number): Question {
  const add = r() < 0.5;
  const [lo, hi] = level === 1 ? [100, 899] : level === 2 ? [1000, 8999] : [10000, 89999];
  const digits = String(hi).length, bDigits = r() < 0.5 ? digits : int(r, 2, digits);   // half the time the second number has fewer digits
  let a = int(r, lo, hi), b = int(r, 10 ** (bDigits - 1), 10 ** bDigits - 1);
  if (!add && a < b) [a, b] = [b, a];
  if (!add && a === b) a += 1;
  const ans = add ? a + b : a - b;
  const work = columnWork(a, b, add ? "+" : "-");
  const est = (x: number) => { const unit = 10 ** (String(x).length - 1); return Math.round(x / unit) * unit; };   // round to the first digit
  return {
    skill: "add-sub", level,
    prompt: `Work out $${n$(a)} ${add ? "+" : "-"} ${n$(b)}$.`,
    answer: { kind: "number", value: ans },
    hint: `Line the digits up by place value and work from the right. ${add ? "Carry" : "Exchange"} when you need to.`,
    solution: [
      `Estimate first: $${n$(est(a))} ${add ? "+" : "-"} ${n$(est(b))} = ${n$(add ? est(a) + est(b) : est(a) - est(b))}$, so the answer should be close to that.`,
      ...work.steps,
      `So $${n$(a)} ${add ? "+" : "-"} ${n$(b)} = ${n$(ans)}$, which is close to the estimate.`,
    ],
    worked: work.figure,
    shown: `$${n$(ans)}$`,
  };
}

function timesTables(r: R, level: number): Question {
  const pool = level === 1 ? [2, 3, 4, 5, 10] : level === 2 ? [6, 7, 8, 9, 11] : [3, 4, 6, 7, 8, 9, 11, 12];
  const a = pick(r, pool), b = level === 3 ? int(r, 2, 12) : int(r, 2, 12);
  const p = a * b;
  const form = level === 1 ? 0 : level === 2 ? int(r, 0, 1) : int(r, 1, 3);
  if (form === 0) {
    const count = Array.from({ length: a }, (_, i) => (i + 1) * b).join(", ");
    return { skill: "times-tables", level, prompt: `Work out $${a} \\times ${b}$.`, answer: { kind: "number", value: p },
      hint: `Think of ${a} equal groups with ${b} in each. Count in ${b}s.`,
      solution: [`Think of $${a} \\times ${b}$ as ${a} groups with ${b} in each group.`, `Count in ${b}s once for each group: ${count}. So there are ${p} altogether.`], shown: `$${p}$` };
  }
  if (form === 1) return { skill: "times-tables", level, prompt: `Work out $${p} \\div ${a}$.`, answer: { kind: "number", value: b }, hint: `Think: ${a} times what makes ${p}?`, solution: [`$${a} \\times ${b} = ${p}$, so $${p} \\div ${a} = ${b}$.`], shown: `$${b}$` };
  if (form === 2) return { skill: "times-tables", level, prompt: `Find the missing number: $\\square \\times ${a} = ${p}$.`, answer: { kind: "number", value: b }, hint: `Divide ${p} by ${a}.`, solution: [`$${p} \\div ${a} = ${b}$.`], shown: `$${b}$` };
  return { skill: "times-tables", level, prompt: `Find the missing number: $${a} \\times \\square = ${p}$.`, answer: { kind: "number", value: b }, hint: `Divide ${p} by ${a}.`, solution: [`$${p} \\div ${a} = ${b}$.`], shown: `$${b}$` };
}

/* ---------- Year 4 ---------- */

function multWritten(r: R, level: number): Question {
  let a: number, b: number;
  if (level === 1) { a = int(r, 12, 49); b = int(r, 2, 9); }
  else if (level === 2) { a = int(r, 110, 499); b = int(r, 2, 9); }
  else if (level === 3) { a = int(r, 12, 49); b = int(r, 12, 39); }
  else if (level === 4) { a = int(r, 110, 799); b = int(r, 12, 49); }       // three digits by two digits, as in the Year 6 tests
  else { a = int(r, 1100, 7999); b = int(r, 12, 49); }                      // four digits by two digits
  const ans = a * b;
  const grid = gridWork(a, b);
  return {
    skill: "mult-written", level,
    prompt: `Work out $${a.toLocaleString("en-GB")} \\times ${b}$.`,
    answer: { kind: "number", value: ans },
    hint: "Split one number into tens and ones (or hundreds, tens and ones), multiply each part, then add.",
    solution: grid.steps, worked: grid.figure, shown: `$${n$(ans)}$`,
  };
}

function division(r: R, level: number): Question {
  if (level >= 4) {
    const b = int(r, 3, 9), q = int(r, Math.ceil(1000 / b), Math.floor(9999 / b) - 1), rem = level === 5 ? int(r, 1, b - 1) : 0;
    const n = b * q + rem, bus = busStopWork(n, b);
    return {
      skill: "division", level,
      prompt: rem ? `Work out $${n.toLocaleString("en-GB")} \\div ${b}$. Give the whole-number answer and the remainder.` : `Work out $${n.toLocaleString("en-GB")} \\div ${b}$.`,
      answer: rem ? { kind: "multi", fields: [{ label: "quotient =", value: q }, { label: "remainder =", value: rem }] } : { kind: "number", value: q },
      hint: `Work from the left, one digit at a time. How many ${b}s fit into each part, and what is carried to the next digit?`,
      solution: [...bus.steps, `Check: $${b} \\times ${q.toLocaleString("en-GB")}${rem ? ` + ${rem}` : ""} = ${n.toLocaleString("en-GB")}$.`],
      worked: bus.figure,
      shown: rem ? `$${q}$ remainder $${rem}$` : `$${q}$`,
    };
  }
  if (level === 2) {
    const b = int(r, 3, 9), q = int(r, 10, 40), rem = int(r, 1, b - 1);
    const n = b * q + rem;
    const bus = busStopWork(n, b);
    return {
      skill: "division", level,
      prompt: `Work out $${n} \\div ${b}$. Give the whole-number answer and the remainder.`,
      answer: { kind: "multi", fields: [{ label: "quotient =", value: q }, { label: "remainder =", value: rem }] },
      hint: `How many whole lots of ${b} fit into ${n}? What is left over?`,
      solution: [...bus.steps, `Check: $${b} \\times ${q} + ${rem} = ${b * q + rem}$.`],
      worked: bus.figure,
      shown: `$${q}$ remainder $${rem}$`,
    };
  }
  const [b, q] = level === 1 ? [int(r, 2, 9), int(r, 11, 30)] : [int(r, 12, 25), int(r, 12, 40)];
  const n = b * q;
  return {
    skill: "division", level,
    prompt: `Work out $${n$(n)} \\div ${b}$.`,
    answer: { kind: "number", value: q },
    hint: level === 1 ? "Use short division, or think about how many lots of the number fit." : `Take away groups of ${b}. Start by taking away 10 groups at a time.`,
    solution: level === 1
      ? [...busStopWork(n, b).steps, `Check: $${b} \\times ${q} = ${n}$.`]
      : [`Start with 10 groups: $${b} \\times 10 = ${b * 10}$. Keep taking away groups of ${b} until nothing is left. Count how many groups you took away.`, `$${n} \\div ${b} = ${q}$.`],
    ...(level === 1 ? { worked: busStopWork(n, b).figure } : {}),
    shown: `$${q}$`,
  };
}

function fracEquiv(r: R, level: number): Question {
  if (level === 1) {
    const d = pick(r, [2, 3, 4, 5, 6]), n = int(r, 1, d - 1), k = int(r, 2, 5);
    return {
      skill: "frac-equiv", level,
      prompt: `Find the missing number: $\\frac{${n}}{${d}} = \\frac{\\square}{${d * k}}$`,
      answer: { kind: "number", value: n * k },
      hint: `What was the bottom number multiplied by? Do the same to the top.`,
      solution: [`$${d} \\times ${k} = ${d * k}$, so multiply the top by ${k} too.`, `$${n} \\times ${k} = ${n * k}$.`],
      shown: `$${n * k}$`,
    };
  }
  if (level === 2) {
    let n: number, d: number;
    do { d = int(r, 4, 24); n = int(r, 1, d - 1); } while (gcd(n, d) === 1 || n % d === 0 || d / gcd(n, d) === 1);
    const g = gcd(n, d);
    return {
      skill: "frac-equiv", level,
      prompt: `Simplify $\\frac{${n}}{${d}}$ as far as you can.`,
      answer: { kind: "number", value: n / d, simplestFraction: true },
      hint: "Find the biggest number that goes into both the top and the bottom, and divide both by it.",
      solution: [`${g} goes into both ${n} and ${d}.`, `$\\frac{${n}}{${d}} = \\frac{${n / g}}{${d / g}}$.`],
      shown: `$${frac(n / g, d / g)}$`,
    };
  }
  const n = int(r, 1, 8), d = int(r, n + 1, 11), k = int(r, 3, 9);
  const missingTop = r() < 0.5;
  return {
    skill: "frac-equiv", level,
    prompt: missingTop
      ? `Find the missing number: $\\frac{${n}}{${d}} = \\frac{\\square}{${d * k}}$`
      : `Find the missing number: $\\frac{${n}}{\\square} = \\frac{${n * k}}{${d * k}}$`,
    answer: { kind: "number", value: missingTop ? n * k : d },
    hint: missingTop ? "Find what the bottom was multiplied by, then do the same to the top." : "The top went from one number to the other. Work out what it was multiplied by, then do the same to the bottom.",
    solution: missingTop
      ? [`$${d} \\times ${k} = ${d * k}$, so $${n} \\times ${k} = ${n * k}$.`]
      : [`$${n} \\times ${k} = ${n * k}$, so the missing number is $${d * k} \\div ${k} = ${d}$.`],
    shown: `$${missingTop ? n * k : d}$`,
  };
}

function rounding(r: R, level: number): Question {
  if (level === 1) {
    const to = pick(r, [10, 100]);
    const n = int(r, 101, 9899);
    const ans = Math.round(n / to) * to;
    return { skill: "rounding", level, prompt: `Round $${n$(n)}$ to the nearest $${to}$.`, answer: { kind: "number", value: ans },
      hint: `Look at the digit to the right of the ${to === 10 ? "tens" : "hundreds"} column. 5 or more rounds up.`,
      solution: [`The digit after the ${to === 10 ? "tens" : "hundreds"} column is ${Math.floor((n % to) / (to / 10))}, so round ${n % to >= to / 2 ? "up" : "down"}.`, `$${n$(ans)}$.`], shown: `$${n$(ans)}$` };
  }
  if (level === 2) {
    const to = pick(r, [1000, 10000]);
    const n = int(r, 11000, 989999);
    const ans = Math.round(n / to) * to;
    return { skill: "rounding", level, prompt: `Round $${n$(n)}$ to the nearest $${n$(to)}$.`, answer: { kind: "number", value: ans },
      hint: "Find the column you are rounding to, look at the digit to its right: 5 or more rounds up.",
      solution: [`${n % to >= to / 2 ? "Round up" : "Round down"}: $${n$(ans)}$.`], shown: `$${n$(ans)}$` };
  }
  const dp = pick(r, [1, 2]);
  const k = int(r, 1001, 99999); // thousandths as an integer, to avoid floating point ties
  const ans = dp === 1 ? Math.round(k / 100) / 10 : Math.round(k / 10) / 100;
  return { skill: "rounding", level, prompt: `Round $${dec(k / 1000)}$ to ${dp} decimal place${dp > 1 ? "s" : ""}.`, answer: { kind: "number", value: ans },
    hint: `Look at the digit after the ${dp === 1 ? "first" : "second"} decimal place. 5 or more rounds up.`,
    solution: [`The next digit decides: round ${(dp === 1 ? k % 100 : k % 10) >= (dp === 1 ? 50 : 5) ? "up" : "down"}.`, `$${dec(ans)}$.`], shown: `$${dec(ans)}$` };
}

/* ---------- Year 5 ---------- */

function decimals(r: R, level: number): Question {
  if (level === 1) {
    const a = int(r, 11, 99), b = int(r, 11, 99), add = r() < 0.6;
    const [x, y] = add || a >= b ? [a, b] : [b, a];
    const ans = add ? (x + y) / 10 : (x - y) / 10;
    return { skill: "decimals", level, prompt: `Work out $${dec(x / 10)} ${add ? "+" : "-"} ${dec(y / 10)}$.`, answer: { kind: "number", value: ans },
      hint: "Line up the decimal points so tenths are under tenths.", solution: [`Think of them as tenths: $${x} ${add ? "+" : "-"} ${y} = ${add ? x + y : x - y}$ tenths.`, `$${dec(ans)}$.`], shown: `$${dec(ans)}$` };
  }
  if (level === 2) {
    const x = int(r, 1001, 9999), y = int(r, 101, x - 100);
    const ans = (x - y) / 100;
    return { skill: "decimals", level, prompt: `Work out $${dec(x / 100)} - ${dec(y / 100)}$.`, answer: { kind: "number", value: ans },
      hint: "Write both with the same number of decimal places (add a zero if needed) and line the points up.", solution: [`In hundredths: $${x} - ${y} = ${x - y}$.`, `$${dec(ans)}$.`], shown: `$${dec(ans)}$` };
  }
  const form = int(r, 0, 2);
  if (form === 0) { const v = int(r, 11, 99) / 100, m = pick(r, [10, 100, 1000]); return { skill: "decimals", level, prompt: `Work out $${dec(v)} \\times ${m}$.`, answer: { kind: "number", value: round(v * m, 4) }, hint: "Each digit moves to a bigger column when you multiply by 10, 100 or 1000.", solution: [`Move every digit ${String(m).length - 1} place${m > 10 ? "s" : ""} to the left: $${dec(v * m)}$.`], shown: `$${dec(v * m)}$` }; }
  if (form === 1) { const a = int(r, 2, 9) / 10, b = int(r, 3, 9); return { skill: "decimals", level, prompt: `Work out $${dec(a)} \\times ${b}$.`, answer: { kind: "number", value: round(a * b, 4) }, hint: "Think of the decimal as tenths: multiply the whole numbers, then convert back.", solution: [`$${round(a * 10, 0)} \\times ${b} = ${round(a * 10 * b, 0)}$ tenths.`, `$${dec(a * b)}$.`], shown: `$${dec(a * b)}$` }; }
  const b = int(r, 2, 9), q = int(r, 11, 99) / 10;
  return { skill: "decimals", level, prompt: `Work out $${dec(round(q * b, 4))} \\div ${b}$.`, answer: { kind: "number", value: q }, hint: "Divide as normal and keep the decimal point in the same place.", solution: [`$${dec(q)} \\times ${b} = ${dec(round(q * b, 4))}$, so the answer is $${dec(q)}$.`], shown: `$${dec(q)}$` };
}

function fracAmount(r: R, level: number): Question {
  if (level === 1) {
    const d = pick(r, [2, 3, 4, 5, 10]), amt = d * int(r, 3, 12);
    return { skill: "frac-amount", level, prompt: `Work out $\\frac{1}{${d}}$ of $${amt}$.`, answer: { kind: "number", value: amt / d },
      hint: `The bottom number tells you to split ${amt} into ${d} equal groups.`,
      solution: [
        `${d === 2 ? "A half" : "The top number 1"} means take one of the ${d} equal groups.`,
        `Split $${amt}$ into ${d} equal groups: $${amt} \\div ${d} = ${amt / d}$ in each group.`,
      ], shown: `$${amt / d}$` };
  }
  const d = pick(r, [3, 4, 5, 6, 8, 10]), n = int(r, 2, d - 1), unit = int(r, 3, 12), amt = d * unit;
  if (level === 2)
    return { skill: "frac-amount", level, prompt: `Work out $\\frac{${n}}{${d}}$ of $${amt}$.`, answer: { kind: "number", value: n * unit },
      hint: `First find $\\frac{1}{${d}}$ by dividing by ${d}, then multiply by ${n}.`, solution: [`$\\frac{1}{${d}}$ of $${amt}$ is $${amt} \\div ${d} = ${unit}$.`, `$${n} \\times ${unit} = ${n * unit}$.`], shown: `$${n * unit}$`,
      wrong: dedupeWrong([{ tag: "unit-only", number: unit, message: `That's one ${d === 2 ? "half" : "part"} only. The fraction has $${n}$ parts, so multiply.` }], n * unit) };
  const thing = pick(r, ["sweets", "stickers", "marbles", "pencils"]);
  const colour = pick(r, ["red", "blue", "green"]);
  return { skill: "frac-amount", level, prompt: `A bag has ${amt} ${thing}. $\\frac{${n}}{${d}}$ of them are ${colour}. How many are not ${colour}?`,
    answer: { kind: "number", value: amt - n * unit },
    hint: `Find how many are ${colour} first, then take that away from the total.`,
    solution: [`$\\frac{1}{${d}}$ of $${amt}$ is $${unit}$, so ${colour} is $${n} \\times ${unit} = ${n * unit}$.`, `Not ${colour}: $${amt} - ${n * unit} = ${amt - n * unit}$.`], shown: `$${amt - n * unit}$`,
    wrong: dedupeWrong([{ tag: "answered-part", number: n * unit, message: `That's how many are ${colour}. The question asks for the ones that are not.` }], amt - n * unit) };
}

function measures(r: R, level: number): Question {
  const U = [
    { big: "m", small: "cm", k: 100 }, { big: "km", small: "m", k: 1000 },
    { big: "kg", small: "g", k: 1000 }, { big: "l", small: "ml", k: 1000 }, { big: "cm", small: "mm", k: 10 },
  ];
  const u = pick(r, U);
  if (level === 1) {
    const n = int(r, 2, 12);
    return { skill: "measures-convert", level, prompt: `Convert $${n}$ ${u.big} to ${u.small}.`, answer: { kind: "number", value: n * u.k, label: `${u.small} =` },
      hint: `There are ${u.k} ${u.small} in 1 ${u.big}. Is the answer bigger or smaller than ${n}?`, solution: [`1 ${u.big} = ${u.k} ${u.small}.`, `$${n} \\times ${u.k} = ${n * u.k}$ ${u.small}.`], shown: `$${n * u.k}$ ${u.small}` };
  }
  if (level === 2) {
    const up = r() < 0.5;
    const tenths = int(r, 11, 89) / 10;
    if (up) return { skill: "measures-convert", level, prompt: `Convert $${dec(tenths)}$ ${u.big} to ${u.small}.`, answer: { kind: "number", value: round(tenths * u.k, 4), label: `${u.small} =` },
      hint: `Multiply by ${u.k}, because there are ${u.k} ${u.small} in 1 ${u.big}.`, solution: [`$${dec(tenths)} \\times ${u.k} = ${dec(tenths * u.k)}$ ${u.small}.`], shown: `$${dec(tenths * u.k)}$ ${u.small}` };
    const small = int(r, 11, 98) * (u.k / 10 >= 1 ? u.k / 10 : 1);
    return { skill: "measures-convert", level, prompt: `Convert $${small}$ ${u.small} to ${u.big}.`, answer: { kind: "number", value: round(small / u.k, 4), label: `${u.big} =` },
      hint: `Divide by ${u.k}, because there are ${u.k} ${u.small} in 1 ${u.big}.`, solution: [`$${small} \\div ${u.k} = ${dec(small / u.k)}$ ${u.big}.`], shown: `$${dec(small / u.k)}$ ${u.big}` };
  }
  const tank = pick(r, [{ big: "l", small: "ml", thing: "bottle of juice" }, { big: "kg", small: "g", thing: "bag of flour" }]);
  const total = int(r, 11, 29) / 10, used = int(r, 1, 9) * 50;
  const left = round(total * 1000 - used, 4);
  return { skill: "measures-convert", level, prompt: `A ${tank.thing} holds $${dec(total)}$ ${tank.big}. $${used}$ ${tank.small} is used. How many ${tank.small} are left?`,
    answer: { kind: "number", value: left, label: `${tank.small} =` }, hint: `Convert everything to ${tank.small} first, then subtract.`,
    solution: [`$${dec(total)}$ ${tank.big} $= ${dec(total * 1000)}$ ${tank.small}.`, `$${dec(total * 1000)} - ${used} = ${dec(left)}$ ${tank.small}.`], shown: `$${dec(left)}$ ${tank.small}`,
    wrong: dedupeWrong([{ tag: "mixed-units", number: round(total - used, 4), message: `The units don't match. Change ${tank.big} to ${tank.small} before subtracting.` }], left) };
}

function perimeterArea(r: R, level: number): Question {
  if (level === 1) {
    const a = int(r, 3, 15), b = int(r, 3, 15), area = r() < 0.5;
    const ans = area ? a * b : 2 * (a + b);
    return { figure: rectFig(a, b), skill: "perimeter-area", level, prompt: `A rectangle is $${a}$ cm long and $${b}$ cm wide. What is its ${area ? "area in cm²" : "perimeter in cm"}?`, answer: { kind: "number", value: ans },
      hint: area ? "Area is length × width." : "Perimeter is the distance all the way around: add all four sides.",
      solution: area ? [`$${a} \\times ${b} = ${ans}$ cm².`] : [`Two lengths and two widths: $${a} + ${b} + ${a} + ${b} = ${ans}$ cm.`], shown: `$${ans}$`,
      wrong: dedupeWrong([{ tag: "area-perimeter", number: area ? 2 * (a + b) : a * b, message: area ? "That's the perimeter. Area is the space inside: length × width." : "That's the area. Perimeter is the distance around the edge." }], ans) };
  }
  if (level === 2) {
    const s = int(r, 4, 16), p = 2 * (s + int(r, 3, 12));
    const other = p / 2 - s;
    return { figure: rectFig(s, other, `${s} cm`, "?"), skill: "perimeter-area", level, prompt: `A rectangle has a perimeter of $${p}$ cm. One side is $${s}$ cm. How long is the other side?`, answer: { kind: "number", value: other },
      hint: "Half the perimeter is one length plus one width.", solution: [`Half of $${p}$ is $${p / 2}$, which is one length plus one width.`, `$${p / 2} - ${s} = ${other}$ cm.`], shown: `$${other}$ cm` };
  }
  if (r() < 0.5) {
    const base = 2 * int(r, 3, 10), h = int(r, 3, 12);
    return { figure: triangleBaseHeightFig(base, h), skill: "perimeter-area", level, prompt: `A triangle has a base of $${base}$ cm and a height of $${h}$ cm. What is its area in cm²?`, answer: { kind: "number", value: (base * h) / 2 },
      hint: "A triangle is half of a rectangle with the same base and height.", solution: [`Rectangle: $${base} \\times ${h} = ${base * h}$.`, `Half of that: $${(base * h) / 2}$ cm².`], shown: `$${(base * h) / 2}$` };
  }
  const w = int(r, 3, 9), l = int(r, w + 1, 15), cut = int(r, 1, w - 1);
  const ans = l * w - cut * cut;
  return { figure: lShapeFig(l, w, cut, cut), skill: "perimeter-area", level, prompt: `A rectangle is $${l}$ cm by $${w}$ cm. A square of side $${cut}$ cm is cut from one corner. What area is left, in cm²?`, answer: { kind: "number", value: ans },
    hint: "Find the area of the whole rectangle, then take away the area of the square that was cut out.", solution: [`Rectangle: $${l} \\times ${w} = ${l * w}$.`, `Square: $${cut} \\times ${cut} = ${cut * cut}$.`, `$${l * w} - ${cut * cut} = ${ans}$ cm².`], shown: `$${ans}$` };
}

function factorsMultiples(r: R, level: number): Question {
  if (level === 1) {
    const n = pick(r, [12, 16, 18, 20, 24, 28, 30, 36]);
    const fs = Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0);
    return { skill: "factors-multiples", level, prompt: `How many factors does $${n}$ have?`, answer: { kind: "number", value: fs.length },
      hint: "A factor divides exactly into the number. Find them in pairs: 1 and the number itself, then 2 and so on.", solution: [`The factors of ${n} are ${fs.join(", ")}.`, `That is $${fs.length}$ factors.`], shown: `$${fs.length}$` };
  }
  let a: number, b: number;
  if (level === 2) { do { a = int(r, 4, 36); b = int(r, 4, 36); } while (a === b || gcd(a, b) === 1); }
  else { do { a = int(r, 4, 15); b = int(r, 4, 15); } while (a === b || a % b === 0 || b % a === 0); }
  const hcf = level === 2;
  const ans = hcf ? gcd(a, b) : lcm(a, b);
  return { skill: "factors-multiples", level, prompt: `What is the ${hcf ? "highest common factor" : "lowest common multiple"} of $${a}$ and $${b}$?`, answer: { kind: "number", value: ans },
    hint: hcf ? "List the factors of each number. Which is the biggest one they share?" : "List the multiples of each number until you find the first one they share.",
    solution: hcf ? [`The biggest number that divides exactly into both ${a} and ${b} is $${ans}$.`] : [`The multiples of ${Math.max(a, b)} are ${[1, 2, 3, 4].map((k) => k * Math.max(a, b)).join(", ")}… and the first that ${Math.min(a, b)} also goes into is $${ans}$.`],
    shown: `$${ans}$`,
    wrong: dedupeWrong([{ tag: "hcf-lcm", number: hcf ? lcm(a, b) : gcd(a, b), message: hcf ? "That's the lowest common multiple. The highest common factor is a factor, so it can't be bigger than either number." : "That's the highest common factor. A common multiple is at least as big as the larger number." }], ans) };
}

function angles(r: R, level: number): Question {
  if (level === 1) {
    const a = 10 * int(r, 3, 12), b = 10 * int(r, 2, Math.min(8, Math.floor((170 - a) / 10)));
    if (r() < 0.5) return { figure: straightLineAnglesFig(a), skill: "angles-basic", level, prompt: `Two angles on a straight line are $${a}^\\circ$ and $x^\\circ$. Find $x$.`, answer: { kind: "number", value: 180 - a, label: "x =" }, hint: "Angles on a straight line add up to 180°.", solution: [`$180 - ${a} = ${180 - a}$.`], shown: `$x = ${180 - a}^\\circ$` };
    return { figure: triangleAnglesFig([`${a}°`, `${b}°`, "x"]), skill: "angles-basic", level, prompt: `Two angles in a triangle are $${a}^\\circ$ and $${b}^\\circ$. Find the third angle, $x$.`, answer: { kind: "number", value: 180 - a - b, label: "x =" }, hint: "Angles in a triangle add up to 180°.", solution: [`$${a} + ${b} = ${a + b}$.`, `$180 - ${a + b} = ${180 - a - b}$.`], shown: `$x = ${180 - a - b}^\\circ$` };
  }
  if (level === 2) {
    const a = 10 * int(r, 5, 12), b = 10 * int(r, 5, 12), c = 10 * int(r, 3, 8);
    const x = 360 - a - b - c;
    if (x > 0) return { figure: pointAnglesFig(a, b, c), skill: "angles-basic", level, prompt: `Angles around a point are $${a}^\\circ$, $${b}^\\circ$, $${c}^\\circ$ and $x^\\circ$. Find $x$.`, answer: { kind: "number", value: x, label: "x =" }, hint: "Angles around a point add up to 360°.", solution: [`$${a} + ${b} + ${c} = ${a + b + c}$.`, `$360 - ${a + b + c} = ${x}$.`], shown: `$x = ${x}^\\circ$` };
    return angles(r, level);
  }
  if (r() < 0.5) { const apex = 2 * int(r, 10, 40); return { skill: "angles-basic", level, prompt: `An isosceles triangle has an angle of $${apex}^\\circ$ between its two equal sides. What size is each of the other two angles?`, answer: { kind: "number", value: (180 - apex) / 2 }, hint: "The other two angles are the same size. Take the angle you know away from 180°, then split what’s left in half.", solution: [`$180 - ${apex} = ${180 - apex}$.`, `Share between two equal angles: $${180 - apex} \\div 2 = ${(180 - apex) / 2}$.`], shown: `$${(180 - apex) / 2}^\\circ$` }; }
  const a = 10 * int(r, 6, 12), b = 10 * int(r, 6, 12), c = 10 * int(r, 5, 11), x = 360 - a - b - c;
  if (x <= 0) return angles(r, level);
  return { figure: quadAnglesFig([`${a}°`, `${b}°`, `${c}°`, "?"]), skill: "angles-basic", level, prompt: `Three angles of a quadrilateral are $${a}^\\circ$, $${b}^\\circ$ and $${c}^\\circ$. Find the fourth angle.`, answer: { kind: "number", value: x }, hint: "Angles in a quadrilateral add up to 360°.", solution: [`$${a} + ${b} + ${c} = ${a + b + c}$.`, `$360 - ${a + b + c} = ${x}$.`], shown: `$${x}^\\circ$` };
}

/* ---------- Year 6 ---------- */

type Word = { prompt: string; ans: number; steps: string[] };
function wordProblems(r: R, level: number): Question {
  const nm = pick(r, NAMES), nm2 = pick(r, NAMES.filter((x) => x !== nm));
  const L1: (() => Word)[] = [
    () => { const n = int(r, 3, 8), p = int(r, 2, 6), e = int(r, 1, 5); return { prompt: `${nm} buys ${n} notebooks at ${money(p)} each and a pen for ${money(e)}. How much does ${nm} spend in pounds?`, ans: n * p + e, steps: [`Notebooks: $${n} \\times ${p} = ${n * p}$.`, `Add the pen: $${n * p} + ${e} = ${n * p + e}$.`] }; },
    () => { const bags = int(r, 4, 9), per = int(r, 5, 12), eaten = int(r, 3, 15); return { prompt: `There are ${bags} bags with ${per} apples in each. ${nm} eats ${eaten} apples. How many are left?`, ans: bags * per - eaten, steps: [`Total: $${bags} \\times ${per} = ${bags * per}$.`, `Left: $${bags * per} - ${eaten} = ${bags * per - eaten}$.`] }; },
    () => { const a = int(r, 20, 60), b = int(r, 20, 60), c = int(r, 10, 40); return { prompt: `${nm} has ${money(a)}. ${nm2} has ${money(b)}. Together they spend ${money(c)}. How much do they have left, in pounds?`, ans: a + b - c, steps: [`Together: $${a} + ${b} = ${a + b}$.`, `Left: $${a + b} - ${c} = ${a + b - c}$.`] }; },
  ];
  const L2: (() => Word)[] = [
    () => { const wk = int(r, 6, 12), save = int(r, 3, 9), spend = int(r, 5, wk * save - 1); return { prompt: `${nm} saves ${money(save)} a week for ${wk} weeks, then spends ${money(spend)}. How much is left, in pounds?`, ans: wk * save - spend, steps: [`Saved: $${wk} \\times ${save} = ${wk * save}$.`, `Left: $${wk * save} - ${spend} = ${wk * save - spend}$.`] }; },
    () => { const trays = int(r, 4, 9), per = int(r, 6, 12), sold = int(r, 5, trays * per - 1); return { prompt: `A baker makes ${trays} trays of ${per} buns. ${sold} buns are sold. How many buns are left?`, ans: trays * per - sold, steps: [`Made: $${trays} \\times ${per} = ${trays * per}$.`, `Left: $${trays * per} - ${sold} = ${trays * per - sold}$.`] }; },
    () => { const q = int(r, 6, 15), g = int(r, 3, 8), extra = int(r, 2, q - 1); return { prompt: `${g} friends share ${g * q} stickers equally. ${nm} then gives ${extra} of hers away. How many stickers does ${nm} have now?`, ans: q - extra, steps: [`Each gets: $${g * q} \\div ${g} = ${q}$.`, `After giving away ${extra}: $${q} - ${extra} = ${q - extra}$.`] }; },
  ];
  const L3: (() => Word)[] = [
    () => { const seats = int(r, 12, 16), kids = seats * int(r, 5, 9) + int(r, 1, seats - 1); return { prompt: `Each minibus seats ${seats} children. How many minibuses are needed for ${kids} children?`, ans: Math.ceil(kids / seats), steps: [`$${kids} \\div ${seats} = ${Math.floor(kids / seats)}$ remainder $${kids % seats}$.`, `The ${kids % seats} children left over still need a bus, so round up: $${Math.ceil(kids / seats)}$.`] }; },
    () => { const d = pick(r, [5, 8]), u = int(r, 5, 12), n = int(r, 2, d - 1), tank = d * u; return { prompt: `A tank holds ${tank} litres. $\\frac{${n}}{${d}}$ of the water is used, then ${u} litres are added. How many litres are in the tank now?`, ans: tank - n * u + u, steps: [`$\\frac{1}{${d}}$ of ${tank} is ${u}, so used $= ${n} \\times ${u} = ${n * u}$.`, `$${tank} - ${n * u} = ${tank - n * u}$, then $+ ${u} = ${tank - n * u + u}$.`] }; },
    () => { const p = int(r, 2, 9) * 5, price = int(r, 2, 9) * 20, n = int(r, 2, 4); const off = (price * p) / 100; return { prompt: `A coat costs ${money(price)}. In a sale it is reduced by ${p}%. ${nm} buys ${n} coats at the sale price. How much does ${nm} pay, in pounds?`, ans: n * (price - off), steps: [`${p}% of ${price} $= ${dec(off)}$.`, `Sale price: $${price} - ${dec(off)} = ${dec(price - off)}$.`, `${n} coats: $${n} \\times ${dec(price - off)} = ${dec(n * (price - off))}$.`] }; },
  ];
  const w = pick(r, level === 1 ? L1 : level === 2 ? L2 : L3)();
  return { skill: "word-problems", level, prompt: w.prompt, answer: { kind: "number", value: round(w.ans, 4) }, hint: "Read it again. Underline the numbers, decide what to do first, and write down each step.", solution: [...w.steps, `The answer is $${dec(w.ans)}$.`], shown: `$${dec(w.ans)}$` };
}

function orderOps(r: R, level: number): Question {
  type E = { tex: string; v: number; steps: string[] };
  const gen: (() => E)[] =
    level === 1
      ? [
        () => { const a = int(r, 2, 12), b = int(r, 2, 9), c = int(r, 2, 9); return { tex: `${a} + ${b} \\times ${c}`, v: a + b * c, steps: [`Multiply first: $${b} \\times ${c} = ${b * c}$.`, `Then add: $${a} + ${b * c} = ${a + b * c}$.`] }; },
        () => { const a = int(r, 2, 9), b = int(r, 2, 9), c = int(r, 1, a * b - 1); return { tex: `${a} \\times ${b} - ${c}`, v: a * b - c, steps: [`Multiply first: $${a} \\times ${b} = ${a * b}$.`, `Then subtract: $${a * b} - ${c} = ${a * b - c}$.`] }; },
      ]
      : level === 2
        ? [
          () => { const a = int(r, 2, 9), b = int(r, 2, 9), c = int(r, 2, 9); return { tex: `(${a} + ${b}) \\times ${c}`, v: (a + b) * c, steps: [`Brackets first: $${a} + ${b} = ${a + b}$.`, `Then multiply: $${a + b} \\times ${c} = ${(a + b) * c}$.`] }; },
          () => { const c = int(r, 2, 6), q = int(r, 2, 9), a = int(r, 2, 12); return { tex: `${a} + ${c * q} \\div ${c}`, v: a + q, steps: [`Divide first: $${c * q} \\div ${c} = ${q}$.`, `Then add: $${a} + ${q} = ${a + q}$.`] }; },
          () => { const a = int(r, 10, 30), b = int(r, 2, 9), c = int(r, 1, b - 1); return { tex: `${a} - (${b} - ${c})`, v: a - (b - c), steps: [`Brackets first: $${b} - ${c} = ${b - c}$.`, `Then subtract: $${a} - ${b - c} = ${a - (b - c)}$.`] }; },
        ]
        : [
          () => { const a = int(r, 2, 9), b = int(r, 2, 6), c = int(r, 2, 6); return { tex: `${a} + ${b} \\times ${c}^{2}`, v: a + b * c * c, steps: [`Powers first: $${c}^{2} = ${c * c}$.`, `Multiply: $${b} \\times ${c * c} = ${b * c * c}$.`, `Add: $${a} + ${b * c * c} = ${a + b * c * c}$.`] }; },
          () => { const a = int(r, 3, 9), b = int(r, 1, a - 1), d = pick(r, [2, 3, 4]); const sq = (a - b) ** 2; if (sq % d) return { tex: `(${a} - ${b})^{2}`, v: sq, steps: [`Brackets: $${a} - ${b} = ${a - b}$.`, `Square it: $${a - b}^{2} = ${sq}$.`] }; return { tex: `(${a} - ${b})^{2} \\div ${d}`, v: sq / d, steps: [`Brackets: $${a} - ${b} = ${a - b}$.`, `Power: $${a - b}^{2} = ${sq}$.`, `Divide: $${sq} \\div ${d} = ${sq / d}$.`] }; },
          () => { const a = int(r, 2, 6), b = int(r, 2, 6), c = int(r, 2, 9), d = int(r, 2, 9); return { tex: `${a}^{2} + ${b} \\times (${c} + ${d})`, v: a * a + b * (c + d), steps: [`Brackets: $${c} + ${d} = ${c + d}$.`, `Power: $${a}^{2} = ${a * a}$.`, `Multiply: $${b} \\times ${c + d} = ${b * (c + d)}$.`, `Add: $${a * a} + ${b * (c + d)} = ${a * a + b * (c + d)}$.`] }; },
        ];
  const e = pick(r, gen)();
  return { skill: "order-ops", level, prompt: `Work out $${e.tex}$.`, answer: { kind: "number", value: e.v }, hint: "Remember BIDMAS: Brackets, Indices (powers), Division and Multiplication, then Addition and Subtraction.", solution: e.steps, shown: `$${e.v}$` };
}

function negatives(r: R, level: number): Question {
  if (level === 1) {
    const t = int(r, 1, 8), fall = t + int(r, 2, 9);
    return { skill: "negative-numbers", level, prompt: `The temperature is $${t}^\\circ$C and then falls by $${fall}^\\circ$. What is the new temperature in °C?`, answer: { kind: "number", value: t - fall },
      hint: "Picture a thermometer or number line. Count down past zero.", solution: [`$${t} - ${fall}$: go down $${t}$ to reach 0, then $${fall - t}$ more below zero.`, `$${t - fall}^\\circ$C.`], shown: `$${t - fall}^\\circ$C` };
  }
  if (level === 2) {
    const a = -int(r, 2, 9), b = int(r, 2, 12);
    return { skill: "negative-numbers", level, prompt: `What is the difference between $${a}^\\circ$C and $${b}^\\circ$C?`, answer: { kind: "number", value: b - a },
      hint: "Count the steps on a number line from the colder temperature up to the warmer one.", solution: [`From $${a}$ up to 0 is $${-a}$, then up to $${b}$ is $${b}$ more.`, `$${-a} + ${b} = ${b - a}$.`], shown: `$${b - a}$` };
  }
  const a = -int(r, 2, 12), b = int(r, a * -1 + 1, 20);
  if (r() < 0.5) return { skill: "negative-numbers", level, prompt: `Work out $${a} + ${b}$.`, answer: { kind: "number", value: a + b }, hint: "Start at the negative number and count up.", solution: [`Start at $${a}$ and move up $${b}$ places.`, `$${a + b}$.`], shown: `$${a + b}$` };
  const c = int(r, 3, 12), d = c + int(r, 2, 9);
  return { skill: "negative-numbers", level, prompt: `Work out $${c} - ${d}$.`, answer: { kind: "number", value: c - d }, hint: "Subtracting a bigger number takes you below zero.", solution: [`$${d} - ${c} = ${d - c}$, and the answer is below zero, so it is $-${d - c}$.`], shown: `$${c - d}$` };
}

function averages(r: R, level: number): Question {
  const n = level === 1 ? 5 : level === 2 ? pick(r, [5, 6, 7]) : 5;
  const data = Array.from({ length: n }, () => int(r, 2, 20));
  const sorted = [...data].sort((a, b) => a - b);
  const list = data.join(", ");
  if (level === 1) {
    if (r() < 0.5) { const range = sorted[n - 1] - sorted[0]; return { skill: "averages", level, prompt: `Find the range of these numbers: ${list}.`, answer: { kind: "number", value: range }, hint: "Range = biggest number minus smallest number.", solution: [`Biggest $${sorted[n - 1]}$, smallest $${sorted[0]}$.`, `$${sorted[n - 1]} - ${sorted[0]} = ${range}$.`], shown: `$${range}$` }; }
    const mode = pick(r, data), arr = shuffle(r, [...data.filter((x) => x !== mode), mode, mode, mode]).slice(0, 7);
    const counts = new Map<number, number>(); arr.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
    const top = Math.max(...counts.values()), modes = [...counts].filter(([, c]) => c === top);
    if (modes.length !== 1) return averages(r, level);
    return { skill: "averages", level, prompt: `Find the mode of these numbers: ${arr.join(", ")}.`, answer: { kind: "number", value: modes[0][0] }, hint: "The mode is the number that appears most often.", solution: [`$${modes[0][0]}$ appears ${top} times, more than any other.`], shown: `$${modes[0][0]}$` };
  }
  if (level === 2) {
    if (r() < 0.5) { const m = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2; return { skill: "averages", level, prompt: `Find the median of these numbers: ${list}.`, answer: { kind: "number", value: m }, hint: "Put the numbers in order first. The median is the middle one (or halfway between the two middle ones).", solution: [`In order: ${sorted.join(", ")}.`, n % 2 ? `The middle number is $${m}$.` : `The two middle numbers are ${sorted[n / 2 - 1]} and ${sorted[n / 2]}; halfway between is $${m}$.`], shown: `$${m}$` }; }
    const target = int(r, 4, 14), arr = Array.from({ length: n - 1 }, () => int(r, 2, 20)), last = target * n - arr.reduce((s, x) => s + x, 0);
    if (last < 1 || last > 30) return averages(r, level);
    const full = [...arr, last];
    return { skill: "averages", level, prompt: `Find the mean of these numbers: ${full.join(", ")}.`, answer: { kind: "number", value: target }, hint: "Mean = total ÷ how many numbers there are.", solution: [`Total: $${full.join(" + ")} = ${target * n}$.`, `$${target * n} \\div ${n} = ${target}$.`], shown: `$${target}$` };
  }
  const mean = int(r, 5, 15), arr = Array.from({ length: 4 }, () => int(r, 2, 20)), last = mean * 5 - arr.reduce((s, x) => s + x, 0);
  if (last < 1) return averages(r, level);
  return { skill: "averages", level, prompt: `The mean of 5 numbers is $${mean}$. Four of the numbers are ${arr.join(", ")}. What is the fifth number?`, answer: { kind: "number", value: last },
    hint: "Find the total the 5 numbers must make (mean × 5), then take away the four you know.", solution: [`Total of all 5: $${mean} \\times 5 = ${mean * 5}$.`, `Four known: $${arr.join(" + ")} = ${arr.reduce((s, x) => s + x, 0)}$.`, `Fifth: $${mean * 5} - ${arr.reduce((s, x) => s + x, 0)} = ${last}$.`], shown: `$${last}$`,
    wrong: dedupeWrong([{ tag: "forgot-total", number: mean, message: "The mean is the average. To find a missing value, first work out what all five numbers must add up to." }], last) };
}

function sequences(r: R, level: number): Question {
  if (level === 1) {
    const a = int(r, 2, 30), d = nonZero(r, -6, 9), seq = [a, a + d, a + 2 * d, a + 3 * d];
    if (seq.some((x) => x < 0) || a + 4 * d < 0) return sequences(r, level);
    return { skill: "sequences", level, prompt: `What is the next number in this sequence? ${seq.join(", ")}, …`, answer: { kind: "number", value: a + 4 * d }, hint: "Find the difference between each pair of terms.", solution: [`The terms ${d > 0 ? "go up" : "go down"} by $${Math.abs(d)}$ each time.`, `$${seq[3]} ${d > 0 ? "+" : "-"} ${Math.abs(d)} = ${a + 4 * d}$.`], shown: `$${a + 4 * d}$` };
  }
  if (level === 2) {
    const d = int(r, 2, 9), a = int(r, 1, 12), k = int(r, 8, 20), seq = [a, a + d, a + 2 * d, a + 3 * d];
    return { skill: "sequences", level, prompt: `The sequence ${seq.join(", ")}, … continues in the same way. What is the ${ord(k)} term?`, answer: { kind: "number", value: a + (k - 1) * d },
      hint: "The first term is the start. To reach the kth term you add the difference (k − 1) times.", solution: [`The difference is $${d}$ and the first term is $${a}$.`, `$${a} + ${k - 1} \\times ${d} = ${a + (k - 1) * d}$.`], shown: `$${a + (k - 1) * d}$` };
  }
  if (r() < 0.5) { const a = int(r, 2, 9), b = nonZero(r, -5, 9), k = int(r, 10, 30); return { skill: "sequences", level, prompt: `The nth term of a sequence is $${a}n ${b < 0 ? "-" : "+"} ${Math.abs(b)}$. Find the ${ord(k)} term.`, answer: { kind: "number", value: a * k + b }, hint: "Replace n with the term number and work it out.", solution: [`$${a} \\times ${k} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a * k + b}$.`], shown: `$${a * k + b}$` }; }
  const a = int(r, 2, 9), b = int(r, 1, 9), k = int(r, 6, 20);
  return { skill: "sequences", level, prompt: `The nth term of a sequence is $${a}n + ${b}$. Which term in the sequence is equal to $${a * k + b}$?`, answer: { kind: "number", value: k, label: "n =" }, hint: "Set the rule equal to the number, then undo it: subtract, then divide.", solution: [`$${a}n + ${b} = ${a * k + b}$.`, `$${a}n = ${a * k}$, so $n = ${k}$.`], shown: `$n = ${k}$` };
}

export const primarySkills: Skill[] = [
  { id: "place-value", name: "Place value", stage: "KS2", year: 3, strand: "Number", blurb: "The value of each digit, up to hundreds of thousands.", prereqs: [],
    parentNote: "Each digit's value depends on its column: in 4,573 the 5 is worth 500, not 5. Ask them to say numbers aloud as 'four thousand, five hundred and seventy-three'.", talkAbout: "Why does a zero matter in 4,073?", generate: placeValue },
  { id: "add-sub", name: "Adding and subtracting", stage: "KS2", year: 3, strand: "Number", blurb: "Written addition and subtraction with big numbers.", prereqs: [],
    parentNote: "Line digits up by place value and work from the right. Estimating first (round and add) catches most slips.", talkAbout: "How could you check your answer is sensible before you work it out exactly?", generate: addSub },
  { id: "times-tables", name: "Times tables", stage: "KS2", year: 3, strand: "Number", blurb: "Multiplication and division facts to 12 × 12.", prereqs: [],
    parentNote: "Fluency matters for almost everything later. Short daily practice beats long sessions. Link facts: if 6 × 7 = 42, then 42 ÷ 7 = 6.", talkAbout: "If you know 6 × 8, how can you quickly work out 7 × 8?", generate: timesTables },
  { id: "mult-written", name: "Multiplying", stage: "KS2", year: 4, strand: "Number", blurb: "Multiply 2-, 3- and 4-digit numbers, by one and two digits.", prereqs: ["times-tables", "add-sub"],
    parentNote: "Split a number into tens and ones, multiply each part, then add. It is the same idea as the column method.", talkAbout: "How would you split 23 × 14 into easier multiplications?", generate: multWritten },
  { id: "division", name: "Dividing", stage: "KS2", year: 4, strand: "Number", blurb: "Short and long division, with remainders.", prereqs: ["times-tables"],
    parentNote: "Division asks 'how many lots of this fit in?'. A remainder is what's left over. Chunking (taking away easy multiples) is the friendliest method for bigger numbers.", talkAbout: "What does 'remainder 3' mean in a real situation, like sharing sweets?", generate: division },
  { id: "frac-equiv", name: "Equivalent fractions", stage: "KS2", year: 4, strand: "Number", blurb: "Fractions that are the same size, and simplifying.", prereqs: ["times-tables"],
    parentNote: "Multiplying (or dividing) top and bottom by the same number gives a fraction of the same size. Draw a pizza cut into more slices.", talkAbout: "Why is 2/4 the same amount as 1/2?", generate: fracEquiv },
  { id: "rounding", name: "Rounding", stage: "KS2", year: 4, strand: "Number", blurb: "Round whole numbers and decimals.", prereqs: ["place-value"],
    parentNote: "Look at the digit just to the right of the one you are rounding to: 5 or more rounds up. Draw a number line to see which ten or hundred is closer.", talkAbout: "Where on a number line is 350, and why does it round up?", generate: rounding },
  { id: "decimals", name: "Decimals", stage: "KS2", year: 5, strand: "Number", blurb: "Add, subtract, multiply and divide decimals.", prereqs: ["place-value", "add-sub"],
    parentNote: "Line up the decimal points. Treating 0.4 as 4 tenths often makes calculations easier.", talkAbout: "What happens to the digits when you multiply 3.5 by 10?", generate: decimals },
  { id: "frac-amount", name: "Fractions of amounts", stage: "KS2", year: 5, strand: "Number", blurb: "Find a fraction of a number or quantity.", prereqs: ["frac-equiv", "division"],
    parentNote: "Divide by the bottom number to find one part, then multiply by the top number. For '3/4 of 36': 36 ÷ 4 = 9, then 9 × 3 = 27.", talkAbout: "What does the bottom number tell you, and what does the top number tell you?", generate: fracAmount },
  { id: "measures-convert", name: "Converting units", stage: "KS2", year: 5, strand: "Measures", blurb: "Convert between metric units of length, mass and capacity.", prereqs: ["place-value"],
    parentNote: "Know the key links: 1 m = 100 cm, 1 km = 1,000 m, 1 kg = 1,000 g, 1 l = 1,000 ml. Going to a smaller unit makes the number bigger.", talkAbout: "Should the number get bigger or smaller when you change kilograms into grams? Why?", generate: measures },
  { id: "perimeter-area", name: "Perimeter and area", stage: "KS2", year: 5, strand: "Measures", blurb: "Perimeter and area of rectangles and triangles.", prereqs: ["add-sub", "times-tables"],
    parentNote: "Perimeter is the distance around the edge; area is the space inside. A triangle is half the rectangle around it.", talkAbout: "Can two shapes have the same area but different perimeters?", generate: perimeterArea },
  { id: "factors-multiples", name: "Factors and multiples", stage: "KS2", year: 5, strand: "Number", blurb: "Factors, multiples, highest common factor and lowest common multiple.", prereqs: ["times-tables", "division"],
    parentNote: "Factors divide exactly into a number; multiples are in its times table. Listing them in pairs keeps you organised.", talkAbout: "How can you tell quickly whether a number is a multiple of 3?", generate: factorsMultiples },
  { id: "angles-basic", name: "Angles", stage: "KS2", year: 5, strand: "Geometry", blurb: "Angles on a line, around a point, in triangles and quadrilaterals.", prereqs: ["add-sub"],
    parentNote: "Key totals: straight line 180°, around a point 360°, triangle 180°, quadrilateral 360°.", talkAbout: "Why do the angles in any triangle always add up to 180°?", generate: angles },
  { id: "word-problems", name: "Multi-step word problems", stage: "KS2", year: 6, strand: "Number", blurb: "Plan and solve problems with more than one step.", prereqs: ["add-sub", "mult-written", "division"],
    parentNote: "Most mistakes are in the reading, not the arithmetic. Encourage them to underline the numbers, say what the question is asking, and write each step.", talkAbout: "Can you explain the first step before you do any calculating?", generate: wordProblems },
  { id: "order-ops", name: "Order of operations", stage: "KS2", year: 6, strand: "Number", blurb: "BIDMAS with brackets and powers.", prereqs: ["times-tables", "add-sub"],
    parentNote: "Brackets, then indices (powers), then division and multiplication, then addition and subtraction. Left to right is not always right!", talkAbout: "Why is 2 + 3 × 4 not 20?", generate: orderOps },
  { id: "negative-numbers", name: "Negative numbers", stage: "KS2", year: 6, strand: "Number", blurb: "Counting and calculating across zero.", prereqs: ["place-value", "add-sub"],
    parentNote: "A thermometer or a number line is the best model. Moving up is adding, moving down is subtracting, and zero is just a point you pass through.", talkAbout: "How would you explain how far it is from -4 to 5?", generate: negatives },
  { id: "averages", name: "Averages and range", stage: "KS2", year: 6, strand: "Statistics", blurb: "Mean, median, mode and range.", prereqs: ["add-sub", "division"],
    parentNote: "Mean: total ÷ how many. Median: the middle number once in order. Mode: most common. Range: biggest minus smallest.", talkAbout: "When would the median tell you more than the mean?", generate: averages },
  { id: "sequences", name: "Number sequences", stage: "KS2", year: 6, strand: "Algebra", blurb: "Continue sequences and use a rule to find any term.", prereqs: ["add-sub", "times-tables"],
    parentNote: "Find the difference between terms. For a rule like 3n + 2, put the term number in place of n. This is the first taste of algebra.", talkAbout: "How would you find the 100th term without writing them all out?", generate: sequences },
];

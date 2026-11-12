import type { Figure } from "./types";

/**
 * Worked examples that show the method, not just the sum again: the column layout with its carries and exchanges, the grid method for
 * multiplying, and the bus stop for dividing. Each returns the picture and the step-by-step words, both made from the same digits, so
 * they can't disagree with one another or with the answer.
 */
export interface Worked { figure: Figure; steps: string[] }

const PLACES = ["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands", "millions"];
const UNITS = ["one", "ten", "hundred", "thousand", "ten thousand", "hundred thousand", "million"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const digits = (n: number, width = 0) => String(n).padStart(width, "0").split("").map(Number);
const m = (s: string | number) => `$${s}$`;
/** An integer of 10^-dp units written with its decimal point. */
const shown = (n: number, dp: number) => (dp ? (n / 10 ** dp).toFixed(dp) : String(n));

// ---------------------------------------------------------------------------------------------- column addition and subtraction
/** How a column sum is written: digits after a decimal point, a symbol before the numbers (£), and the column names if they aren't the usual ones. */
export interface ColumnOpts { dp?: number; prefix?: string; names?: string[]; units?: string[] }
const FRAC_NAMES = ["hundredths", "tenths"], FRAC_UNITS = ["hundredth", "tenth"];
function namesFor(o: ColumnOpts): { names: string[]; units: string[] } {
  const dp = o.dp ?? 0;
  const fn = dp === 3 ? ["thousandths", ...FRAC_NAMES] : FRAC_NAMES.slice(2 - Math.min(dp, 2)), fu = dp === 3 ? ["thousandth", ...FRAC_UNITS] : FRAC_UNITS.slice(2 - Math.min(dp, 2));
  return { names: o.names ?? [...(dp ? fn : []), ...PLACES], units: o.units ?? [...(dp ? fu : []), ...UNITS] };
}
export function columnWork(a: number, b: number, op: "+" | "-", opts: ColumnOpts = {}): Worked {
  return op === "+" ? columnAdd(a, b, opts) : columnSub(a, b, opts);
}

function columnAdd(a: number, b: number, o: ColumnOpts = {}): Worked {
  const { names } = namesFor(o), dp = o.dp ?? 0;
  const total = a + b, N = Math.max(String(total).length, dp + 1), t = digits(a, N), u = digits(b, N);
  const carries: string[] = Array(N).fill("");
  const steps = ["Line up the digits so that ones are under ones, tens under tens, and so on. Start with the ones."];
  let carry = 0;
  for (let k = 0; k < N; k++) {
    const i = N - 1 - k, hasA = k < String(a).length, hasB = k < String(b).length;
    if (!hasA && !hasB && carry === 0) break;
    const sum = t[i] + u[i] + carry, out = sum % 10, next = Math.floor(sum / 10);
    const name = cap(names[k] ?? PLACES[k]);
    let text: string;
    if (!hasA && !hasB) text = `${name}: nothing left to add, so bring down the carried ${m(carry)}.`;
    else {
      const parts = [hasA ? String(t[i]) : "0", hasB ? String(u[i]) : "0"].filter((_, idx) => (idx === 0 ? hasA : hasB));
      if (carry) parts.push(String(carry));
      text = `${name}: ${m(`${parts.join(" + ")} = ${sum}`)}${carry ? ` (the ${carry} is the one carried over)` : ""}. ${next ? `Write ${m(out)} and carry ${m(next)} into the ${names[k + 1] ?? PLACES[k + 1]}.` : `Write ${m(out)}.`}`;
    }
    steps.push(text);
    if (next && i - 1 >= 0) carries[i - 1] = String(next);
    carry = next;
  }
  return {
    steps,
    figure: { type: "column-sum", op: "+", top: String(a), bottom: String(b), result: String(total), carries, exchanges: Array(N).fill(null), dp: dp || undefined, prefix: o.prefix, alt: `${o.prefix ?? ""}${shown(a, dp)} plus ${o.prefix ?? ""}${shown(b, dp)} written in columns. The answer is ${o.prefix ?? ""}${shown(total, dp)}.${carries.some(Boolean) ? ` Carried digits: ${carries.map((c, i) => (c ? `${c} into the ${names[N - 1 - i] ?? ""}` : "")).filter(Boolean).join(", ")}.` : ""}` },
  };
}

function columnSub(a: number, b: number, o: ColumnOpts = {}): Worked {
  const { names, units } = namesFor(o), dp = o.dp ?? 0;
  const N = Math.max(String(a).length, dp + 1), t = digits(a, N), u = digits(b, N), cur = t.slice();
  const exchanges: ({ was: string; now: string } | null)[] = Array(N).fill(null);
  const steps = ["Line up the digits so that ones are under ones, tens under tens, and so on. Start with the ones, and always take the bottom number away from the top one."];
  const bLen = String(b).length;
  for (let k = 0; k < N; k++) {
    const i = N - 1 - k, name = cap(names[k] ?? PLACES[k]);
    const x = cur[i], y = u[i], hasB = k < bLen;
    if (x < y) {
      // find a column to the left with something to give; any zeros in between become 9s
      let j = i - 1;
      while (j >= 0 && cur[j] === 0) j--;
      cur[j]--; exchanges[j] = { was: String(t[j]), now: String(cur[j]) };
      for (let q = j + 1; q < i; q++) { cur[q] = 9; exchanges[q] = { was: String(t[q]), now: "9" }; }
      cur[i] += 10; exchanges[i] = { was: String(t[i]), now: String(cur[i]) };
      const via = i - j === 1
        ? `exchange 1 ${units[k + 1] ?? UNITS[k + 1]} for 10 ${names[k] ?? PLACES[k]}`
        : `there is nothing to exchange from the ${names[k + 1] ?? PLACES[k + 1]}, so take 1 ${units[N - 1 - j] ?? UNITS[N - 1 - j]} from the ${names[N - 1 - j] ?? PLACES[N - 1 - j]} and pass it down as 10s until you reach the ${names[k] ?? PLACES[k]}`;
      steps.push(`${name}: ${m(x)} is too small to take away ${m(y)}, so ${via}. Now ${m(`${cur[i]} - ${y} = ${cur[i] - y}`)}.`);
    } else if (!hasB) {
      steps.push(`${name}: nothing to take away, so write ${m(x)}${x !== t[i] ? ` (after the exchange)` : ""}.`);
    } else {
      steps.push(`${name}: ${x !== t[i] ? `after the exchange there ${x === 1 ? "is" : "are"} ${m(x)} left, so ` : ""}${m(`${x} - ${y} = ${x - y}`)}.`);
    }
  }
  const ans = a - b;
  return {
    steps,
    figure: { type: "column-sum", op: "-", top: String(a), bottom: String(b), result: String(ans), carries: Array(N).fill(""), exchanges, dp: dp || undefined, prefix: o.prefix, alt: `${o.prefix ?? ""}${shown(a, dp)} minus ${o.prefix ?? ""}${shown(b, dp)} written in columns. The answer is ${o.prefix ?? ""}${shown(ans, dp)}.${exchanges.some(Boolean) ? ` Exchanges are shown above the top number: ${exchanges.map((e, i) => (e ? `the ${names[N - 1 - i] ?? ""} digit ${e.was} becomes ${e.now}` : "")).filter(Boolean).join("; ")}.` : ""}` },
  };
}

// ---------------------------------------------------------------------------------------------- the grid method for multiplying
const parts = (n: number) => String(n).split("").map((d, i, all) => Number(d) * 10 ** (all.length - 1 - i)).filter((p) => p > 0);

export function gridWork(a: number, b: number): Worked {
  const A = parts(a), B = parts(b), cells = A.flatMap((x) => B.map((y) => x * y)), total = a * b;
  const fmt = (n: number) => String(n);
  const steps = [
    `Split ${m(a)} into ${A.map(m).join(" + ")}${B.length > 1 ? ` and ${m(b)} into ${B.map(m).join(" + ")}` : `, and keep ${m(b)} as it is`}, and draw a grid with a box for each pair.`,
    `Multiply the numbers on the edges to fill each box: ${A.flatMap((x) => B.map((y) => m(`${x} \\times ${y} = ${x * y}`))).join(", ")}.`,
    `Add up all the boxes: ${m(`${cells.join(" + ")} = ${total}`)}.`,
  ];
  return {
    steps,
    figure: {
      type: "table", head: ["×", ...B.map(fmt)], rows: A.map((x) => [fmt(x), ...B.map((y) => fmt(x * y))]),
      alt: `A grid for ${a} times ${b}. ${A.flatMap((x) => B.map((y) => `${x} times ${y} is ${x * y}`)).join(", ")}. Adding the boxes gives ${total}.`,
    },
  };
}

// ---------------------------------------------------------------------------------------------- the bus stop for dividing
export function busStopWork(n: number, d: number): Worked & { quotient: number; remainder: number } {
  const ds = digits(n), N = ds.length, q: number[] = [], carries: string[] = Array(N).fill("");
  const steps = [`Write ${m(n)} under the bus stop and ${m(d)} outside it. Work from the left, one digit at a time.`];
  let rem = 0;
  for (let i = 0; i < N; i++) {
    const cur = rem * 10 + ds[i], qd = Math.floor(cur / d), r = cur % d;
    q.push(qd);
    const place = PLACES[N - 1 - i];
    if (i === 0 && qd === 0) steps.push(`${m(`${ds[i]} \\div ${d}`)} doesn't go, so carry ${m(ds[i])} to the next digit.`);
    else steps.push(`${m(`${cur} \\div ${d} = ${qd}`)}${r ? ` remainder ${m(r)}` : ""}. Write ${m(qd)} above the ${ds[i]} (the ${place} place)${i < N - 1 ? (r ? `, and carry ${m(r)} to the next digit.` : ".") : "."}`);
    if (i < N - 1 && r) carries[i + 1] = String(r);
    rem = r;
  }
  const quotient = Math.floor(n / d);
  steps.push(rem ? `There are no more digits, so the answer is ${m(quotient)} remainder ${m(rem)}.` : `There is nothing left over, so the answer is ${m(quotient)}.`);
  return {
    quotient, remainder: rem, steps,
    figure: { type: "bus-stop", divisor: d, digits: String(n), quotient: q.join(""), carries, remainder: rem, alt: `Short division of ${n} by ${d}. The answer is ${quotient}${rem ? ` remainder ${rem}` : ""}.${carries.some(Boolean) ? ` Carried: ${carries.map((c, i) => (c ? `${c} before the ${ds[i]}` : "")).filter(Boolean).join(", ")}.` : ""}` },
  };
}

// ---------------------------------------------------------------------------------------------- adding several numbers in columns
export function columnManyWork(nums: number[], o: ColumnOpts = {}): Worked {
  const { names } = namesFor(o), dp = o.dp ?? 0, total = nums.reduce((t, x) => t + x, 0), N = Math.max(String(total).length, dp + 1);
  const ds = nums.map((x) => digits(x, N)), carries: string[] = Array(N).fill("");
  const steps = ["Line up the digits so that each column is under the same column, and add each column from the right."];
  let carry = 0;
  for (let k = 0; k < N; k++) {
    const i = N - 1 - k, parts = ds.map((d) => d[i]).filter((_, idx) => k < String(nums[idx]).length), sum = parts.reduce((t, x) => t + x, 0) + carry, out = sum % 10, next = Math.floor(sum / 10);
    if (!parts.length && !carry) break;
    const name = cap(names[k] ?? PLACES[k]);
    steps.push(!parts.length ? `${name}: bring down the carried ${m(carry)}.` : `${name}: ${m(`${[...parts, ...(carry ? [carry] : [])].join(" + ")} = ${sum}`)}${carry ? ` (including the ${carry} carried over)` : ""}. ${next ? `Write ${m(out)} and carry ${m(next)}.` : `Write ${m(out)}.`}`);
    if (next && i - 1 >= 0) carries[i - 1] = String(next);
    carry = next;
  }
  return {
    steps,
    figure: { type: "column-sum", op: "+", top: String(nums[0]), bottom: String(nums[1]), more: nums.slice(2).map(String), result: String(total), carries, exchanges: Array(N).fill(null), dp: dp || undefined, prefix: o.prefix, alt: `${nums.map((x) => `${o.prefix ?? ""}${shown(x, dp)}`).join(" plus ")} written in columns. The answer is ${o.prefix ?? ""}${shown(total, dp)}.` },
  };
}

// ---------------------------------------------------------------------------------------------- place value charts
const INT_HEADS = ["TM", "M", "HTh", "TTh", "Th", "H", "T", "O"], FRAC_HEADS = ["t", "h", "th"];
/** A place value chart with one row for each number, the digits lined up by place and the decimal point in its own column. */
export function placeChart(rows: { label: string; value: string }[], alt: string): Figure {
  const parts = rows.map((r) => { const [i, f = ""] = r.value.split("."); return { label: r.label, i, f }; });
  const ni = Math.min(8, Math.max(...parts.map((p) => p.i.length))), nf = Math.max(...parts.map((p) => p.f.length));
  const head = ["", ...INT_HEADS.slice(-ni), ...(nf ? [".", ...FRAC_HEADS.slice(0, nf)] : [])];
  return {
    type: "table", head, alt,
    rows: parts.map((p) => [p.label, ...p.i.padStart(ni, " ").split("").map((c) => (c === " " ? "" : c)), ...(nf ? [".", ...p.f.padEnd(nf, " ").split("").map((c) => (c === " " ? "" : c))] : [])]),
  };
}

// ---------------------------------------------------------------------------------------------- number lines with hops
export function jumpLine(f: Omit<Extract<Figure, { type: "jump-line" }>, "type">): Figure { return { type: "jump-line", ...f }; }

// ---------------------------------------------------------------------------------------------- long division by chunking
export function chunkWork(n: number, d: number): Worked & { quotient: number; remainder: number } {
  const chunks: { times: number; amount: number; left: number }[] = [];
  let left = n;
  while (left >= d) {
    const k = [100, 50, 20, 10, 5, 2, 1].find((x) => x * d <= left)!;
    left -= k * d; chunks.push({ times: k, amount: k * d, left });
  }
  const quotient = chunks.reduce((t, c) => t + c.times, 0);
  const steps = [
    `Write ${m(n)} and take away chunks of ${m(d)}, starting with the biggest chunk that fits. Tens and fives of ${m(d)} are easy to find.`,
    ...chunks.map((c) => `Take away ${m(`${c.times} \\times ${d} = ${c.amount}`)}. That leaves ${m(c.left)}.`),
    `Add up the chunks: ${m(`${chunks.map((c) => c.times).join(" + ")} = ${quotient}`)}.${left ? ` ${m(left)} is left over, which is less than ${m(d)}, so the remainder is ${m(left)}.` : ` Nothing is left over.`}`,
  ];
  return { quotient, remainder: left, steps, figure: { type: "chunking", divisor: d, dividend: n, chunks, quotient, remainder: left, alt: `Long division of ${n} by ${d} in chunks. ${chunks.map((c) => `Take away ${c.times} lots of ${d}, which is ${c.amount}, leaving ${c.left}`).join(". ")}. The chunks add up to ${quotient}${left ? `, with ${left} left over` : ""}.` } };
}

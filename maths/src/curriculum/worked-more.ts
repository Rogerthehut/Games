import type { Figure } from "../engine/types";
import { clean, dec, val, type Builder } from "./worked-utils";

/**
 * Pictures for money, measures, factors, number patterns, averages and data: tables and lists that lay the working out, bar models for
 * missing-number sums, arrays for squares. Read from each question's own wording and answer (see worked-skills.ts).
 */
const table = (head: string[], rows: (string | number)[][], alt: string): Figure => ({ type: "table", head, rows, alt });
const plain = (t: string) => t.replace(/\$/g, "");
const money = (p: number) => (p >= 100 ? `£${(p / 100).toFixed(2)}` : `${p}p`);
const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// ---------------------------------------------------------------------------------------------- money
const coinsNotes: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (/smallest number of coins/.test(p)) {
    const target = Number(p.match(/make (\d+)p/)?.[1]); if (!target) return null;
    let left = target; const used: string[][] = [];
    for (const c of [200, 100, 50, 20, 10, 5, 2, 1]) { const n = Math.floor(left / c); if (n) { used.push([money(c), String(n)]); left -= n * c; } }
    return { figure: table(["Coin", "How many"], used, `The fewest coins to make ${target}p: ${used.map((u) => `${u[1]} of ${u[0]}`).join(", ")}.`) };
  }
  const items = [...p.matchAll(/(\d+|one) (?:×|x)? ?(£\d+|\d+p) coins?|(\d+) × (£\d+|\d+p) coins?/g)].map((m) => { const n = m[1] ? (m[1] === "one" ? 1 : Number(m[1])) : Number(m[3]), c = m[2] ?? m[4]; return { n, c, v: c.startsWith("£") ? Number(c.slice(1)) * 100 : Number(c.slice(0, -1)) }; });
  const extra = [...p.matchAll(/(?:and )?one (\d+)p coin/g)].map((m) => ({ n: 1, c: `${m[1]}p`, v: Number(m[1]) }));
  const all = [...items, ...extra.filter((e) => !items.some((i) => i.c === e.c))];
  if (!all.length || a === null) return null;
  const total = all.reduce((t, i) => t + i.n * i.v, 0);
  return { figure: table(["Coins", "How many", "Each is worth", "Total"], [...all.map((i) => [i.c, i.n, `${i.v}p`, `${i.n * i.v}p`]), ["All together", "", "", `${total}p`]], `A table of coins: ${all.map((i) => `${i.n} of ${i.c}, worth ${i.n * i.v}p`).join("; ")}. Altogether ${total}p.`) };
};

const poundsPence: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/How many pence is £(\d+)\.(\d{2})/);
  if (m) return { figure: table(["", "Pounds", "Pence"], [["Amount", `£${m[1]}`, `${Number(m[2])}p`], ["In pence", `${Number(m[1]) * 100}p`, `${Number(m[2])}p`], ["Altogether", `${Number(m[1]) * 100 + Number(m[2])}p`, ""]], `£${m[1]}.${m[2]} is ${m[1]} pounds, which is ${Number(m[1]) * 100} pence, plus ${Number(m[2])} pence.`) };
  m = p.match(/Write (\d+)p in pounds/);
  if (m && a !== null) { const n = Number(m[1]); return { figure: table(["", "Pounds", "Pence"], [["Pence", `${Math.floor(n / 100) * 100}p`, `${n % 100}p`], ["Pounds", `£${Math.floor(n / 100)}`, `${n % 100}p`], ["Written as", `£${(n / 100).toFixed(2)}`, ""]], `${n}p is ${Math.floor(n / 100)} pounds and ${n % 100} pence, written £${(n / 100).toFixed(2)}.`) }; }
  return null;
};

const bill: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  const items = [...p.matchAll(/(\d+) ([a-z ]+?) (?:at|cost) (£\d+(?:\.\d+)?|\d+p) each/g)].map((m) => ({ n: Number(m[1]), name: m[2].replace(/^(?:and|a|buy) /, ""), price: m[3].startsWith("£") ? Math.round(Number(m[3].slice(1)) * 100) : Number(m[3].slice(0, -1)) }));
  const game = p.match(/a game for £(\d+(?:\.\d+)?)/);
  if (game) items.push({ n: 1, name: "game", price: Math.round(Number(game[1]) * 100) });
  if (!items.length || a === null) return null;
  const total = items.reduce((t, i) => t + i.n * i.price, 0), paid = Number(p.match(/pay with a £(\d+)/)?.[1]);
  const rows: (string | number)[][] = items.map((i) => [i.name, i.n, money(i.price), money(i.n * i.price)]);
  rows.push(["Total", "", "", money(total)]);
  if (paid) rows.push([`Change from £${paid}`, "", "", money(paid * 100 - total)]);
  return { figure: table(["Item", "How many", "Price each", "Cost"], rows, `A bill: ${items.map((i) => `${i.n} ${i.name} at ${money(i.price)} each is ${money(i.n * i.price)}`).join("; ")}. Total ${money(total)}.${paid ? ` Change from ${paid} pounds: ${money(paid * 100 - total)}.` : ""}`) };
};

const bestValue: Builder = (q) => {
  const p = plain(q.prompt);
  let m = p.match(/pack of (\d+) \w+ costs £(\d+\.\d+)\. How much does one/);
  if (m) { const n = Number(m[1]), c = Math.round(Number(m[2]) * 100); return { figure: table(["Number", "Price", "Price for one"], [[n, money(c), money(c / n)]], `${n} for ${money(c)} is ${money(c / n)} each.`) }; }
  m = p.match(/Pack A has (\d+) \w+ for £(\d+\.\d+)\. Pack B has (\d+) \w+ for £(\d+\.\d+)/);
  if (m) { const rows = [["A", Number(m[1]), Number(m[2])], ["B", Number(m[3]), Number(m[4])]].map(([k, n, c]) => [k, n, money(Math.round((c as number) * 100)), money(Math.round((c as number) * 100) / (n as number))]); return { figure: table(["Pack", "Number", "Price", "Price for one"], rows, `Pack A: ${rows[0][3]} each. Pack B: ${rows[1][3]} each. The cheaper one is the better value.`) }; }
  m = p.match(/A (\d+) g tin costs £(\d+\.\d+) and a (\d+) g tin costs £(\d+\.\d+)/);
  if (m) { const rows = [[Number(m[1]), Number(m[2])], [Number(m[3]), Number(m[4])]].map(([g, c]) => [`${g} g`, money(Math.round(c * 100)), money(Math.round((c * 100) / (g / 100)))]); return { figure: table(["Tin", "Price", "Price for 100 g"], rows, `The ${m[1]} g tin is ${rows[0][2]} for 100 g and the ${m[3]} g tin is ${rows[1][2]} for 100 g.`) }; }
  return null;
};

const currency: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), rate = Number(p.match(/£1 buys (\d+\.\d+) euros/)?.[1]);
  if (!rate || a === null) return null;
  const m1 = p.match(/for £(\d+)\?/), m2 = p.match(/costs (\d+) euros\. How much is that in pounds/);
  if (m1) return { figure: table(["Pounds (£)", "Euros"], [[1, dec(rate)], [Number(m1[1]), dec(a)]], `£1 buys ${rate} euros, so £${m1[1]} buys ${a} euros.`) };
  const m3 = p.match(/costs £(\d+) in London and (\d+) euros in Paris/);
  if (m3) { const paris = Number(m3[2]) / rate; return { figure: table(["", "London", "Paris"], [["Price", `£${m3[1]}`, `${m3[2]} euros`], ["Price in £", `£${m3[1]}`, `£${dec(paris)}`], ["Difference", "", `£${dec(Math.abs(Number(m3[1]) - paris))}`]], `The jacket is £${m3[1]} in London and ${m3[2]} euros in Paris, which is £${dec(paris)}. The difference is £${dec(Math.abs(Number(m3[1]) - paris))}.`) }; }
  if (m2) return { figure: table(["Pounds (£)", "Euros"], [[1, dec(rate)], [dec(a), Number(m2[1])]], `£1 buys ${rate} euros, so ${m2[1]} euros is £${a}.`) };
  return null;
};

const multiplyDivideMoney: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/One \w+ costs £(\d+\.\d+)\. How much do (\d+)/);
  if (m) return { figure: table(["Number", "Cost"], [[1, `£${m[1]}`], [Number(m[2]), `£${a.toFixed(2)}`]], `One costs £${m[1]}, so ${m[2]} cost £${a.toFixed(2)}.`) };
  m = p.match(/(\d+) identical \w+ cost £(\d+\.\d+) altogether\. How much does one/);
  if (m) return { figure: table(["Number", "Cost"], [[Number(m[1]), `£${m[2]}`], [1, `£${a.toFixed(2)}`]], `${m[1]} cost £${m[2]}, so one costs £${a.toFixed(2)}.`) };
  m = p.match(/(\d+) identical \w+ cost £(\d+\.\d+)\. How much would (\d+)/);
  if (m) { const one = Math.round((Number(m[2]) * 100) / Number(m[1])); return { figure: table(["Number", "Cost"], [[Number(m[1]), `£${m[2]}`], [1, money(one)], [Number(m[3]), `£${a.toFixed(2)}`]], `${m[1]} cost £${m[2]}, so one costs ${money(one)}, and ${m[3]} cost £${a.toFixed(2)}.`) }; }
  return null;
};

// ---------------------------------------------------------------------------------------------- measures and time
const measuresConvert: Builder = (q) => {
  const p = plain(q.prompt), a = val(q), m = p.match(/Convert (\d+(?:\.\d+)?) (\w+) to (\w+)/);
  if (!m || a === null) return null;
  const x = Number(m[1]), factor = Math.round((a / x) * 1e6) / 1e6;
  const big = factor >= 1 ? m[2] : m[3], small = factor >= 1 ? m[3] : m[2], f = factor >= 1 ? factor : Math.round((1 / factor) * 1e6) / 1e6;
  return { figure: table([m[2], m[3]], [[`1 ${m[2]}`, `${dec(factor)} ${m[3]}`], [`${dec(x)} ${m[2]}`, `${dec(a)} ${m[3]}`]], `1 ${big} is ${dec(f)} ${small}. So ${dec(x)} ${m[2]} is ${dec(a)} ${m[3]}.`) };
};

const imperialMetric: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/(\d+) (\w+) is about (\d+(?:\.\d+)?) (\w+)\. About how many (\w+) is (\d+) (\w+)/);
  if (!m || a === null) return null;
  const [, n1, u1, n2, u2, , n3, u3] = m;
  const left = u3 === u1 ? [u1, u2] : [u2, u1];
  return { figure: table(left, [[dec(Number(u3 === u1 ? n1 : n2)), dec(Number(u3 === u1 ? n2 : n1))], [n3, dec(a)]], `${n1} ${u1} is about ${n2} ${u2}. So ${n3} ${u3} is about ${dec(a)} ${u3 === u1 ? u2 : u1}.`) };
};

const convertTime: Builder = (q) => {
  const p = plain(q.prompt);
  let m = p.match(/How many minutes are there in (\d+) hours?(?: and (\d+) minutes)?/);
  if (m) { const h = Number(m[1]), r = Number(m[2] ?? 0); return { figure: table(["", "Hours", "Minutes"], [["1 hour", 1, 60], [`${h} hours`, h, h * 60], ...(r ? [["and", "", r], ["Total", "", h * 60 + r]] : [])], `1 hour is 60 minutes, so ${h} hours is ${h * 60} minutes${r ? `, plus ${r} makes ${h * 60 + r}` : ""}.`) }; }
  m = p.match(/How many days are there in (\d+) weeks?(?: and (\d+) days?)?/);
  if (m) { const w = Number(m[1]), r = Number(m[2] ?? 0); return { figure: table(["", "Weeks", "Days"], [["1 week", 1, 7], [`${w} weeks`, w, w * 7], ...(r ? [["and", "", r], ["Total", "", w * 7 + r]] : [])], `1 week is 7 days, so ${w} weeks is ${w * 7} days${r ? `, plus ${r} makes ${w * 7 + r}` : ""}.`) }; }
  return null;
};

// ---------------------------------------------------------------------------------------------- numbers: factors, primes, squares, roman numerals
const romanTokens = (s: string) => [...s.matchAll(/CM|CD|XC|XL|IX|IV|M|D|C|L|X|V|I/g)].map((x) => x[0]);
const ROMAN: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
const roman: Builder = (q) => {
  const s = plain(q.prompt).match(/numeral ([IVXLCDM]+)/)?.[1];
  if (!s) return null;
  const parts = romanTokens(s), total = parts.reduce((t, x) => t + ROMAN[x], 0);
  return { figure: table(["Symbol", "Value"], [...parts.map((x) => [x, ROMAN[x]]), ["Total", total]], `${s} is made of ${parts.map((x) => `${x} (${ROMAN[x]})`).join(", ")}. Together that is ${total}.`) };
};

const factors: Builder = (q) => {
  const p = plain(q.prompt);
  let m = p.match(/How many factors does (\d+) have/);
  if (m) { const n = Number(m[1]), f = factorsOf(n); return { figure: table(["Factor pair", "Product"], f.filter((d) => d <= n / d).map((d) => [`${d} × ${n / d}`, n]), `The factor pairs of ${n}: ${f.filter((d) => d <= n / d).map((d) => `${d} and ${n / d}`).join(", ")}. The factors are ${f.join(", ")}.`) }; }
  m = p.match(/highest common factor of (\d+) and (\d+)/);
  if (m) { const a = Number(m[1]), b = Number(m[2]), fa = factorsOf(a), fb = factorsOf(b), common = fa.filter((x) => fb.includes(x)); return { figure: table(["Number", "Factors"], [[a, fa.join(", ")], [b, fb.join(", ")], ["In both", common.join(", ")], ["Highest", gcd(a, b)]], `Factors of ${a}: ${fa.join(", ")}. Factors of ${b}: ${fb.join(", ")}. In both: ${common.join(", ")}. The highest is ${gcd(a, b)}.`) }; }
  m = p.match(/lowest common multiple of (\d+) and (\d+)/);
  if (m) { const a = Number(m[1]), b = Number(m[2]), l = (a / gcd(a, b)) * b, list = (n: number) => Array.from({ length: l / n }, (_, i) => (i + 1) * n).join(", "); return { figure: table(["Number", "Multiples"], [[a, list(a)], [b, list(b)], ["First in both", l]], `Multiples of ${a}: ${list(a)}. Multiples of ${b}: ${list(b)}. The first one in both lists is ${l}.`) }; }
  return null;
};

const primesSquares: Builder = (q) => {
  const p = plain(q.prompt), a = val(q);
  let m = p.match(/What is (\d+) squared/);
  if (m) { const n = Number(m[1]); return n <= 12 ? { figure: { type: "array", rows: n, cols: n, alt: `A square of dots, ${n} rows of ${n}. ${n * n} dots altogether.` } } : null; }
  m = p.match(/smallest prime number that is bigger than (\d+)/);
  if (m && a !== null) { const rows: (string | number)[][] = []; for (let n = Number(m[1]) + 1; n <= a; n++) { const f = factorsOf(n); rows.push([n, f.length === 2 ? "1 × " + n : `${f[1]} × ${n / f[1]}`, f.length === 2 ? "prime" : "no"]); } return { figure: table(["Number", "A factor pair", "Prime?"], rows, `Checking the numbers after ${m[1]} until the first prime, ${a}.`) }; }
  m = p.match(/prime numbers are there between (\d+) and (\d+)/);
  if (m) { const lo = Number(m[1]), hi = Number(m[2]), ps = Array.from({ length: hi - lo - 1 }, (_, i) => lo + 1 + i).filter((n) => n > 1 && factorsOf(n).length === 2); return { figure: table(["Between", "Primes"], [[`${lo} and ${hi}`, ps.join(", ")], ["How many", ps.length]], `The primes between ${lo} and ${hi} are ${ps.join(", ")}: ${ps.length} of them.`) }; }
  return null;
};

// ---------------------------------------------------------------------------------------------- patterns, averages, data, missing numbers
const averages: Builder = (q) => {
  const p = plain(q.prompt), m = p.match(/(?:of|these numbers):\s*([\d, ]+)\./);
  if (!m) return null;
  const nums = m[1].split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));
  if (nums.length < 3 || nums.length > 12) return null;
  const sorted = [...nums].sort((x, y) => x - y), median = /median/.test(p), range = /range/.test(p);
  const items = median || range ? sorted : nums;
  return { figure: { type: "list-boxes", items, alt: `The numbers${median || range ? " in order" : ""}: ${items.join(", ")}.${median ? ` The middle one is ${sorted[Math.floor(sorted.length / 2)]}.` : ""}${range ? ` The biggest is ${sorted[sorted.length - 1]} and the smallest is ${sorted[0]}.` : ""}` } };
};

const readTables: Builder = (q) => {
  const p = plain(q.prompt), pairs = [...p.matchAll(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (\d+)/g)].map((x) => [x[1], Number(x[2])] as const);
  if (pairs.length < 3) return null;
  return { figure: table(["Day", "Number"], pairs.map(([d, n]) => [d, n]), `A table: ${pairs.map(([d, n]) => `${d} ${n}`).join(", ")}.`) };
};

const missingNumber: Builder = (q) => {
  const p = clean(q.prompt), a = val(q);
  if (a === null) return null;
  let m = p.match(/\\square \\times (\d+) = (\d+)/) ?? p.match(/(\d+) \\times \\square = (\d+)/);
  if (m) { const k = Number(m[1]), total = Number(m[2]); return k <= 12 ? { figure: { type: "bar-model", rows: [{ label: `${k} equal parts make ${total}`, segments: Array.from({ length: k }, () => ({ label: "?", tone: "a" as const })), note: `${total}` }], alt: `A bar of ${total} split into ${k} equal parts, each the missing number, ${a}.` } } : null; }
  m = p.match(/\\square \+ (\d+) = (\d+)/) ?? p.match(/(\d+) \+ \\square = (\d+)/);
  if (m) { const k = Number(m[1]), total = Number(m[2]); return { figure: { type: "bar-model", rows: [{ label: `the whole is ${total}`, segments: [{ label: String(k), size: k, tone: "b" as const }, { label: "?", size: total - k, tone: "a" as const }], note: `${total}` }], alt: `A bar of ${total} made of ${k} and the missing number, ${a}.` } }; }
  m = p.match(/\\square - (\d+) = (\d+)/);
  if (m) { const k = Number(m[1]), r = Number(m[2]); return { figure: { type: "bar-model", rows: [{ label: "start (the missing number)", segments: [{ label: String(r), size: r, tone: "a" as const }, { label: `−${k}`, size: k, tone: "c" as const }], note: `${r + k}` }], alt: `A bar for the missing number, ${a}, made of what is left, ${r}, and what was taken away, ${k}.` } }; }
  m = p.match(/\(\\square \+ (\d+)\) \\div (\d+) = (\d+)/);
  if (m) { const add = Number(m[1]), k = Number(m[2]), each = Number(m[3]), total = k * each; return k <= 12 ? { figure: { type: "bar-model", rows: [{ label: `${k} groups of ${each}`, segments: Array.from({ length: k }, () => ({ label: String(each), tone: "b" as const })), note: `${total}` }, { label: "the same total", segments: [{ label: "?", size: total - add, tone: "a" as const }, { label: String(add), size: add, tone: "c" as const }], note: `${total}` }], alt: `A bar of ${total} made of ${k} groups of ${each}. The same bar is the missing number, ${a}, and ${add}.` } } : null; }
  m = p.match(/(\d+) \\times \\square \+ (\d+) = (\d+)/);
  if (m) { const k = Number(m[1]), add = Number(m[2]), total = Number(m[3]); return k <= 12 ? { figure: { type: "bar-model", rows: [{ label: `${total}`, segments: [...Array.from({ length: k }, () => ({ label: "?", tone: "a" as const })), { label: String(add), tone: "b" as const, size: Math.max(1, add / Math.max(1, (total - add) / k)) }], note: `${total} in all` }], alt: `A bar of ${total}: ${k} equal parts, each the missing number ${a}, and ${add} more.` } } : null; }
  return null;
};

export const MORE_BUILDERS: Record<string, Builder> = {
  "coins-notes": coinsNotes, "pounds-pence": poundsPence, "shopping-bills": bill, "best-value": bestValue, "currency-exchange": currency, "multiply-divide-money": multiplyDivideMoney,
  "measures-convert": measuresConvert, "imperial-metric": imperialMetric, "convert-time": convertTime, "roman-numerals": roman, "factors-multiples": factors,
  "primes-squares-cubes": primesSquares, averages, "read-tables": readTables, "missing-number-eq": missingNumber,
};

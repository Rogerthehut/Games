import { describe, expect, it } from "vitest";
import { SKILL_BY_ID } from "../curriculum";
import { mulberry32 } from "./rng";
import { busStopWork, columnWork, gridWork } from "./worked";

const col = (w: ReturnType<typeof columnWork>) => w.figure as Extract<typeof w.figure, { type: "column-sum" }>;
const random = mulberry32(99);
const rnd = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));

describe("column addition", () => {
  it("shows 376 + 238 with the carries", () => {
    const w = columnWork(376, 238, "+"), f = col(w);
    expect(f.result).toBe("614");
    expect(f.carries).toEqual(["1", "1", ""]); // each carry is written under the next column to the left: 1 under the hundreds and 1 under the tens
    expect(w.steps.join(" ")).toMatch(/Ones: \$6 \+ 8 = 14\$.*carry \$1\$ into the tens/);
    expect(w.steps.join(" ")).toMatch(/Tens: \$7 \+ 3 \+ 1 = 11\$/);
  });
  it("is right for many sums: each column's digits plus its carry make the answer's digit and the next carry", () => {
    for (let n = 0; n < 500; n++) {
      const a = rnd(100, 89999), b = rnd(100, 89999), f = col(columnWork(a, b, "+"));
      const N = f.carries.length, t = f.top.padStart(N, "0"), u = f.bottom.padStart(N, "0"), r = f.result.padStart(N, "0");
      expect(f.result, `${a}+${b}`).toBe(String(a + b));
      let carry = 0;
      for (let i = N - 1; i >= 0; i--) {
        const sum = Number(t[i]) + Number(u[i]) + carry;
        expect(sum % 10, `${a}+${b} column ${i}`).toBe(Number(r[i]));
        carry = Math.floor(sum / 10);
        if (i > 0) expect(f.carries[i - 1] || "0", `${a}+${b} carry`).toBe(String(carry));
      }
    }
  });
  it("carries into a new leading column", () => {
    const w = columnWork(950, 70, "+"); expect(col(w).result).toBe("1020"); expect(w.steps.join(" ")).toMatch(/bring down the carried \$1\$/);
  });
});

describe("column subtraction", () => {
  it("shows 376 - 238 with the exchange", () => {
    const w = columnWork(376, 238, "-"), f = col(w);
    expect(f.result).toBe("138");
    expect(f.exchanges).toEqual([null, { was: "7", now: "6" }, { was: "6", now: "16" }]);
    expect(w.steps.join(" ")).toMatch(/Ones: \$6\$ is too small to take away \$8\$, so exchange 1 ten for 10 ones. Now \$16 - 8 = 8\$/);
    expect(w.steps.join(" ")).toMatch(/Tens: after the exchange there are \$6\$ left, so \$6 - 3 = 3\$/);
  });
  it("passes an exchange across zeros: 4003 - 1865", () => {
    const f = col(columnWork(4003, 1865, "-"));
    expect(f.result).toBe("2138");
    expect(f.exchanges.map((e) => e?.now ?? null)).toEqual(["3", "9", "9", "13"]);
  });
  it("is right for many sums: after the exchanges every column takes away to the answer's digit", () => {
    for (let n = 0; n < 800; n++) {
      let a = rnd(100, 89999), b = rnd(10, 89999); if (a < b) [a, b] = [b, a]; if (a === b) a++;
      const w = columnWork(a, b, "-"), f = col(w), N = f.top.length;
      const t = f.top, u = f.bottom.padStart(N, "0"), r = f.result.padStart(N, "0");
      expect(f.result).toBe(String(a - b));
      for (let i = 0; i < N; i++) {
        const working = f.exchanges[i] ? Number(f.exchanges[i]!.now) : Number(t[i]);
        expect(working - Number(u[i]), `${a}-${b} column ${i}`).toBe(Number(r[i]));
        expect(working - Number(u[i])).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("grid method", () => {
  it("has a box for every pair of parts, and they add to the answer", () => {
    for (let n = 0; n < 200; n++) {
      const a = rnd(12, 499), b = rnd(2, 39), f = gridWork(a, b).figure as Extract<ReturnType<typeof gridWork>["figure"], { type: "table" }>;
      const sum = f.rows.reduce((t, row) => t + row.slice(1).reduce((x: number, c) => x + Number(c), 0), 0);
      expect(sum, `${a}x${b}`).toBe(a * b);
    }
  });
});

describe("bus stop", () => {
  it("finds the quotient and remainder, and each carry is the remainder from the digit before", () => {
    for (let n = 0; n < 500; n++) {
      const d = rnd(2, 9), x = rnd(20, 999), w = busStopWork(x, d), f = w.figure as Extract<typeof w.figure, { type: "bus-stop" }>;
      expect(w.quotient).toBe(Math.floor(x / d)); expect(w.remainder).toBe(x % d);
      expect(Number(f.quotient)).toBe(Math.floor(x / d));
      let rem = 0;
      [...f.digits].forEach((dg, i) => { if (i > 0) expect(f.carries[i] || "0", `${x}/${d}`).toBe(String(rem)); rem = (rem * 10 + Number(dg)) % d; });
    }
  });
});

describe("the questions that use them", () => {
  const worked = (id: string, level: number, n = 60) => Array.from({ length: n }, (_, i) => SKILL_BY_ID[id].generate(mulberry32(1000 + i), level));
  it("addition and subtraction show the column method and its answer matches", () => {
    for (const level of [1, 2, 3]) for (const q of worked("add-sub", level)) {
      expect(q.worked?.type).toBe("column-sum");
      expect(Number((q.worked as { result: string }).result)).toBe((q.answer as { value: number }).value);
      expect(q.solution.some((s) => /Ones:/.test(s))).toBe(true);
      expect(q.solution.join(" ")).not.toMatch(/Column method, starting with the ones/);
    }
  });
  it("written multiplication shows a grid", () => {
    for (const level of [1, 2, 3]) for (const q of worked("mult-written", level)) expect(q.worked?.type).toBe("table");
  });
  it("short division shows a bus stop with the right answer", () => {
    for (const level of [1, 2]) for (const q of worked("division", level)) {
      expect(q.worked?.type).toBe("bus-stop");
      const a = q.answer;
      const quotient = a.kind === "multi" ? a.fields[0].value : (a as { value: number }).value;
      expect(Number((q.worked as { quotient: string }).quotient)).toBe(quotient);
    }
  });
});

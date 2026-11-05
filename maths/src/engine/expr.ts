import { Poly, trim, add, sub, mul, scale, eq } from "./poly";

export type Node =
  | { t: "num"; v: number }
  | { t: "var"; n: string }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node };

export class ParseError extends Error {}

function normalise(s: string): string {
  return s
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\s+/g, "");
}

function tokenise(s: string): string[] {
  const toks: string[] = [];
  const re = /(\d+\.?\d*|\.\d+|[a-z]|[-+*/^()])/gy;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) throw new ParseError(`Unexpected "${s[i]}"`);
    toks.push(m[0]);
    i = re.lastIndex;
  }
  return toks;
}

export function parse(input: string): Node {
  const toks = tokenise(normalise(input).toLowerCase());
  if (!toks.length) throw new ParseError("Empty");
  let i = 0;
  const peek = () => toks[i];
  const isNum = (t?: string) => !!t && /^[\d.]/.test(t);
  const isVar = (t?: string) => !!t && /^[a-z]$/.test(t);

  function expr(): Node {
    let n = term();
    while (peek() === "+" || peek() === "-") {
      const op = toks[i++] as "+" | "-";
      n = { t: "bin", op, a: n, b: term() };
    }
    return n;
  }
  function term(): Node {
    let n = unary();
    for (;;) {
      const p = peek();
      if (p === "*" || p === "/") {
        i++;
        n = { t: "bin", op: p, a: n, b: unary() };
      } else if (isVar(p) || p === "(") {
        n = { t: "bin", op: "*", a: n, b: power() }; // implicit multiplication: 2x, 3(x+1)
      } else break;
    }
    return n;
  }
  function unary(): Node {
    if (peek() === "-") { i++; return { t: "neg", a: unary() }; }
    if (peek() === "+") { i++; return unary(); }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (peek() === "^") {
      i++;
      let neg = false;
      if (peek() === "-") { i++; neg = true; }
      const e = atom();
      return { t: "bin", op: "^", a: base, b: neg ? { t: "neg", a: e } : e };
    }
    return base;
  }
  function atom(): Node {
    const t = toks[i++];
    if (t === undefined) throw new ParseError("Unfinished");
    if (isNum(t)) return { t: "num", v: parseFloat(t) };
    if (isVar(t)) return { t: "var", n: t };
    if (t === "(") {
      const n = expr();
      if (toks[i++] !== ")") throw new ParseError("Missing )");
      return n;
    }
    throw new ParseError(`Unexpected "${t}"`);
  }

  const n = expr();
  if (i < toks.length) throw new ParseError(`Unexpected "${toks[i]}"`);
  return n;
}

const hasVar = (n: Node): boolean =>
  n.t === "var" ? true : n.t === "num" ? false : n.t === "neg" ? hasVar(n.a) : hasVar(n.a) || hasVar(n.b);

/** Evaluate a number-only expression like 3/4 or -0.5. Returns null if it has letters or is undefined. */
export function evalNumber(n: Node): number | null {
  if (hasVar(n)) return null;
  const go = (m: Node): number => {
    switch (m.t) {
      case "num": return m.v;
      case "neg": return -go(m.a);
      case "var": return NaN;
      case "bin": {
        const a = go(m.a), b = go(m.b);
        return m.op === "+" ? a + b : m.op === "-" ? a - b : m.op === "*" ? a * b : m.op === "/" ? a / b : Math.pow(a, b);
      }
    }
  };
  const v = go(n);
  return Number.isFinite(v) ? v : null;
}

/** Convert to a polynomial in x, or null if it isn't one (other letters, dividing by x, etc.). */
export function toPoly(n: Node): Poly | null {
  switch (n.t) {
    case "num": return [n.v];
    case "var": return n.n === "x" ? [0, 1] : null;
    case "neg": { const a = toPoly(n.a); return a && scale(a, -1); }
    case "bin": {
      if (n.op === "^") {
        const e = evalNumber(n.b);
        const a = toPoly(n.a);
        if (a === null || e === null || !Number.isInteger(e) || e < 0 || e > 12) return null;
        let out: Poly = [1];
        for (let k = 0; k < e; k++) out = mul(out, a);
        return out;
      }
      const a = toPoly(n.a), b = toPoly(n.b);
      if (!a || !b) return null;
      if (n.op === "+") return add(a, b);
      if (n.op === "-") return sub(a, b);
      if (n.op === "*") return mul(a, b);
      const d = trim(b);
      return d.length === 1 && d[0] !== 0 ? scale(a, 1 / d[0]) : null;
    }
  }
}

export const polyOf = (s: string): Poly | null => {
  try { return toPoly(parse(s)); } catch { return null; }
};
export const numberOf = (s: string): number | null => {
  try { return evalNumber(parse(s)); } catch { return null; }
};
export const samePoly = (a: Poly, b: Poly) => eq(a, b);

/** Is the input written as a product (brackets), not a sum? e.g. (x+2)(x+3) yes, x^2+5x+6 no. */
export function isFactorised(n: Node): boolean {
  if (n.t === "neg") return isFactorised(n.a);
  return n.t === "bin" && (n.op === "*" || n.op === "^") && !(n.a.t === "num" && n.b.t === "var");
}

function terms(n: Node): Node[] {
  if (n.t === "bin" && (n.op === "+" || n.op === "-")) return [...terms(n.a), ...terms(n.b)];
  return [n];
}
const isMonomial = (n: Node): boolean =>
  n.t === "num" || n.t === "var"
    ? true
    : n.t === "neg"
      ? isMonomial(n.a)
      : n.op === "+" || n.op === "-"
        ? false
        : isMonomial(n.a) && isMonomial(n.b);

/** Fully expanded and collected: no brackets of sums, and no repeated powers of x. */
export function isCollected(n: Node): boolean {
  const ts = terms(n);
  if (!ts.every(isMonomial)) return false;
  const degs = ts.map((t) => toPoly(t)).map((p) => (p ? p.length - 1 : -1));
  return new Set(degs).size === degs.length;
}

export function toLatexNode(n: Node): string {
  const prec = (m: Node): number =>
    m.t === "num" || m.t === "var" ? 9 : m.t === "neg" ? 4 : m.op === "^" ? 8 : m.op === "*" || m.op === "/" ? 6 : 3;
  const wrap = (m: Node, min: number) => (prec(m) < min ? `\\left(${toLatexNode(m)}\\right)` : toLatexNode(m));
  switch (n.t) {
    case "num": return String(n.v);
    case "var": return n.n;
    case "neg": return `-${wrap(n.a, 6)}`;
    case "bin":
      switch (n.op) {
        case "+": return `${toLatexNode(n.a)} + ${toLatexNode(n.b)}`;
        case "-": return `${toLatexNode(n.a)} - ${wrap(n.b, 4)}`;
        case "/": return `\\frac{${toLatexNode(n.a)}}{${toLatexNode(n.b)}}`;
        case "^": return `${wrap(n.a, 9)}^{${toLatexNode(n.b)}}`;
        case "*": {
          const implicit = n.b.t === "var" || (n.b.t === "bin" && n.b.op !== "*" && prec(n.b) < 6) || (n.b.t === "bin" && n.b.op === "^" && n.b.a.t === "var");
          return implicit ? `${wrap(n.a, 6)}${wrap(n.b, 6)}` : `${wrap(n.a, 6)} \\times ${wrap(n.b, 7)}`;
        }
      }
  }
}

/** LaTeX preview of whatever the student has typed, or null if it can't be read yet. */
export function previewLatex(input: string): string | null {
  if (!input.trim()) return null;
  try { return toLatexNode(parse(input)); } catch { return null; }
}

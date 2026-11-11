import type { FigureId } from "./types";

/**
 * The pictures, drawn as plain SVG text. The same drawings are used inside the app and on the public study pages.
 * They only use currentColor and the app's colour variables, so they follow light and dark mode.
 */
const INK = "currentColor";
const CREAM = "#fff7e4";
const ACCENT = "var(--accent, #3b4a8f)";
const PINK = "#f6a0bc", MINT = "#84d8ba", PERI = "#c1c5ee", GOLD = "#f0be65";

const open = (w: number, h: number, label: string) =>
  `<svg class="concept-fig" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="inherit" font-size="14" stroke-linecap="round" stroke-linejoin="round">`;
const text = (x: number, y: number, t: string | number, o: { size?: number; weight?: number; anchor?: string; fill?: string } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? "middle"}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 600}" fill="${o.fill ?? INK}" stroke="none">${t}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, o: { w?: number; stroke?: string; dash?: string } = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke ?? INK}" stroke-width="${o.w ?? 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""} fill="none"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, o: { r?: number; stroke?: string; sw?: number } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 4}" fill="${fill}" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? 2}"/>`;
const circle = (x: number, y: number, r: number, fill: string, o: { stroke?: string; sw?: number } = {}) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? 2}"/>`;
const poly = (pts: [number, number][], fill: string, sw = 2) => `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;

const choose = (n: number, k: number) => { let v = 1; for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i; return Math.round(v); };

/** Pascal's triangle with `rows` rows (row 0 is the single 1). `hi` highlights one row. */
export function pascalTriangle(rows = 6, hi = -1): string {
  const cw = 44, ch = 34, W = rows * cw + 20, H = rows * ch + 20;
  let s = open(W, H, `Pascal's triangle with ${rows} rows`);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k <= r; k++) {
      const x = W / 2 + (k - r / 2) * cw, y = 10 + r * ch + ch / 2;
      s += rect(x - 18, y - 14, 36, 28, r === hi ? PINK : CREAM, { r: 8, sw: r === hi ? 2.5 : 1.5 });
      s += text(x, y + 5, choose(r, k), { size: 15, fill: "#18192b" });
    }
  }
  return s + "</svg>";
}

/** A factor tree for n: split into the smallest prime and the rest until only primes are left. */
export function factorTree(n = 60): string {
  type Node = { n: number; kids: Node[] };
  const smallest = (v: number) => { for (let p = 2; p * p <= v; p++) if (v % p === 0) return p; return v; };
  const build = (v: number): Node => { const p = smallest(v); return p === v ? { n: v, kids: [] } : { n: v, kids: [build(p), build(v / p)] }; };
  const tree = build(n);
  const leaves = (t: Node): number => (t.kids.length ? t.kids.reduce((a, k) => a + leaves(k), 0) : 1);
  const depth = (t: Node): number => 1 + (t.kids.length ? Math.max(...t.kids.map(depth)) : 0);
  const cw = 56, ch = 52, W = leaves(tree) * cw + 20, H = depth(tree) * ch + 10;
  let edges = "", nodes = "", next = 0;
  const place = (t: Node, d: number): number => {
    let x: number;
    if (!t.kids.length) { x = 10 + cw / 2 + next++ * cw; }
    else { const xs = t.kids.map((k) => place(k, d + 1)); x = (xs[0] + xs[xs.length - 1]) / 2; t.kids.forEach((_, i) => { edges += line(x, 5 + d * ch + 20, xs[i], 5 + (d + 1) * ch + 2, { w: 1.8 }); }); }
    const y = 5 + d * ch + 18, prime = !t.kids.length;
    nodes += circle(x, y, 18, prime ? MINT : CREAM, { sw: prime ? 2.5 : 1.8 }) + text(x, y + 5, t.n, { size: 14, fill: "#18192b" });
    return x;
  };
  place(tree, 0);
  return open(W, H, `Factor tree of ${n}`) + edges + nodes + "</svg>";
}

/** A place value chart for a number up to 7 digits, with the value of each digit. */
export function placeValueChart(n = 4573): string {
  const digits = String(n).split(""), names = ["Millions", "Hundred thousands", "Ten thousands", "Thousands", "Hundreds", "Tens", "Ones"].slice(7 - digits.length);
  const short = ["M", "HTh", "TTh", "Th", "H", "T", "O"].slice(7 - digits.length);
  const cw = 64, W = digits.length * cw + 20, H = 150;
  let s = open(W, H, `Place value chart for ${n}`);
  digits.forEach((d, i) => {
    const x = 10 + i * cw, power = digits.length - 1 - i, value = Number(d) * 10 ** power;
    s += rect(x, 8, cw - 6, 34, GOLD, { r: 6 }) + text(x + (cw - 6) / 2, 31, short[i], { size: 14, fill: "#18192b" });
    s += rect(x, 48, cw - 6, 46, CREAM, { r: 6 }) + text(x + (cw - 6) / 2, 80, d, { size: 28, fill: "#18192b" });
    s += text(x + (cw - 6) / 2, 118, value.toLocaleString("en-GB"), { size: 13 });
  });
  void names;
  return s + text(W / 2, 142, `${n.toLocaleString("en-GB")}`, { size: 14, weight: 700 }) + "</svg>";
}

/** Three bars that show 1/2, 2/4 and 4/8 are the same size. */
export function fractionBars(): string {
  const W = 320, H = 170, rows: [number, number][] = [[1, 2], [2, 4], [4, 8]];
  let s = open(W, H, "Bars showing one half, two quarters and four eighths are the same size");
  rows.forEach(([n, d], r) => {
    const y = 12 + r * 50, w = 220 / d;
    for (let i = 0; i < d; i++) s += rect(70 + i * w, y, w, 34, i < n ? PINK : CREAM, { r: 3, sw: 1.8 });
    s += text(34, y + 24, `${n}/${d}`, { size: 16, weight: 700 });
  });
  return s + "</svg>";
}

/** A rows × columns array of dots, to see multiplication as equal groups. */
export function dotArray(rows = 4, cols = 6): string {
  const g = 30, W = cols * g + 90, H = rows * g + 50;
  let s = open(W, H, `${rows} rows of ${cols} dots`);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += circle(45 + c * g, 20 + r * g, 10, r % 2 ? MINT : PINK, { sw: 1.8 });
  s += text(W / 2, H - 12, `${rows} × ${cols} = ${rows * cols}`, { size: 17, weight: 700 });
  return s + "</svg>";
}

/** A number line from −5 to 5, showing a start, a move and an end (for example 2 − 5 = −3). */
export function numberLine(start = 2, move = -5): string {
  const W = 400, H = 120, x = (v: number) => 20 + (v + 5) * 36, end = start + move;
  let s = open(W, H, `Number line showing ${start} ${move < 0 ? "−" : "+"} ${Math.abs(move)} = ${end}`);
  s += line(14, 80, 386, 80, { w: 2.5 });
  for (let v = -5; v <= 5; v++) { s += line(x(v), 72, x(v), 88, { w: 2 }) + text(x(v), 108, v < 0 ? `−${-v}` : v, { size: 13, weight: v === 0 ? 800 : 600 }); }
  const mid = (x(start) + x(end)) / 2, up = move < 0 ? 18 : 18;
  s += `<path d="M ${x(start)} 70 Q ${mid} ${70 - up * 2} ${x(end)} 70" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`;
  s += circle(x(start), 80, 7, GOLD) + circle(x(end), 80, 7, PINK);
  s += text(mid, 26, `${start} ${move < 0 ? "−" : "+"} ${Math.abs(move)} = ${end < 0 ? "−" + -end : end}`, { size: 16, weight: 700 });
  return s + "</svg>";
}

/** A hundred square with `percent` squares shaded. */
export function hundredSquare(percent = 35): string {
  const c = 22, W = 10 * c + 20, H = 10 * c + 44;
  let s = open(W, H, `A hundred square with ${percent} squares shaded, which is ${percent}%`);
  for (let i = 0; i < 100; i++) s += rect(10 + (i % 10) * c, 8 + Math.floor(i / 10) * c, c - 2, c - 2, i < percent ? PINK : CREAM, { r: 2, sw: 1.2 });
  return s + text(W / 2, H - 10, `${percent} out of 100 = ${percent}% = ${percent / 100}`, { size: 15, weight: 700 }) + "</svg>";
}

/** A triangle with its three angles, which add up to 180°. */
export function triangleAngles(a = 50, b = 60): string {
  const c = 180 - a - b, W = 340, H = 220;
  const P: [number, number] = [30, 170], Q: [number, number] = [310, 170], R: [number, number] = [30 + 280 * 0.38, 40];
  let s = open(W, H, `A triangle with angles ${a}, ${b} and ${c} degrees`);
  s += poly([P, Q, R], CREAM, 2.5);
  s += text(P[0] + 36, P[1] - 8, `${a}°`, { size: 15, weight: 700 }) + text(Q[0] - 40, Q[1] - 8, `${b}°`, { size: 15, weight: 700 }) + text(R[0], R[1] + 34, `${c}°`, { size: 15, weight: 700 });
  s += text(W / 2, 205, `${a} + ${b} + ${c} = 180`, { size: 15, weight: 700 });
  return s + "</svg>";
}

/** A 3-4-5 right-angled triangle with a square on each side: 9 + 16 = 25. */
export function pythagorasFigure(): string {
  let s = open(250, 230, "A right-angled triangle with squares on each side. The two small squares have areas 9 and 16, and the big one 25");
  const A: [number, number] = [90, 150], B: [number, number] = [150, 150], C: [number, number] = [90, 70];
  s += poly([[90, 150], [150, 150], [150, 210], [90, 210]], PERI) + poly([[90, 70], [90, 150], [10, 150], [10, 70]], MINT) + poly([[150, 150], [90, 70], [170, 10], [230, 90]], PINK);
  s += poly([A, B, C], CREAM, 2.5) + rect(90, 140, 10, 10, "none", { r: 0, sw: 1.5 });
  s += text(120, 188, "9", { size: 18, fill: "#18192b" }) + text(50, 116, "16", { size: 18, fill: "#18192b" }) + text(160, 86, "25", { size: 18, fill: "#18192b" });
  s += text(120, 142, "3", { size: 13 }) + text(82, 114, "4", { size: 13, anchor: "end" });
  return s + "</svg>";
}

/** A circle with its radius, diameter and circumference marked. */
export function circleParts(): string {
  const cx = 150, cy = 110, r = 80;
  let s = open(300, 220, "A circle with the radius, diameter and circumference marked");
  s += circle(cx, cy, r, CREAM, { sw: 2.5 });
  s += line(cx - r, cy, cx + r, cy, { w: 2, stroke: ACCENT }) + line(cx, cy, cx + r * 0.7, cy - r * 0.7, { w: 2.5, stroke: "#c2410c" });
  s += circle(cx, cy, 4, INK);
  s += text(cx - 40, cy + 20, "diameter", { size: 13 }) + text(cx + 58, cy - 46, "radius", { size: 13, anchor: "start" }) + text(cx, 210, "circumference = the distance around", { size: 13 });
  return s + "</svg>";
}

const gx = (x: number) => 150 + x * 25, gy = (y: number) => 120 - y * 20;

/** A straight line on a grid, with its rise and run: y = 2x + 1. */
export function gradientGraph(m = 2, c = 1): string {
  let s = open(300, 240, `The line y = ${m}x + ${c}`);
  s += line(20, 120, 280, 120, { w: 1.5 }) + line(150, 10, 150, 230, { w: 1.5 });
  for (let i = -5; i <= 5; i++) if (i) s += line(gx(i), 116, gx(i), 124, { w: 1 }) + line(144, gy(i), 156, gy(i), { w: 1 });
  const reach = Math.min(4, Math.floor((5.5 - Math.abs(c)) / Math.max(Math.abs(m), 0.5) * 2) / 2);
  s += line(gx(-reach), gy(m * -reach + c), gx(reach), gy(m * reach + c), { w: 3, stroke: ACCENT });
  s += line(gx(0), gy(c), gx(1), gy(c), { w: 2, stroke: "#c2410c", dash: "4 3" }) + line(gx(1), gy(c), gx(1), gy(c + m), { w: 2, stroke: "#c2410c", dash: "4 3" });
  s += circle(gx(0), gy(c), 5, GOLD) + text(gx(0) - 14, gy(c) + 4, `${c}`, { size: 13 }) + text(gx(0.5), gy(c) + 16, "1", { size: 12 }) + text(gx(1) + 12, gy(c + m / 2) + 4, `${m}`, { size: 12 });
  s += text(250, 40, `y = ${m}x + ${c}`, { size: 15, weight: 700 });
  return s + "</svg>";
}

/** The curve y = x² − 4x + 3 with its roots and turning point. */
export function parabola(): string {
  const f = (x: number) => x * x - 4 * x + 3, X = (x: number) => 40 + x * 55, Y = (y: number) => 92 - y * 22;
  let s = open(300, 150, "The curve y = x squared minus 4x plus 3, crossing the x-axis at 1 and 3, with its lowest point at 2, minus 1");
  s += line(20, Y(0), 290, Y(0), { w: 1.5 });
  s += line(X(2), 8, X(2), 140, { w: 1.5, dash: "5 4" }) + text(X(2) + 8, 20, "line of symmetry", { size: 12, anchor: "start" });
  const pts: string[] = [];
  for (let x = -0.2; x <= 4.2; x += 0.1) pts.push(`${x === -0.2 ? "M" : "L"} ${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`);
  s += `<path d="${pts.join(" ")}" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;
  s += circle(X(1), Y(0), 6, GOLD) + circle(X(3), Y(0), 6, GOLD) + circle(X(2), Y(-1), 6, PINK);
  s += text(X(1), Y(0) - 12, "1", { size: 13 }) + text(X(3), Y(0) - 12, "3", { size: 13 }) + text(X(2), Y(-1) + 22, "lowest point (2, −1)", { size: 13 });
  return s + "</svg>";
}

/** A probability tree for two picks without replacement from 3 red and 2 blue counters. */
export function probabilityTree(): string {
  let s = open(380, 240, "A tree diagram for taking two counters from a bag of 3 red and 2 blue, without putting the first one back");
  const root: [number, number] = [20, 120];
  const mid: [number, number][] = [[150, 60], [150, 180]];
  const end: [number, number][] = [[300, 25], [300, 95], [300, 145], [300, 215]];
  mid.forEach((m, i) => { s += line(root[0], root[1], m[0], m[1]); s += text((root[0] + m[0]) / 2 - 8, (root[1] + m[1]) / 2 + (i ? 18 : -10), i ? "2/5" : "3/5", { size: 13 }); });
  const probs = ["2/4", "2/4", "3/4", "1/4"], names = ["R R", "R B", "B R", "B B"];
  end.forEach((e, i) => { const m = mid[Math.floor(i / 2)]; s += line(m[0], m[1], e[0], e[1]); s += text((m[0] + e[0]) / 2, (m[1] + e[1]) / 2 + (i % 2 ? 16 : -6), probs[i], { size: 13 }); s += text(e[0] + 38, e[1] + 5, names[i], { size: 14, weight: 700 }); });
  s += circle(150, 60, 14, PINK) + text(150, 65, "R", { size: 13, fill: "#18192b" }) + circle(150, 180, 14, PERI) + text(150, 185, "B", { size: 13, fill: "#18192b" });
  return s + text(20, 112, "start", { size: 12, anchor: "start" }) + "</svg>";
}

/** The curve y = x² with its tangent at x = 1, which has gradient 2. */
export function tangentFigure(): string {
  const X = (x: number) => 150 + x * 45, Y = (y: number) => 190 - y * 36;
  let s = open(300, 230, "The curve y = x squared with a straight tangent line touching it at x = 1, where the gradient is 2");
  s += line(20, 190, 285, 190, { w: 1.5 }) + line(150, 10, 150, 215, { w: 1.5 });
  const pts: string[] = [];
  for (let x = -2.1; x <= 2.1; x += 0.1) pts.push(`${x < -2 ? "M" : "L"} ${X(x).toFixed(1)} ${Y(x * x).toFixed(1)}`);
  s += `<path d="${pts.join(" ")}" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;
  s += line(X(-0.4), Y(2 * -0.4 - 1), X(2.2), Y(2 * 2.2 - 1), { w: 2.5, stroke: "#c2410c" }) + circle(X(1), Y(1), 6, GOLD);
  s += text(X(1) + 52, Y(1) + 14, "gradient = 2", { size: 13 }) + text(40, 34, "y = x²", { size: 15, weight: 700, anchor: "start" });
  return s + "</svg>";
}

/** A row of numbers with the mean, median and mode marked. */
export function averagesFigure(): string {
  const data = [2, 3, 3, 5, 7, 8, 9], W = 360, H = 190, cw = 46;
  let s = open(W, H, "The numbers 2, 3, 3, 5, 7, 8, 9 with the mode 3, the median 5 and the mean 5 marked");
  data.forEach((v, i) => { const x = 22 + i * cw; s += rect(x, 30, cw - 8, 38, v === 3 ? PINK : v === 5 ? MINT : CREAM, { r: 8 }) + text(x + (cw - 8) / 2, 56, v, { size: 18, fill: "#18192b" }); });
  s += text(22 + 1.5 * cw, 100, "mode 3", { size: 13 }) + text(22 + 3 * cw + 19, 100, "median 5", { size: 13 }) + text(W / 2, 140, "mean = (2 + 3 + 3 + 5 + 7 + 8 + 9) ÷ 7 = 37 ÷ 7 ≈ 5.3", { size: 13 }) + text(W / 2, 166, "range = 9 − 2 = 7", { size: 13 });
  return s + "</svg>";
}

export const FIGURES: Record<FigureId, (param?: number) => string> = {
  pascal: (n) => pascalTriangle(7, n ?? -1),
  "factor-tree": (n) => factorTree(n ?? 60),
  "place-value": (n) => placeValueChart(n ?? 4573),
  "fraction-bars": () => fractionBars(),
  array: (n) => dotArray(n ?? 4, 6),
  "number-line": () => numberLine(2, -5),
  "hundred-square": (n) => hundredSquare(n ?? 35),
  "triangle-angles": () => triangleAngles(50, 60),
  pythagoras: () => pythagorasFigure(),
  "circle-parts": () => circleParts(),
  gradient: () => gradientGraph(2, 1),
  parabola: () => parabola(),
  "prob-tree": () => probabilityTree(),
  tangent: () => tangentFigure(),
  averages: () => averagesFigure(),
};

export const figureSvg = (id: FigureId, param?: number) => FIGURES[id](param);

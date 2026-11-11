import type { Figure } from "../engine/types";

/** Builders for the drawings that go with questions. Each one says in words what it shows, for screen readers and for the AI tutor. */
type Pt = [number, number];
const RIGHT = (x: number, y: number, ux: number, uy: number, vx: number, vy: number): [number, number, number, number, number, number] => [x, y, ux, uy, vx, vy];
const cm = (n: number | string) => `${n} cm`;

export const nice = (lo: number, hi: number) => { const span = hi - lo, step = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : span <= 80 ? 10 : 20; return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step }; };
export const sample = (f: (x: number) => number, a: number, b: number, n = 80): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const x = a + ((b - a) * i) / n; return [x, f(x)] as [number, number]; });
export const graph = (curves: { pts: [number, number][]; label?: string; dashed?: boolean }[], xr: [number, number, number], alt: string, extra: { marks?: { x: number; y: number; label?: string }[]; strips?: [number, number][] } = {}): Extract<Figure, { type: "function-graph" }> => {
  const ys = curves.flatMap((c) => c.pts.map((p) => p[1])).concat((extra.marks ?? []).map((m) => m.y), (extra.strips ?? []).map((q) => q[1]), 0), y = nice(Math.min(...ys) - 0.5, Math.max(...ys) + 0.5);
  return { type: "function-graph", xMin: xr[0], xMax: xr[1], xStep: xr[2], yMin: y.lo, yMax: y.hi, yStep: y.step, curves, alt, ...extra };
};

/** A straight line through two points, for gradient and equation questions. */
export function lineGraph(m: number, c: number, x0: number, x1: number, marks: { x: number; y: number; label?: string }[] = [], alt?: string) {
  return graph([{ pts: [[x0, m * x0 + c], [x1, m * x1 + c]] }], [x0, x1, 1], alt ?? `A straight line graph, rising ${m} for each 1 along and crossing the y-axis at ${c}.`, { marks });
}

export function rectFig(w: number, h: number, wl = cm(w), hl = cm(h)): Figure {
  return { type: "polygon", pts: [[0, 0], [w, 0], [w, h], [0, h]], labels: [{ x: w / 2, y: -h * 0.16, text: wl }, { x: w + w * 0.06, y: h / 2, text: hl, anchor: "start" }], rights: [RIGHT(0, 0, 1, 0, 0, 1)], alt: `A rectangle ${wl} long and ${hl} wide.` };
}

/** A triangle from its three sides, with the sides labelled. */
export function triangleSidesFig(a: number, b: number, c: number): Figure {
  const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0.01, b * b - x * x));
  return { type: "polygon", pts: [[0, 0], [c, 0], [x, y]], labels: [{ x: c / 2, y: -y * 0.2, text: cm(c) }, { x: (c + x) / 2 + c * 0.06, y: y / 2 + y * 0.08, text: cm(a), anchor: "start" }, { x: x / 2 - c * 0.06, y: y / 2 + y * 0.08, text: cm(b), anchor: "end" }], alt: `A triangle with sides of ${cm(a)}, ${cm(b)} and ${cm(c)}.` };
}

export function regularPolygonFig(n: number, side: number): Figure {
  const R = 1, pts: Pt[] = Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 + (2 * Math.PI * i) / n + Math.PI / n; return [R * Math.cos(a), R * Math.sin(a)] as Pt; });
  const mx = (pts[0][0] + pts[1][0]) / 2, my = (pts[0][1] + pts[1][1]) / 2;
  return { type: "polygon", pts, labels: [{ x: mx * 1.3, y: my * 1.3, text: cm(side) }], alt: `A regular shape with ${n} equal sides, each ${cm(side)} long.` };
}

export function parallelogramFig(b: number, h: number, slant?: number, heightLabel: string = cm(h), baseLabel: string = cm(b)): Figure {
  const off = Math.max(1, b * 0.25);
  return { type: "polygon", pts: [[0, 0], [b, 0], [b + off, h], [off, h]], dashed: [[off, h, off, 0]], rights: [RIGHT(off, 0, 1, 0, 0, 1)],
    labels: [{ x: b / 2, y: -h * 0.18, text: baseLabel }, { x: off - b * 0.14, y: h / 2, text: heightLabel, anchor: "end" }, ...(slant ? [{ x: b + off * 0.6 + b * 0.05, y: h / 2, text: cm(slant), anchor: "start" as const }] : [])],
    alt: `A parallelogram with a base of ${baseLabel}, a perpendicular height of ${heightLabel}${slant ? ` and a slanted side of ${cm(slant)}` : ""}.` };
}

export function triangleBaseHeightFig(b: number, h: number): Figure {
  const apex = b * 0.3;
  return { type: "polygon", pts: [[0, 0], [b, 0], [apex, h]], dashed: [[apex, h, apex, 0]], rights: [RIGHT(apex, 0, 1, 0, 0, 1)], labels: [{ x: b / 2, y: -h * 0.18, text: cm(b) }, { x: apex + b * 0.03, y: h / 2, text: cm(h), anchor: "start" }], alt: `A triangle with a base of ${cm(b)} and a perpendicular height of ${cm(h)}.` };
}

export function trapeziumFig(top: number, bottom: number, h: number): Figure {
  const s = (bottom - top) / 2;
  return { type: "polygon", pts: [[0, 0], [bottom, 0], [bottom - s, h], [s, h]], dashed: [[s, h, s, 0]], rights: [RIGHT(s, 0, 1, 0, 0, 1)], labels: [{ x: bottom / 2, y: -h * 0.18, text: cm(bottom) }, { x: bottom / 2, y: h * 1.16, text: cm(top) }, { x: s + bottom * 0.03, y: h / 2, text: cm(h), anchor: "start" }], alt: `A trapezium with parallel sides of ${cm(top)} and ${cm(bottom)}, and a perpendicular height of ${cm(h)}.` };
}

/** An L-shape: a w by h rectangle with a cw by ch corner cut from the top right. */
export function lShapeFig(w: number, h: number, cw: number, ch: number): Figure {
  return { type: "polygon", pts: [[0, 0], [w, 0], [w, h - ch], [w - cw, h - ch], [w - cw, h], [0, h]],
    labels: [{ x: w / 2, y: -h * 0.12, text: cm(w) }, { x: -w * 0.04, y: h / 2, text: cm(h), anchor: "end" }, { x: w - cw / 2, y: h + h * 0.1, text: cm(cw) }, { x: w + w * 0.03, y: h - ch / 2, text: cm(ch), anchor: "start" }],
    alt: `An L-shape made from a rectangle ${cm(w)} by ${cm(h)} with a ${cm(cw)} by ${cm(ch)} corner cut out of the top right.` };
}

/** An L-shape given by the outside rectangle only (width and height), with the cut corner unmarked. */
export function lShapeOutsideFig(width: number, height: number, cutW: number, cutH: number): Figure {
  return { type: "polygon", pts: [[0, 0], [width, 0], [width, height - cutH], [width - cutW, height - cutH], [width - cutW, height], [0, height]], dashed: [[width - cutW, height, width, height], [width, height, width, height - cutH]],
    labels: [{ x: width / 2, y: -height * 0.12, text: cm(width) }, { x: -width * 0.04, y: height / 2, text: cm(height), anchor: "end" }], alt: `An L-shape that fits inside a rectangle ${cm(width)} wide and ${cm(height)} tall.` };
}

export function houseFig(w: number, h: number, th: number): Figure {
  return { type: "polygon", pts: [[0, 0], [w, 0], [w, h], [w / 2, h + th], [0, h]], dashed: [[0, h, w, h]], labels: [{ x: w / 2, y: -h * 0.14, text: cm(w) }, { x: w + w * 0.04, y: h / 2, text: cm(h), anchor: "start" }, { x: w / 2 + w * 0.05, y: h + th / 2 - th * 0.05, text: cm(th), anchor: "start" }], alt: `A house shape: a rectangle ${cm(w)} by ${cm(h)} with a triangle on top that has a base of ${cm(w)} and a height of ${cm(th)}.` };
}

export const circleFig = (mode: "radius" | "diameter", label: string): Figure => ({ type: "circle-diagram", mode, label, alt: `A circle with its ${mode} marked and labelled ${label}.` });
export const sectorFig = (angle: number, label: string): Figure => ({ type: "circle-diagram", mode: "sector", angle, label, alt: `A sector of a circle with an angle of ${angle}° and a radius of ${label}.` });

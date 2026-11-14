import { int, pick } from "./rng";

/**
 * The "Little ones" activities (ages 2 to 6): the numbers and pictures behind them, kept apart from the screens so they can be tested.
 * There is no scoring and no wrong answer on screen: a slip just makes things wobble and try again.
 */
export type LittleActivity = "count" | "trace" | "add" | "shapes" | "colour";
export const LITTLE_ACTIVITIES: { id: LittleActivity; title: string; blurb: string }[] = [
  { id: "count", title: "Count with me", blurb: "Tap each one to count it." },
  { id: "trace", title: "Trace the number", blurb: "Draw the number with your finger." },
  { id: "add", title: "Add and take away", blurb: "Ducks come, biscuits go." },
  { id: "shapes", title: "Shape sorter", blurb: "Pop each shape in its hole." },
  { id: "colour", title: "Colour by number", blurb: "Match the number to the colour." },
];

/** How far a little one is: the highest number used, by stage. */
export const littleMax = (early?: "nursery" | "reception") => (early === "nursery" ? 5 : 10);

export interface CountRound { n: number; kind: "star" | "duck" | "apple" | "fish" | "ball" }
export function countRound(r: () => number, max: number): CountRound { return { n: int(r, 1, max), kind: pick(r, ["star", "duck", "apple", "fish", "ball"] as const) }; }

export interface SumRound { op: "add" | "take"; start: number; change: number; result: number }
/** "2 ducks and 1 more" or "3 biscuits, eat 1": the answer never goes above `max` or below 0. */
export function sumRound(r: () => number, max: number): SumRound {
  if (r() < 0.5) { const total = int(r, 2, max), start = int(r, 1, total - 1); return { op: "add", start, change: total - start, result: total }; }
  const start = int(r, 2, max), change = int(r, 1, start - 1 || 1);
  return { op: "take", start, change, result: start - change };
}

// ---- tracing: each digit as strokes in a 100 x 140 box, in the order they are drawn
export type Pt = [number, number];
export const DIGIT_STROKES: Record<number, Pt[][]> = {
  0: [[[50, 10], [22, 30], [14, 70], [22, 110], [50, 130], [78, 110], [86, 70], [78, 30], [50, 10]]],
  1: [[[34, 36], [52, 14], [52, 130]]],
  2: [[[20, 40], [30, 18], [52, 10], [74, 20], [80, 44], [64, 76], [20, 128], [84, 128]]],
  3: [[[22, 24], [46, 10], [72, 22], [72, 54], [46, 68], [74, 84], [78, 110], [54, 130], [22, 118]]],
  4: [[[66, 130], [66, 10], [16, 92], [88, 92]]],
  5: [[[76, 12], [30, 12], [26, 64], [54, 58], [78, 78], [76, 112], [52, 130], [22, 118]]],
  6: [[[72, 18], [44, 12], [22, 44], [18, 90], [34, 126], [62, 128], [80, 104], [70, 76], [44, 70], [22, 88]]],
  7: [[[18, 14], [84, 14], [56, 76], [44, 130]]],
  8: [[[50, 68], [24, 52], [28, 24], [50, 10], [72, 24], [76, 52], [50, 68], [22, 92], [24, 118], [50, 130], [76, 118], [78, 92], [50, 68]]],
  9: [[[78, 52], [58, 68], [32, 62], [22, 36], [42, 12], [68, 20], [80, 48], [74, 92], [56, 126], [28, 128]]],
};

/** Points spaced about `step` apart along a stroke, so a finger's progress can be followed one point at a time. */
export function waypoints(stroke: Pt[], step = 9): Pt[] {
  const out: Pt[] = [stroke[0]];
  for (let i = 1; i < stroke.length; i++) {
    const [x0, y0] = stroke[i - 1], [x1, y1] = stroke[i], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}
/** Moves the "next point to reach" forward while the finger is within `reach` of it (and of the one after, so a quick swipe isn't lost). */
export function advance(points: Pt[], next: number, finger: Pt, reach = 15): number {
  let i = next;
  while (i < points.length && Math.hypot(points[i][0] - finger[0], points[i][1] - finger[1]) <= reach) i++;
  return i;
}

// ---- shape sorter
export type ShapeKind = "circle" | "square" | "triangle" | "star";
export const SHAPES: ShapeKind[] = ["circle", "square", "triangle", "star"];
export function shapeRound(r: () => number, count: number): ShapeKind[] {
  const pool = [...SHAPES]; for (let i = pool.length - 1; i > 0; i--) { const j = int(r, 0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}

// ---- colour by number: a small picture where every cell has a number, and each number has a colour
export interface ColourPicture { name: string; size: number; cells: number[]; palette: Record<number, string> }
export const COLOUR_PICTURES: ColourPicture[] = [
  { name: "a house", size: 6, palette: { 1: "#ef6f6c", 2: "#f5dc63", 3: "#6ab7e8", 4: "#4cc6a7" }, cells: [
    0, 0, 1, 1, 0, 0,
    0, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2,
    2, 3, 2, 2, 3, 2,
    2, 2, 4, 4, 2, 2] },
  { name: "a fish", size: 6, palette: { 1: "#f782a9", 2: "#f5dc63", 3: "#8294e9" }, cells: [
    0, 0, 0, 0, 0, 0,
    1, 0, 2, 2, 2, 0,
    1, 1, 2, 3, 2, 2,
    1, 1, 2, 2, 2, 2,
    1, 0, 2, 2, 2, 0,
    0, 0, 0, 0, 0, 0] },
  { name: "a flower", size: 6, palette: { 1: "#f782a9", 2: "#f5dc63", 3: "#4cc6a7" }, cells: [
    0, 1, 0, 0, 1, 0,
    1, 1, 1, 1, 1, 1,
    0, 1, 2, 2, 1, 0,
    1, 1, 2, 2, 1, 1,
    0, 0, 3, 3, 0, 0,
    0, 3, 3, 3, 3, 0] },
];
export const coloursNeeded = (p: ColourPicture) => [...new Set(p.cells.filter((c) => c > 0))].sort((a, b) => a - b);

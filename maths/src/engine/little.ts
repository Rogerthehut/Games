import { int, pick } from "./rng";

/**
 * The "Little ones" activities (ages 2 to 6): the numbers and pictures behind them, kept apart from the screens so they can be tested.
 * There is no scoring and no wrong answer on screen: a slip just makes things wobble and try again.
 */
export type LittleActivity = "count" | "trace" | "add" | "shapes" | "colour" | "hundred" | "tens" | "snap";
export interface LittleInfo {
  id: LittleActivity; title: string; blurb: string;
  /** What it builds, in plain words for a grown-up. */
  builds: string;
  /** Short teaching note: what the activity is really teaching, and what to look for. */
  teach: string;
  /** How a grown-up can help without taking over. */
  help: string;
  /** A question to ask afterwards. */
  ask: string;
  /** The words for the learner's progress, "finished 3 times". */
  skill: string;
  /** Nursery doesn't get this one. */
  notNursery?: boolean;
}
export const LITTLE_ACTIVITIES: LittleInfo[] = [
  { id: "count", title: "Count with me", blurb: "Tap each one to count it.", skill: "counting objects",
    builds: "One-to-one counting: saying one number for each thing touched, and knowing the last number said tells you how many.",
    teach: "Counting is three ideas, not one: the number words in order, one word for each object, and that the last word is the total. Each tap makes one object count and says its number, so the three stay together. Watch whether your child touches each thing exactly once and whether they can tell you the total without counting again.",
    help: "Count the first one or two with them, then let them lead. Count real things too: stairs, spoons, grapes. Try not to correct a missed one; let the round finish and have another go.",
    ask: "How many are there altogether? How do you know?" },
  { id: "trace", title: "Trace the number", blurb: "Draw the number with your finger.", skill: "writing numbers",
    builds: "Recognising the shapes of the digits 0 to 9 and the movement that draws them, ready for writing.",
    teach: "Children learn the starting point and direction of each digit through the movement itself. The dotted path shows where to start and which way to go, and the stars only follow when the finger goes the right way. Look for a relaxed grip and for starting at the top.",
    help: "Say the number as they draw it. Try drawing it big in the air, in sand, or with a finger on your child's back. A few numbers a day is plenty.",
    ask: "Can you find a number like this one in the house?" },
  { id: "add", title: "Add and take away", blurb: "Ducks come, biscuits go.", skill: "adding and taking away",
    builds: "The idea behind adding (putting more together) and taking away (some are gone), and seeing it as a sum.",
    teach: "Adding and taking away are first understood as things that happen: more arrive, some leave. Moving the objects one at a time, with the count said aloud, builds the sense of the change before any symbols. The sum underneath ties the picture to the numbers, but it's the doing that matters.",
    help: "Act it out with toys: two cars, one more drives in. Ask what happened before showing the sum. Using fingers is fine and is part of learning.",
    ask: "How many were there at the start? How many now? What changed?" },
  { id: "shapes", title: "Shape sorter", blurb: "Pop each shape in its hole.", skill: "shapes",
    builds: "Naming and matching shapes: circle, square, triangle and star.",
    teach: "Matching a shape to its outline trains careful looking at sides and corners, and builds the words children will use in geometry. A shape that bounces back is a gentle signal to look again, not a mistake. Look for turning the shape to compare, and for naming it.",
    help: "Hunt for shapes around the house: a plate, a window, a roof. Describe them: round, four straight sides, three corners.",
    ask: "How many corners does this one have?" },
  { id: "colour", title: "Colour by number", blurb: "Match the number to the colour.", skill: "number recognition",
    builds: "Reading the numbers 1 to 4, matching each to its colour, and seeing a picture appear as the work is done.",
    teach: "Each cell shows a number and each colour has one, so children practise recognising numerals and holding a rule in mind: this number goes with that colour. Finishing the picture gives a clear, rewarding end.",
    help: "Ask them to find all of one number before moving on. Talk about the picture as it appears.",
    ask: "Which number had the most squares?" },
  { id: "hundred", title: "Hundred square", blurb: "Find the numbers up to 100.", skill: "numbers to 100",
    builds: "Knowing the numbers up to 100 by sight and sound, where they sit on the grid, and counting in tens.",
    teach: "The hundred square shows the number system's pattern: each row is a ten, so the numbers in a column all end in the same digit and going down adds ten. Finding a number means using that pattern, not counting from one. Count in tens down the right-hand column (10, 20, 30...) and notice that each is one more ten.",
    help: "Ask them where 50 will be before they look. Point out that a number just below another is ten more. Say the numbers aloud with them.",
    ask: "What is ten more than this number? What is ten less?" },
  { id: "tens", title: "Tens and units", blurb: "Build numbers with tens and ones.", skill: "tens and ones", notNursery: true,
    builds: "Place value: a two-digit number is some tens and some ones, and ten ones make one ten.",
    teach: "Place value is the idea that the position of a digit tells its worth. Building a number from ten-rods and one-cubes shows why 34 is three tens and four ones, and when ten cubes are collected they swap for a rod, which is the trade that underlies carrying in addition. In the reading rounds children go the other way: from a picture of rods and cubes to the number.",
    help: "Use real objects: bundles of ten sticks and single sticks, or ten-pence and one-pence coins. Always say it as 'three tens and four ones' as well as thirty-four.",
    ask: "How many tens? How many ones? What number is that?" },
  { id: "snap", title: "Snap", blurb: "Spot the match: three lemons, three lemons!", skill: "matching numbers",
    builds: "Noticing when two cards show the same number, whether as objects, a numeral or (later) a sum, which is the heart of number sense.",
    teach: "Snap asks children to hold one card in mind and compare the next with it. At first the match is the same picture and the same count; later a numeral can match a set of objects (the 3 and three lemons), and then a sum matches its answer. Seeing that different pictures can mean the same number is how a number stops being tied to one thing. A missed snap just shows the pair, with no penalty.",
    help: "Play it for real too, with two decks of playing cards or number cards. Say the numbers out loud as each card turns, and count the objects together when it's tricky.",
    ask: "How do you know they are the same? Which one has more?" },
];

/** The activities a learner is offered: Nursery doesn't get the tens-and-ones one. */
export const littleFor = (early?: "nursery" | "reception"): LittleInfo[] => LITTLE_ACTIVITIES.filter((a) => !(a.notNursery && early === "nursery"));
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

/** A smooth curve through a stroke's points (Catmull-Rom), broken only at the sharp corners, as points about 2 units apart. */
export function smoothStroke(stroke: Pt[], sharp: number[] = []): Pt[] {
  const cuts = [0, ...sharp, stroke.length - 1], out: Pt[] = [];
  for (let c = 0; c < cuts.length - 1; c++) {
    const seg = stroke.slice(cuts[c], cuts[c + 1] + 1);
    for (let i = 0; i < seg.length - 1; i++) {
      const p0 = seg[i - 1] ?? seg[i], p1 = seg[i], p2 = seg[i + 1], p3 = seg[i + 2] ?? seg[i + 1], n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
  }
  out.push(stroke[stroke.length - 1]);
  return out;
}
/** Points along an ellipse from angle a0 to a1 (degrees, 0 = right, 90 = bottom, so a larger angle goes clockwise on screen). */
export function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Pt[] {
  const n = Math.max(6, Math.round((Math.abs(a1 - a0) / 360) * 60)), out: Pt[] = [];
  for (let k = 0; k <= n; k++) { const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return out;
}
const line = (...p: Pt[]): Pt[] => smoothStroke(p, p.map((_, i) => i).slice(1, -1));   // straight pieces with sharp corners
const two = arcPts(50, 44, 30, 30, 195, 395), five = arcPts(50, 94, 32, 36, -130, 150);
const six: Pt[] = [...arcPts(72, 98, 52, 86, -90, -180), ...arcPts(50, 98, 30, 32, 180, -180)];
/** Each digit as the path a finger follows: round digits are real curves (arcs), straight ones keep their corners. */
export const DIGIT_PATHS: Record<number, Pt[]> = {
  0: arcPts(50, 70, 32, 58, 270, -90),
  1: line([34, 38], [52, 14], [52, 130]),
  2: [...two, ...line(two[two.length - 1], [20, 128], [84, 128]).slice(1)],
  3: [...arcPts(46, 40, 28, 28, 200, 450), ...arcPts(46, 100, 32, 32, 270, 510).slice(1)],
  4: line([66, 130], [66, 10], [16, 92], [88, 92]),
  5: [...line([76, 12], [30, 12], five[0]), ...five],
  6: six,
  7: line([18, 14], [84, 14], [44, 130]),
  8: [...arcPts(50, 38, 26, 28, 90, 450), ...arcPts(50, 98, 30, 32, 270, -90).slice(1)],
  9: [...six].reverse().map(([x, y]) => [100 - x, 140 - y] as Pt),
};

/** Points spaced about `step` apart along a stroke, so a finger's progress can be followed one point at a time. */
export function waypoints(stroke: Pt[], step = 4): Pt[] {
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
export type ShapeKind = "circle" | "square" | "triangle" | "star" | "rectangle" | "oval" | "diamond" | "heart" | "pentagon" | "hexagon" | "octagon" | "semicircle" | "crescent" | "cross" | "trapezium";
export const BASIC_SHAPES: ShapeKind[] = ["circle", "square", "triangle", "star"];
export const MORE_SHAPES: ShapeKind[] = ["rectangle", "oval", "diamond", "heart"];
export const COMPLEX_SHAPES: ShapeKind[] = ["pentagon", "hexagon", "octagon", "semicircle", "crescent", "cross", "trapezium"];
export const SHAPES: ShapeKind[] = [...BASIC_SHAPES, ...MORE_SHAPES, ...COMPLEX_SHAPES];
export type LittleStage = "nursery" | "reception" | "older";
/** Shapes by stage: Nursery the four first shapes; Reception adds four more; Year 1 and up add the harder ones (a pentagon, a crescent, a cross...). */
export const shapesFor = (stage: LittleStage): ShapeKind[] => (stage === "nursery" ? BASIC_SHAPES : stage === "reception" ? [...BASIC_SHAPES, ...MORE_SHAPES] : SHAPES);
export const shapeCount = (stage: LittleStage) => (stage === "nursery" ? 2 : stage === "reception" ? 4 : 6);
export function shapeRound(r: () => number, count: number, from: ShapeKind[] = BASIC_SHAPES): ShapeKind[] {
  const pool = [...from]; for (let i = pool.length - 1; i > 0; i--) { const j = int(r, 0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}

// ---- numbers to 100
/** The top of the hundred square by stage: Nursery up to 10, Reception up to 20, Year 1 and up to 100. */
export const hundredMax = (stage: LittleStage) => (stage === "nursery" ? 10 : stage === "reception" ? 20 : 100);
export const splitTens = (n: number) => ({ tens: Math.floor(n / 10), ones: n % 10 });
/** Numbers to find on the hundred square: different, inside the range and not 0. */
export function findTargets(r: () => number, max: number, count: number): number[] {
  const out: number[] = []; while (out.length < Math.min(count, max)) { const n = int(r, 1, max); if (!out.includes(n)) out.push(n); } return out;
}
/** A target for "make this number" and the top of the range by stage (never above 99 here, so the tens rods stay in view). */
export const buildMax = (stage: LittleStage) => (stage === "reception" ? 30 : 99);
export function buildTarget(r: () => number, stage: LittleStage): number { return int(r, 11, buildMax(stage)); }
/** Three answers to "what number is this?": the right one, the digits swapped (43 for 34), and one that is a ten out. Always different, always 10 to 99. */
export function readOptions(r: () => number, n: number): number[] {
  const { tens, ones } = splitTens(n), swapped = ones * 10 + tens, pool = [swapped, n + 10, n - 10, n + 1, n - 1, n + 20].filter((x) => x >= 10 && x <= 99 && x !== n);
  const opts = [n]; for (const x of [swapped, ...pool]) { if (opts.length < 3 && !opts.includes(x) && x >= 10 && x <= 99) opts.push(x); }
  for (let i = opts.length - 1; i > 0; i--) { const j = int(r, 0, i); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return opts;
}
/** The digits of a two-digit number to trace, tens first. */
export const digitsOf = (n: number): number[] => String(n).split("").map(Number);

// ---- Snap
export type SnapThing = "lemon" | "apple" | "strawberry" | "star" | "duck" | "fish" | "ball" | "cherry" | "flower";
export const SNAP_THINGS: SnapThing[] = ["lemon", "apple", "strawberry", "star", "duck", "fish", "ball", "cherry", "flower"];
export type SnapCard = { kind: "objects"; thing: SnapThing; n: number } | { kind: "num"; n: number } | { kind: "sum"; a: number; b: number; n: number };
export const snapValue = (c: SnapCard) => c.n;
/** Is this a snap? Nursery: the same thing and the same count. Reception: the same number, as objects or a numeral (3 lemons and 3 apples, or the 3 and three lemons). Year 1 and up: a sum counts too (2 + 1 and the 3). */
export function isSnap(prev: SnapCard | undefined, next: SnapCard, stage: LittleStage): boolean {
  if (!prev) return false;
  if (stage === "nursery") return prev.kind === "objects" && next.kind === "objects" && prev.thing === next.thing && prev.n === next.n;
  if (stage === "reception" && (prev.kind === "sum" || next.kind === "sum")) return false;
  return prev.n === next.n;
}
const kindsFor = (stage: LittleStage): SnapCard["kind"][] => (stage === "nursery" ? ["objects"] : stage === "reception" ? ["objects", "num"] : ["objects", "num", "sum"]);
export const snapMax = (stage: LittleStage) => (stage === "nursery" ? 5 : stage === "reception" ? 10 : 10);
/** A card with the given number, drawn as objects, a numeral or a sum. */
export function snapCard(r: () => number, stage: LittleStage, n: number, thing?: SnapThing, kind?: SnapCard["kind"]): SnapCard {
  const ks = kindsFor(stage).filter((k) => k !== "sum" || n >= 2), k = kind && ks.includes(kind) ? kind : ks[Math.floor(r() * ks.length)];
  if (k === "num") return { kind: "num", n };
  if (k === "sum") { const a = 1 + Math.floor(r() * (n - 1)); return { kind: "sum", a, b: n - a, n }; }
  return { kind: "objects", thing: thing ?? SNAP_THINGS[Math.floor(r() * SNAP_THINGS.length)], n };
}
/**
 * A pile of cards with a few snaps in it, in random places and never two in a row, and no snap that wasn't planned. `things` and `numbers` are the
 * lists to draw from (already shuffled by the randomiser, so rounds differ).
 */
export function snapDeck(r: () => number, stage: LittleStage, length: number, snaps: number, numbers: number[], things: SnapThing[]): SnapCard[] {
  const at = new Set<number>(); let guard = 0;
  while (at.size < snaps && guard++ < 200) { const i = 1 + Math.floor(r() * (length - 1)); if (!at.has(i) && !at.has(i - 1) && !at.has(i + 1)) at.add(i); }
  const deck: SnapCard[] = [], pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  for (let i = 0; i < length; i++) {
    const prev = deck[i - 1];
    if (at.has(i) && prev) {
      // a different-looking card with the same number where the stage allows, otherwise the identical picture
      let c = snapCard(r, stage, prev.n, prev.kind === "objects" ? prev.thing : pick(things)), tries = 0;
      while (stage === "nursery" && !isSnap(prev, c, stage) && tries++ < 20) c = snapCard(r, stage, prev.n, prev.kind === "objects" ? prev.thing : pick(things));
      deck.push(c); continue;
    }
    let c: SnapCard, tries = 0;
    do { c = snapCard(r, stage, pick(numbers), pick(things)); } while (prev && isSnap(prev, c, stage) && tries++ < 60);
    if (prev && isSnap(prev, c, stage)) c = snapCard(r, stage, numbers.find((x) => x !== prev.n) ?? 1, pick(things));
    deck.push(c);
  }
  return deck;
}

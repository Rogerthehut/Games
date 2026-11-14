/**
 * Colour by number pictures: real line art in 100 x 100 boxes, split into regions that each carry a number. Tap a region with its colour chosen to fill it.
 * `decor` is extra detail drawn over the top (eyes, outlines, sparkle) that isn't coloured in. Every number used by a picture has a colour in its palette.
 */
export interface ArtRegion { d: string; n: number; /** no outline of its own (the picture's traced line art draws it) */ plain?: boolean; /** where the number sits, when the middle of the shape isn't the best place */ at?: [number, number] }
export interface ArtDecor { d: string; fill?: string; stroke?: string; w?: number }
export interface ColourArt { id: string; name: string; regions: ArtRegion[]; decor: ArtDecor[]; palette: Record<number, string> }

const f = (n: number) => +n.toFixed(2);
const circ = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
const poly = (...p: [number, number][]) => `M${p.map(([x, y]) => `${x} ${y}`).join("L")}z`;
const rect = (x: number, y: number, w: number, h: number) => poly([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
const star = (cx: number, cy: number, r: number) => poly(...Array.from({ length: 10 }, (_, i) => { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.45 : r; return [f(cx + rr * Math.cos(a)), f(cy + rr * Math.sin(a))] as [number, number]; }));
/** The same shape flipped left to right about the middle, for symmetrical pictures. */
const mirror = (d: string) => d.replace(/([MLCQAa]?)\s*(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (_m, c, x, y) => `${c}${f(100 - +x)} ${y} `);

const SKY = "#bfe6f7";
import { COLOUR_ART_TRACED } from "./little-art-traced";
const HAND_DRAWN: ColourArt[] = [
  { id: "butterfly", name: "a butterfly", palette: { 1: "#f782a9", 2: "#f5dc63", 3: "#8294e9", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] },
      { d: "M48 46C30 10 6 14 10 38C12 50 30 54 48 50z", n: 1 }, { d: mirror("M48 46C30 10 6 14 10 38C12 50 30 54 48 50z"), n: 1 },
      { d: "M48 52C30 54 14 62 22 80C30 92 46 78 48 56z", n: 2 }, { d: mirror("M48 52C30 54 14 62 22 80C30 92 46 78 48 56z"), n: 2 },
      { d: ell(50, 56, 3.6, 21), n: 3, at: [50, 66] },
      { d: circ(22, 32, 5), n: 3 }, { d: circ(78, 32, 5), n: 3 }, { d: circ(30, 72, 4), n: 1 }, { d: circ(70, 72, 4), n: 1 },
    ],
    decor: [{ d: "M49 36Q44 22 36 18", stroke: "#121522", w: 1.4 }, { d: "M51 36Q56 22 64 18", stroke: "#121522", w: 1.4 }, { d: circ(36, 18, 1.8), fill: "#121522" }, { d: circ(64, 18, 1.8), fill: "#121522" }] },
  { id: "fish", name: "a fish", palette: { 1: "#f08a3c", 2: "#f5dc63", 3: "#8294e9", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [90, 90] },
      { d: poly([72, 52], [94, 32], [94, 72]), n: 2 }, { d: poly([38, 34], [50, 18], [62, 36]), n: 2 }, { d: poly([40, 70], [50, 84], [58, 68]), n: 2 },
      { d: ell(46, 52, 30, 20), n: 1, at: [52, 52] }, { d: circ(30, 48, 4.5), n: 3 },
      { d: circ(16, 26, 4), n: 3 }, { d: circ(26, 14, 3), n: 3 }, { d: circ(12, 12, 2.6), n: 3 },
    ],
    decor: [{ d: circ(30, 48, 1.6), fill: "#121522" }, { d: "M22 58Q26 62 30 60", stroke: "#121522", w: 1.2 }, { d: "M56 40Q62 52 56 64", stroke: "#121522", w: 1.2 }, { d: "M66 42Q71 52 66 62", stroke: "#121522", w: 1.2 }] },
  { id: "rocket", name: "a rocket", palette: { 1: "#ef6f6c", 2: "#f5dc63", 3: "#d9d5e8", 4: "#6ab7e8", 5: "#f08a3c", 6: "#2f3a73" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 6, at: [10, 10] },
      { d: star(18, 20, 6), n: 2 }, { d: star(84, 28, 5), n: 2 }, { d: star(90, 90, 5), n: 2 }, { d: star(12, 66, 4.5), n: 2 },
      { d: poly([34, 54], [16, 80], [34, 72]), n: 1 }, { d: poly([66, 54], [84, 80], [66, 72]), n: 1 },
      { d: "M50 8C58 15 63 26 65 38L35 38C37 26 42 15 50 8z", n: 1, at: [50, 28] },
      { d: "M35 38L65 38C68 50 68 62 66 72L34 72C32 62 32 50 35 38z", n: 3, at: [50, 62] },
      { d: circ(50, 52, 8), n: 4 },
      { d: poly([40, 72], [60, 72], [50, 94]), n: 5, at: [50, 78] }, { d: poly([45, 72], [55, 72], [50, 84]), n: 2, at: [50, 76] },
    ],
    decor: [{ d: circ(50, 52, 8), stroke: "#121522", w: 1.4 }] },
  { id: "unicorn", name: "a unicorn", palette: { 1: "#f9c9dc", 2: "#b58be8", 3: "#6ab7e8", 4: "#f5dc63", 5: "#f08fb0", 6: "#d9f2e1" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 6, at: [10, 10] },
      { d: star(14, 18, 6), n: 4 }, { d: star(88, 24, 5), n: 4 },
      { d: "M30 32C10 38 6 64 18 86C24 94 34 88 32 72C30 58 30 46 38 36z", n: 2, at: [20, 62] }, { d: mirror("M30 32C10 38 6 64 18 86C24 94 34 88 32 72C30 58 30 46 38 36z"), n: 3, at: [80, 62] },
      { d: poly([34, 26], [30, 8], [46, 20]), n: 1 }, { d: poly([66, 26], [70, 8], [54, 20]), n: 1 },
      { d: "M30 34C30 18 70 18 70 34L72 62C72 80 62 90 50 90C38 90 28 80 28 62z", n: 1, at: [50, 44] },
      { d: poly([50, 2], [43, 26], [57, 26]), n: 4, at: [50, 18] },
      { d: "M38 26C40 42 60 42 62 26C56 20 44 20 38 26z", n: 2, at: [50, 30] },
      { d: ell(50, 77, 15, 11), n: 5, at: [50, 80] },
    ],
    decor: [{ d: ell(41, 54, 3.2, 4.6), fill: "#121522" }, { d: ell(59, 54, 3.2, 4.6), fill: "#121522" }, { d: circ(42, 52, 1.2), fill: "#fff" }, { d: circ(60, 52, 1.2), fill: "#fff" },
      { d: ell(45, 78, 1.6, 2.4), fill: "#121522" }, { d: ell(55, 78, 1.6, 2.4), fill: "#121522" }, { d: "M46 15L54 15M45 20L55 20", stroke: "#121522", w: 0.9 }, { d: "M45 86Q50 90 55 86", stroke: "#121522", w: 1.1 }] },
  { id: "fairy", name: "a fairy", palette: { 1: "#bfe6f7", 2: "#f782a9", 3: "#f9d5b8", 4: "#b5651d", 5: "#f5dc63", 6: "#d9f2e1" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 6, at: [8, 8] },
      { d: star(18, 14, 5), n: 5 }, { d: star(82, 72, 5), n: 5 }, { d: star(12, 60, 4), n: 5 },
      { d: "M46 46C30 20 8 24 14 42C18 54 38 54 46 50z", n: 1 }, { d: mirror("M46 46C30 20 8 24 14 42C18 54 38 54 46 50z"), n: 1 },
      { d: "M46 54C30 58 18 72 28 80C38 86 46 70 46 58z", n: 1 }, { d: mirror("M46 54C30 58 18 72 28 80C38 86 46 70 46 58z"), n: 1 },
      { d: "M42 50L50 46L58 50L70 86C60 90 40 90 30 86z", n: 2, at: [50, 72] },
      { d: poly([38, 52], [26, 62], [28, 66], [40, 58]), n: 3 }, { d: poly([62, 52], [72, 44], [74, 48], [64, 58]), n: 3 },
      { d: rect(44, 86, 4, 8), n: 3 }, { d: rect(52, 86, 4, 8), n: 3 },
      { d: circ(50, 34, 10), n: 3, at: [50, 36] },
      { d: "M39 34C38 18 62 18 61 34C58 26 42 26 39 34z", n: 4 }, { d: circ(50, 19, 5), n: 4 },
      { d: star(86, 22, 7), n: 5 },
    ],
    decor: [{ d: "M73 46L82 28", stroke: "#121522", w: 1.2 }, { d: circ(46, 35, 1.3), fill: "#121522" }, { d: circ(54, 35, 1.3), fill: "#121522" }, { d: "M47 40Q50 43 53 40", stroke: "#121522", w: 1 }, { d: circ(43, 39, 2), fill: "#f782a955" }, { d: circ(57, 39, 2), fill: "#f782a955" }] },
  { id: "horse", name: "a horse", palette: { 1: "#b5651d", 2: "#6b3e1e", 3: "#5d5a73", 4: "#f5dc63", 5: "#7fd36a", 6: SKY },
    regions: [
      { d: rect(0, 0, 100, 70), n: 6, at: [14, 12] }, { d: rect(0, 70, 100, 30), n: 5, at: [12, 90] }, { d: circ(24, 16, 8), n: 4 },
      { d: rect(62, 60, 5, 24), n: 1 }, { d: rect(54, 62, 5, 22), n: 1 }, { d: rect(30, 62, 5, 22), n: 1 }, { d: rect(38, 60, 5, 24), n: 1 },
      { d: rect(62, 84, 5, 4), n: 3 }, { d: rect(54, 84, 5, 4), n: 3 }, { d: rect(30, 84, 5, 4), n: 3 }, { d: rect(38, 84, 5, 4), n: 3 },
      { d: "M22 50C8 54 8 72 14 84C18 72 20 62 26 56z", n: 2 },
      { d: ell(46, 54, 26, 13), n: 1, at: [44, 54] },
      { d: "M62 50L72 24L84 30L76 58z", n: 1, at: [72, 42] },
      { d: "M70 26C72 16 84 12 92 20L99 34C97 39 90 39 86 35L80 35C76 35 72 32 70 26z", n: 1, at: [84, 26] },
      { d: poly([74, 20], [76, 9], [81, 19]), n: 1 },
      { d: "M70 22C60 30 62 44 58 54L65 52C67 42 72 34 76 28z", n: 2 },
    ],
    decor: [{ d: circ(86, 24, 1.6), fill: "#121522" }, { d: circ(96, 33, 1), fill: "#121522" }] },
  { id: "footballer", name: "a footballer", palette: { 1: "#f9d5b8", 2: "#6b3e1e", 3: "#ef6f6c", 4: "#2f3a73", 5: "#7fd36a", 6: SKY, 7: "#2b2b3a" },
    regions: [
      { d: rect(0, 0, 100, 68), n: 6, at: [12, 12] }, { d: rect(0, 68, 100, 32), n: 5, at: [10, 92] },
      { d: poly([48, 66], [56, 66], [72, 74], [68, 80], [52, 74]), n: 1 }, { d: rect(34, 66, 9, 18), n: 1 },
      { d: rect(34, 76, 9, 8), n: 3 }, { d: "M32 85C32 82 44 82 46 85L46 90L32 90z", n: 7 }, { d: ell(73, 80, 6, 3.6), n: 7 },
      { d: "M34 54L60 54L62 67L49 67L47 61L45 67L32 67z", n: 4, at: [48, 59] },
      { d: poly([36, 33], [56, 33], [60, 54], [34, 54]), n: 3, at: [47, 43] },
      { d: poly([36, 34], [24, 45], [28, 50], [38, 43]), n: 3 }, { d: poly([56, 34], [68, 41], [65, 47], [55, 42]), n: 3 },
      { d: circ(26, 49, 3), n: 1 }, { d: circ(67, 48, 3), n: 1 },
      { d: circ(46, 23, 8), n: 1 }, { d: "M38 22C38 12 54 12 54 22C50 17 42 17 38 22z", n: 2 },
      { d: circ(88, 78, 6), n: 7 },
    ],
    decor: [{ d: circ(44, 23, 1.2), fill: "#121522" }, { d: circ(50, 23, 1.2), fill: "#121522" }, { d: "M44 27Q47 29 50 27", stroke: "#121522", w: 0.9 }, { d: poly([88, 75], [91, 77.4], [90, 81], [86, 81], [85, 77.4]), fill: "#fff" }, { d: "M41 44L52 44", stroke: "#fff", w: 1.1 }],
  },
  { id: "flower", name: "a flower", palette: { 1: "#f782a9", 2: "#f5dc63", 3: "#4cc6a7", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] },
      { d: rect(47, 44, 6, 48), n: 3, at: [50, 84] }, { d: "M50 74C38 66 28 70 22 80C34 84 46 82 50 74z", n: 3 }, { d: mirror("M50 74C38 66 28 70 22 80C34 84 46 82 50 74z"), n: 3 },
      ...[0, 60, 120, 180, 240, 300].map((a) => ({ d: circ(f(50 + 19 * Math.cos(a * Math.PI / 180)), f(34 + 19 * Math.sin(a * Math.PI / 180)), 11), n: 1 })),
      { d: circ(50, 34, 11), n: 2 },
    ],
    decor: [{ d: circ(46, 32, 1.4), fill: "#121522" }, { d: circ(54, 32, 1.4), fill: "#121522" }, { d: "M46 38Q50 42 54 38", stroke: "#121522", w: 1.1 }] },
  { id: "ladybird", name: "a ladybird", palette: { 1: "#ef4f5f", 2: "#2b2b3a", 3: "#7fd36a", 4: "#fff1b8" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] },
      { d: "M2 96C22 62 78 62 98 96C76 102 24 102 2 96z", n: 3, at: [50, 92] },
      { d: ell(50, 58, 28, 32), n: 1, at: [50, 46] }, { d: circ(50, 24, 13), n: 2 },
      { d: circ(37, 46, 5), n: 2 }, { d: circ(63, 46, 5), n: 2 }, { d: circ(39, 68, 4.5), n: 2 }, { d: circ(61, 68, 4.5), n: 2 },
    ],
    decor: [{ d: "M50 26V90", stroke: "#121522", w: 1.4 }, { d: "M42 14Q36 6 30 6M58 14Q64 6 70 6", stroke: "#121522", w: 1.3 }, { d: circ(44, 24, 2.4), fill: "#fff" }, { d: circ(56, 24, 2.4), fill: "#fff" }] },
  { id: "house", name: "a house", palette: { 1: "#f9a8b8", 2: "#c2503e", 3: "#7fd36a", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] }, { d: rect(0, 80, 100, 20), n: 3, at: [10, 92] },
      { d: rect(66, 20, 8, 22), n: 2 }, { d: rect(20, 46, 60, 34), n: 1, at: [32, 72] },
      { d: poly([14, 48], [50, 16], [86, 48]), n: 2, at: [50, 38] }, { d: rect(44, 56, 14, 24), n: 2 },
      { d: rect(26, 54, 12, 12), n: 4 }, { d: rect(62, 54, 12, 12), n: 4 },
    ],
    decor: [{ d: "M32 54V66M26 60H38M68 54V66M62 60H74", stroke: "#121522", w: 0.9 }, { d: circ(55, 68, 1.2), fill: "#121522" }] },
  { id: "icecream", name: "an ice cream", palette: { 1: "#e3b26a", 2: "#f782a9", 3: "#9be3c6", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] },
      { d: poly([32, 52], [68, 52], [50, 96]), n: 1, at: [50, 64] },
      { d: "M28 56C20 40 30 30 50 30C70 30 80 40 72 56C60 62 40 62 28 56z", n: 2, at: [50, 46] },
      { d: "M34 36C28 22 38 10 50 10C62 10 72 22 66 36C58 40 42 40 34 36z", n: 3, at: [50, 24] },
    ],
    decor: [{ d: "M38 56L56 86M46 56L60 78M62 56L44 86M54 56L42 78M34 68H66M40 80H60", stroke: "#b5651d", w: 0.8 }, { d: circ(50, 8, 4), fill: "#ef4f5f", stroke: "#9c1f35", w: 1 }] },
  { id: "balloons", name: "balloons", palette: { 1: "#f782a9", 2: "#f5dc63", 3: "#8294e9", 4: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 4, at: [10, 10] },
      { d: ell(30, 34, 15, 19), n: 1 }, { d: ell(54, 26, 15, 19), n: 2 }, { d: ell(74, 38, 15, 19), n: 3 },
      { d: poly([27, 52], [33, 52], [30, 58]), n: 1 }, { d: poly([51, 44], [57, 44], [54, 50]), n: 2 }, { d: poly([71, 56], [77, 56], [74, 62]), n: 3 },
    ],
    decor: [{ d: "M30 58Q24 76 40 96M54 50Q60 74 40 96M74 62Q68 80 40 96", stroke: "#121522", w: 0.9 }, { d: "M22 28Q24 22 30 20", stroke: "#ffffffaa", w: 1.6 }, { d: "M46 20Q48 14 54 12", stroke: "#ffffffaa", w: 1.6 }, { d: "M66 32Q68 26 74 24", stroke: "#ffffffaa", w: 1.6 }] },
  { id: "castle", name: "a castle", palette: { 1: "#c7c5d8", 2: "#e5524a", 3: "#a86a3c", 4: "#f5dc63", 5: "#7fd36a", 6: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 6, at: [8, 8] }, { d: rect(0, 82, 100, 18), n: 5, at: [10, 92] },
      { d: rect(18, 46, 18, 36), n: 1, at: [27, 74] }, { d: rect(64, 46, 18, 36), n: 1, at: [73, 74] }, { d: rect(34, 38, 32, 44), n: 1, at: [40, 52] },
      { d: poly([15, 46], [27, 26], [39, 46]), n: 2 }, { d: poly([61, 46], [73, 26], [85, 46]), n: 2 }, { d: poly([32, 38], [50, 14], [68, 38]), n: 2, at: [50, 30] },
      { d: "M44 82V68Q50 58 56 68V82z", n: 3 }, { d: rect(46, 44, 8, 9), n: 4 }, { d: rect(24, 58, 6, 9), n: 4 }, { d: rect(70, 58, 6, 9), n: 4 },
      { d: poly([50, 6], [62, 10], [50, 14]), n: 4 },
    ],
    decor: [{ d: "M50 14V4", stroke: "#121522", w: 1 }] },
  { id: "robot", name: "a robot", palette: { 1: "#b8bccd", 2: "#e5524a", 3: "#f5dc63", 4: "#6ab7e8", 5: "#d9f2e1" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 5, at: [8, 8] },
      { d: rect(14, 50, 10, 28), n: 1 }, { d: rect(76, 50, 10, 28), n: 1 }, { d: circ(19, 82, 6), n: 2 }, { d: circ(81, 82, 6), n: 2 },
      { d: rect(34, 84, 12, 12), n: 2 }, { d: rect(54, 84, 12, 12), n: 2 },
      { d: rect(26, 48, 48, 36), n: 1, at: [32, 56] }, { d: rect(38, 56, 24, 18), n: 4 },
      { d: rect(30, 14, 40, 30), n: 1, at: [34, 38] }, { d: circ(50, 7, 4), n: 2 },
      { d: circ(40, 28, 6), n: 3 }, { d: circ(60, 28, 6), n: 3 },
    ],
    decor: [{ d: "M50 11V14", stroke: "#121522", w: 1.2 }, { d: circ(40, 28, 2.2), fill: "#121522" }, { d: circ(60, 28, 2.2), fill: "#121522" }, { d: "M42 38H58", stroke: "#121522", w: 1.4 }, { d: circ(44, 65, 2), fill: "#e5524a" }, { d: circ(56, 65, 2), fill: "#f5dc63" }, { d: "M22 44L30 48M78 44L70 48", stroke: "#121522", w: 1 }] },
  { id: "cat", name: "a cat", palette: { 1: "#f0a14a", 2: "#f9a8b8", 3: "#6fcf8f", 4: "#fde7c8", 5: "#d9d5f8" },
    regions: [
      { d: rect(0, 0, 100, 100), n: 5, at: [8, 8] },
      { d: poly([22, 44], [26, 12], [46, 34]), n: 1 }, { d: poly([78, 44], [74, 12], [54, 34]), n: 1 },
      { d: poly([28, 36], [29, 22], [39, 32]), n: 2 }, { d: poly([72, 36], [71, 22], [61, 32]), n: 2 },
      { d: ell(50, 58, 32, 28), n: 1, at: [34, 66] },
      { d: ell(37, 52, 6, 7), n: 3 }, { d: ell(63, 52, 6, 7), n: 3 },
      { d: ell(50, 70, 13, 9), n: 4 }, { d: poly([45, 61], [55, 61], [50, 67]), n: 2 },
    ],
    decor: [{ d: ell(37, 52, 1.8, 5), fill: "#121522" }, { d: ell(63, 52, 1.8, 5), fill: "#121522" }, { d: "M50 67V72M44 76Q50 80 56 76", stroke: "#121522", w: 1.1 }, { d: "M20 66L36 68M20 74L36 72M80 66L64 68M80 74L64 72", stroke: "#121522", w: 0.9 }, { d: "M44 32L46 40M50 30V38M56 32L54 40", stroke: "#c97a22", w: 1.5 }] },
  { id: "boat", name: "a sailing boat", palette: { 1: "#e5524a", 2: "#f5dc63", 3: "#ffd6e5", 4: "#4aa3e8", 5: "#f08a3c", 6: SKY },
    regions: [
      { d: rect(0, 0, 100, 86), n: 6, at: [10, 10] }, { d: circ(84, 18, 9), n: 5 },
      { d: poly([50, 10], [50, 60], [20, 60]), n: 2 }, { d: poly([54, 22], [54, 60], [78, 60]), n: 3 },
      { d: "M14 62H86C82 76 72 82 60 82H40C28 82 18 76 14 62z", n: 1, at: [50, 72] },
      { d: "M0 80C14 74 24 86 38 80C52 74 62 86 76 80C88 74 94 80 100 80V100H0z", n: 4, at: [20, 92] },
    ],
    decor: [{ d: "M50 8V62", stroke: "#121522", w: 1.2 }, { d: poly([50, 2], [60, 5], [50, 8]), fill: "#e5524a", stroke: "#121522", w: 0.8 }, { d: circ(34, 70, 2.4), fill: "#fff", stroke: "#121522", w: 0.8 }, { d: circ(50, 70, 2.4), fill: "#fff", stroke: "#121522", w: 0.8 }, { d: circ(66, 70, 2.4), fill: "#fff", stroke: "#121522", w: 0.8 }] },
  { id: "owl", name: "an owl", palette: { 1: "#8b5a3c", 2: "#5c3b28", 3: "#fde7c8", 4: "#f08a3c", 5: "#6b3e1e", 6: SKY },
    regions: [
      { d: rect(0, 0, 100, 100), n: 6, at: [10, 10] }, { d: circ(50, 9, 5), n: 3 },
      { d: "M2 86C22 82 78 82 98 86V94C78 92 22 92 2 94z", n: 5, at: [14, 90] },
      { d: "M50 21C42 21 32 15 23 7C19 20 15 33 15 46C13 66 24 86 50 88C76 86 87 66 85 46C85 33 81 20 77 7C68 15 58 21 50 21z", n: 1, at: [50, 30] },
      { d: "M19 48C9 64 16 80 31 85C28 71 26 60 29 47z", n: 2 }, { d: mirror("M19 48C9 64 16 80 31 85C28 71 26 60 29 47z"), n: 2 },
      { d: "M50 53C38 55 32 67 34 78C36 87 64 87 66 78C68 67 62 55 50 53z", n: 3, at: [50, 72] },
      { d: circ(36, 38, 14), n: 3 }, { d: circ(64, 38, 14), n: 3 },
      { d: circ(36, 38, 8.5), n: 4 }, { d: circ(64, 38, 8.5), n: 4 },
      { d: "M45 45C47 42 53 42 55 45C54 50 52 54 50 56C48 54 46 50 45 45z", n: 4 },
      { d: "M33 85C33 80 47 80 47 85V88C43 90 37 90 33 88z", n: 4 }, { d: "M53 85C53 80 67 80 67 85V88C63 90 57 90 53 88z", n: 4 },
    ],
    decor: [{ d: circ(36, 38, 4.6), fill: "#121522" }, { d: circ(64, 38, 4.6), fill: "#121522" }, { d: circ(37.6, 36.2, 1.5), fill: "#fff" }, { d: circ(65.6, 36.2, 1.5), fill: "#fff" },
      { d: "M44 66Q50 70 56 66M42 72Q50 77 58 72M44 78Q50 82 56 78", stroke: "#b5651d", w: 0.9 }, { d: "M22 20Q28 22 32 26M78 20Q72 22 68 26", stroke: "#5c3b28", w: 1.3 }, { d: "M37 88V92M43 88V92M57 88V92M63 88V92", stroke: "#121522", w: 0.8 }] },
];
/** The hand-drawn pictures, then the ones traced from line art. */
export const COLOUR_ART: ColourArt[] = [...HAND_DRAWN, ...COLOUR_ART_TRACED];
/** Pictures by how many colours they use, so the youngest get the simple ones. */
export const artFor = (stage: "nursery" | "reception" | "older"): ColourArt[] => COLOUR_ART.filter((a) => Object.keys(a.palette).length <= (stage === "nursery" ? 4 : stage === "reception" ? 6 : 7));
export const artNumbers = (a: ColourArt) => [...new Set(a.regions.map((r) => r.n))].sort((x, y) => x - y);

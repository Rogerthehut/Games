import { mulberry32 } from "./rng";

/**
 * The randomiser for the Little ones activities. Plain random numbers repeat themselves too often for small children (the same number three rounds
 * running feels like a bug), so everything is drawn through here: a "bag" hands out each item once before any comes round again, and
 * "recent" draws avoid the last few answers. It remembers the last few across visits, and can be seeded so tests are repeatable.
 */
const KEY = "quarter.littleRecent", BAG_KEY = "quarter.littleBags";
export class Randomiser {
  private next: () => number;
  private bags = new Map<string, unknown[]>();
  private recent = new Map<string, unknown[]>();
  constructor(seed?: number, private remember = false) {
    const s = seed ?? Randomiser.freshSeed();
    this.next = mulberry32(s >>> 0);
    if (remember) this.load();
  }
  /** Bags survive closing the app, so the pictures keep going round in turn (every one is shown before any comes back), not starting afresh each visit. */
  private loadBags(): Record<string, unknown[]> { try { return JSON.parse(localStorage.getItem(BAG_KEY) ?? "{}") as Record<string, unknown[]>; } catch { return {}; } }
  private saveBags() { if (!this.remember) return; try { localStorage.setItem(BAG_KEY, JSON.stringify(Object.fromEntries(this.bags))); } catch { /* private mode */ } }
  static freshSeed(): number {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; } catch { return (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0; }
  }
  /** A fresh number from 0 up to (not including) 1, for the engine functions that take a generator. */
  rng = (): number => this.next();
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.next() * items.length)]; }
  shuffle<T>(items: readonly T[]): T[] { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /** Each item once, in a new order, before any comes back; the first of a new round is never the last of the old one. */
  bag<T>(key: string, items: readonly T[]): T {
    let q = this.bags.get(key) as T[] | undefined;
    if (!q && this.remember) { const saved = this.loadBags()[key]; if (Array.isArray(saved)) q = (saved as T[]).filter((x) => items.includes(x)); }   // carry on from last time
    if (q) q = q.filter((x) => items.includes(x));                                                                                              // a smaller set of pictures (a younger learner) than the saved bag
    if (!q || q.length === 0) {
      const last = this.last(key) as T | undefined;
      q = this.shuffle(items);
      if (items.length > 1 && q.length && q[q.length - 1] === last) { [q[0], q[q.length - 1]] = [q[q.length - 1], q[0]]; }   // the next to come out is the end of the array
      this.bags.set(key, q);
    }
    this.bags.set(key, q);
    const v = q.pop() as T; this.note(key, v, 6); this.saveBags(); return v;
  }
  /** A whole number that isn't one of the last few drawn for this key (as many as the range allows). */
  intFresh(key: string, lo: number, hi: number, avoid = 4): number {
    const span = hi - lo + 1, window = Math.min(avoid, span - 1), recent = (this.recent.get(key) ?? []).slice(-window) as number[];
    let v = this.int(lo, hi), guard = 0; while (recent.includes(v) && guard++ < 50) v = this.int(lo, hi);
    this.note(key, v, Math.max(avoid, 1)); return v;
  }
  /** Items from a list that weren't used lately, in a random order. Takes as many fresh ones as it can, then fills up from the rest. */
  pickFresh<T>(key: string, items: readonly T[], count: number): T[] {
    const recent = (this.recent.get(key) ?? []) as T[], fresh = this.shuffle(items.filter((x) => !recent.includes(x))), rest = this.shuffle(items.filter((x) => recent.includes(x)));
    const out = [...fresh, ...rest].slice(0, count); this.note(key, out, items.length > count * 2 ? count * 2 : count, true); return this.shuffle(out);
  }
  last(key: string): unknown { const r = this.recent.get(key); return r?.[r.length - 1]; }
  private note(key: string, v: unknown, keep: number, many = false) {
    const r = this.recent.get(key) ?? []; if (many) r.push(...(v as unknown[])); else r.push(v);
    while (r.length > keep) r.shift(); this.recent.set(key, r); if (this.remember) this.save();
  }
  private load() { try { const o = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown[]>; for (const [k, v] of Object.entries(o)) if (Array.isArray(v)) this.recent.set(k, v.slice(-12)); } catch { /* private mode */ } }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(this.recent))); } catch { /* private mode */ } }
}
/** The one the activities share while the app is open. */
export const rand = new Randomiser(undefined, true);

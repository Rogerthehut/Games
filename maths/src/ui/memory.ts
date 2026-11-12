import { useEffect, useState } from "preact/hooks";

/**
 * Where people left off: which tab, which period, how far down a page. Kept on this device only (never sent anywhere), so coming back,
 * for a child or a grown-up, puts things as they were. Holds no answers or personal details, only positions and choices.
 * Keys are "<learner id or 'device'>:<thing>", so two learners on one device don't share a place.
 */
const KEY = "quarter.where.v1";
type Bag = Record<string, unknown>;
let bag: Bag | null = null;
const load = (): Bag => {
  if (bag) return bag;
  try { bag = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Bag; } catch { bag = {}; }
  if (!bag || typeof bag !== "object") bag = {};
  return bag;
};
let timer: ReturnType<typeof setTimeout> | undefined;
const save = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* storage full or blocked: positions just aren't kept */ } }, 400);
};
addEventListener("pagehide", () => { try { if (bag) localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* ignore */ } });

export function recall<T>(key: string, fallback: T): T {
  const v = load()[key];
  return v === undefined ? fallback : (v as T);
}
export function remember(key: string, value: unknown) {
  const b = load();
  if (value === undefined || value === null) delete b[key]; else b[key] = value;
  save();
}
/** Drops everything remembered for a learner (when they are deleted). */
export function forgetLearner(id: string) {
  const b = load();
  for (const k of Object.keys(b)) if (k.startsWith(`${id}:`)) delete b[k];
  save();
}
/** Like useState, but the value is remembered between visits. */
export function useRemembered<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => recall(key, initial));
  useEffect(() => { remember(key, value); }, [key, value]);
  return [value, setValue];
}

/** The element that scrolls the page: the app's content column when it scrolls, otherwise the window (null). */
export function pageScroller(from?: Element | null): HTMLElement | null {
  for (let e = from?.parentElement ?? null; e; e = e.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1) return e;
  }
  const c = document.querySelector<HTMLElement>(".content");
  return c && c.scrollHeight > c.clientHeight + 1 ? c : null;
}
export const scrollNow = (from?: Element | null) => { const sc = pageScroller(from); return Math.round(sc ? sc.scrollTop : window.scrollY); };
/**
 * Scrolls to `y`, trying again for a moment while the page is still filling in (images and lists make it taller after the first frame).
 * Stops as soon as the person scrolls for themselves. Returns a function that cancels it.
 */
export function restoreScroll(y: number, from?: () => Element | null): () => void {
  let frame = 0, tries = 0, done = false;
  const stop = () => { done = true; cancelAnimationFrame(frame); removeEventListener("wheel", stop, true); removeEventListener("touchstart", stop, true); removeEventListener("keydown", stop, true); };
  const place = () => {
    if (done) return;
    const sc = pageScroller(from?.());
    if (sc) sc.scrollTop = y; else window.scrollTo(0, y);
    const at = sc ? sc.scrollTop : window.scrollY;
    if (Math.abs(at - y) > 2 && ++tries < 90) frame = requestAnimationFrame(place); else stop();
  };
  addEventListener("wheel", stop, { capture: true, passive: true }); addEventListener("touchstart", stop, { capture: true, passive: true }); addEventListener("keydown", stop, true);
  frame = requestAnimationFrame(place);
  return stop;
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import "../booklet/booklet.css";
import { useAccount } from "./account-context";
import { useApp } from "./context";
import { Icon } from "./icons";

interface Built { pages: { n: number; chapter: string; title: string; html: string }[]; contents: { chapter: string; page: number }[] }
const W = 794, H = 1123;

/** The card in the Parents' area: read the curriculum booklet online, or download it as a PDF. */
export function BookletSection() {
  const { go } = useApp();
  const a = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const download = async () => {
    setBusy(true); setErr("");
    try { await a!.downloadBooklet(); } catch (e) { setErr((e as { status?: number }).status === 402 ? "The booklet comes with a subscription." : "We couldn't download the booklet just now. Please try again."); }
    setBusy(false);
  };
  return (
    <section class="card" data-testid="booklet-section" aria-labelledby="booklet-title">
      <h2 id="booklet-title">Curriculum booklet</h2>
      <p>Everything quarter covers, year by year, with a question to ask at home for every topic. Read it here, or keep a PDF to print or share with a tutor.</p>
      <div class="actions">
        <button class="btn primary" onClick={() => go({ name: "booklet" }, { name: "parent" })} data-testid="booklet-read">Read online</button>
        {a && <button class="btn" disabled={busy} onClick={download} data-testid="booklet-download">{busy ? "Preparing…" : "Download PDF"}</button>}
      </div>
      {err && <p class="alert-note" role="alert">{err}</p>}
    </section>
  );
}

/** Loads the booklet pages when the reader is opened, so they don't weigh down the rest of the app. */
export function BookletLoader() {
  const [built, setBuilt] = useState<Built | null>(null);
  useEffect(() => { void import("../booklet/model").then((m) => setBuilt(m.buildBooklet())); }, []);
  return built ? <Booklet built={built} /> : <main class="tt-screen"><p class="tt-lead" role="status">Opening the booklet…</p></main>;
}

const useSpread = () => {
  const q = "(min-width: 1000px) and (min-aspect-ratio: 5/4)";
  const [two, setTwo] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setTwo(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return two;
};

/** A flip-through reader: the pages of the booklet, one at a time on small screens and as a two-page spread on wide ones. */
function Booklet({ built }: { built: Built }) {
  const { leave } = useApp();
  const a = useAccount();
  const two = useSpread();
  const N = built.pages.length;
  // in a spread the cover is on its own, then pages go in pairs: 2–3, 4–5 …
  const spreads = useMemo(() => (two ? Array.from({ length: Math.ceil((N + 1) / 2) }, (_, i) => (i === 0 ? [1] : [2 * i, 2 * i + 1].filter((n) => n <= N))) : built.pages.map((p) => [p.n])), [two, N]);
  const [at, setAt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dir, setDir] = useState<1 | -1>(1);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 640 });
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { setAt((i) => Math.min(i, spreads.length - 1)); }, [spreads.length]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const r = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    r.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => r.disconnect();
  }, []);
  const go = (to: number) => { const next = Math.max(0, Math.min(spreads.length - 1, to)); if (next === at) return; setDir(next > at ? 1 : -1); setAt(next); box.current?.scrollTo({ top: 0, left: 0 }); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("select, input")) return;
      if (e.key === "ArrowRight") go(at + 1); else if (e.key === "ArrowLeft") go(at - 1); else if (e.key === "Home") go(0); else if (e.key === "End") go(spreads.length - 1); else if (e.key === "Escape") leave({ name: "parent" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const cur = spreads[at], wide = two ? 2 : 1;
  const fit = Math.min((size.w - 24) / (W * wide), (size.h - 12) / H);
  const scale = zoom === 1 ? fit : Math.max(fit, ((size.w - 24) / (W * wide)) * zoom);
  const label = cur.length === 2 ? `Pages ${cur[0]} and ${cur[1]} of ${N}` : `Page ${cur[0]} of ${N}`;
  const chapter = built.pages[cur[cur.length - 1] - 1].chapter;
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shown = two ? [cur[0] === 1 ? null : cur[0], cur[0] === 1 ? 1 : cur[1] ?? null] : [cur[0]];
  const download = async () => { try { await a?.downloadBooklet(); } catch { /* the Parents' area card explains problems; here the reader stays quiet */ } };
  return (
    <main class="bk-reader" data-testid="booklet-reader" aria-label="Curriculum booklet">
      <header class="bk-bar">
        <button type="button" class="btn small" onClick={() => leave({ name: "parent" })} data-testid="booklet-back"><Icon name="back" size={18} /> Back</button>
        <label class="bk-jump"><span class="sr">Jump to a chapter</span>
          <select value={chapter} onChange={(e) => { const c = built.contents.find((x) => x.chapter === (e.currentTarget as HTMLSelectElement).value); if (c) go(spreads.findIndex((s) => s.includes(c.page))); }} data-testid="booklet-chapter">
            {!built.contents.some((c) => c.chapter === chapter) && <option value={chapter}>{chapter}</option>}
            {built.contents.map((c) => <option key={c.chapter} value={c.chapter}>{c.chapter}</option>)}
          </select>
        </label>
        <span class="bk-zoom" role="group" aria-label="Zoom">
          <button type="button" class="btn small" aria-label="Zoom out" onClick={() => setZoom((z) => (z <= 1 ? 1 : z - 0.5))} disabled={zoom <= 1}>−</button>
          <button type="button" class="btn small" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}>+</button>
        </span>
        {a && <button type="button" class="btn small" onClick={download} data-testid="booklet-pdf">PDF</button>}
      </header>
      <div class="bk-stage" ref={box}
        onPointerDown={(e: PointerEvent) => { touch.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e: PointerEvent) => { const t = touch.current; touch.current = null; if (t && zoom === 1 && Math.abs(e.clientX - t.x) > 60 && Math.abs(e.clientX - t.x) > Math.abs(e.clientY - t.y) * 1.5) go(at + (e.clientX < t.x ? 1 : -1)); }}>
        <div class={`bk-frame${reduce ? "" : dir === 1 ? " turn-next" : " turn-back"}`} key={at} style={{ width: `${W * wide * scale}px`, height: `${H * scale}px` }}>
          <div class="bk-spread" style={{ width: `${W * wide}px`, height: `${H}px`, transform: `scale(${scale})` }}>
            {shown.map((n, i) => n ? <div key={n} class="bk-sheet" style={{ left: `${i * W}px` }} dangerouslySetInnerHTML={{ __html: built.pages[n - 1].html }} /> : <div key={`blank${i}`} class="bk-sheet blank" style={{ left: `${i * W}px` }} />)}
          </div>
        </div>
      </div>
      <footer class="bk-controls">
        <button type="button" class="btn" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous page" data-testid="booklet-prev">←</button>
        <span class="bk-label" role="status" aria-live="polite" data-testid="booklet-label">{label}</span>
        <button type="button" class="btn primary" onClick={() => go(at + 1)} disabled={at === spreads.length - 1} aria-label="Next page" data-testid="booklet-next">→</button>
      </footer>
    </main>
  );
}

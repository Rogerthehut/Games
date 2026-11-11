import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { summarise } from "../engine/tables";
import { useApp } from "./context";

/** True on screens wide enough for the side panel, and updates if the window changes. */
export function useWide(): boolean {
  const q = "(min-width: 900px)";
  const [wide, setWide] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia(q), on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

/** A little drawing of a times table grid with a big cross, so it is clear at a glance what the note is for. */
function TablesDoodle() {
  const squares: [number, number, string][] = [[6, 6, "#f6a0bc"], [26, 6, "none"], [46, 6, "#84d8ba"], [6, 26, "none"], [26, 26, "#f0be65"], [46, 26, "none"], [6, 46, "#c1c5ee"], [26, 46, "none"], [46, 46, "#f6a0bc"]];
  return (
    <svg class="tn-doodle" viewBox="0 0 70 70" aria-hidden="true" focusable="false" fill="none" stroke="#1d1b2e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      {squares.map(([x, y, fill], i) => <rect key={i} class="tn-sq" style={{ "--i": i }} x={x} y={y} width="16" height="16" rx="3.5" fill={fill} />)}
      <path class="tn-cross" d="M50 8 L64 22 M64 8 L50 22" stroke="#c2410c" stroke-width="3.6" />
    </svg>
  );
}

/**
 * A sticky note for the times tables, stuck to the side panel on wide screens (and to the top of Today on narrow ones),
 * so the way back to the tables is always one tap away. Square, with a drawing and marker writing a child can read.
 */
export function TablesNote({ variant }: { variant: "rail" | "inline" }) {
  const { profile, go } = useApp();
  const s = useMemo(() => summarise(profile), [profile]);
  const started = s.counts.new < s.total;
  const [peeling, setPeeling] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (peeling) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return go({ name: "tables" });
    setPeeling(true); // the note peels off the page for a moment, then the tables open
    timer.current = window.setTimeout(() => go({ name: "tables" }), 260);
  };
  return (
    <button type="button" class={`tables-note tables-note-${variant}${peeling ? " peeling" : ""}`} onClick={open} data-testid="start-tables"
      aria-label={started ? `Times tables. You have learned ${s.counts.quick} of ${s.total} facts. Tap to keep going.` : "Times tables. Tap to start learning your tables."}>
      <span class="tn-tape" aria-hidden="true" />
      <TablesDoodle />
      <span class="tn-title">Times tables</span>
      <span class="tn-line">{started ? `${s.counts.quick} of ${s.total} learned` : "Let's learn them!"}</span>
      <span class="tn-go">{started ? "Keep going" : "Tap me"}<span class="tn-arrow" aria-hidden="true"> →</span></span>
    </button>
  );
}

import { useEffect, useMemo, useState } from "preact/hooks";
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

/**
 * A sticky note for the times tables, stuck to the side panel on wide screens (and to the top of Today on narrow ones),
 * so the way back to the tables is always one tap away and never lost at the bottom of a page.
 */
export function TablesNote({ variant }: { variant: "rail" | "inline" }) {
  const { profile, go } = useApp();
  const s = useMemo(() => summarise(profile), [profile]);
  const started = s.counts.new < s.total;
  const line = started ? `${s.counts.quick} of ${s.total} facts quick` : "Learn them. Beat them.";
  return (
    <button type="button" class={`tables-note tables-note-${variant}`} onClick={() => go({ name: "tables" })} data-testid="start-tables"
      aria-label={`Times tables. ${started ? `${s.counts.quick} of ${s.total} facts are quick. Tap to carry on.` : "Tap to start learning your tables."}`}>
      <span class="tn-tape" aria-hidden="true" />
      <span class="tn-title">Times tables</span>
      <span class="tn-line">{line}</span>
      {started && <span class="tn-bar" aria-hidden="true"><i style={{ width: `${Math.round((100 * s.counts.quick) / s.total)}%` }} /></span>}
      <span class="tn-go">{started ? "Carry on" : "Let's go"} <span aria-hidden="true">→</span></span>
    </button>
  );
}

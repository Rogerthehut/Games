import { useRef, useState } from "preact/hooks";
import { Icon } from "./icons";
import { Scale } from "./instrument-figures";

/** Method sheets and manipulatives for the working-out panel. Nothing here marks anything: they are for thinking with. */

// ---------------------------------------------------------------------------------------------- number line
const RANGES = [10, 20, 50, 100];
type Jump = { from: number; to: number };

/** A number line to jump along: pick where to start, then add or take away. The jumps are drawn as arcs. */
export function NumberLineTool() {
  const [max, setMax] = useState(20);
  const [at, setAt] = useState(0);
  const [jumps, setJumps] = useState<Jump[]>([]);
  const W = 300, L = 14, span = W - 2 * L, X = (v: number) => L + (v / max) * span;
  const step = max <= 20 ? 1 : max <= 50 ? 5 : 10;
  const jump = (by: number) => {
    const to = Math.max(0, Math.min(max, at + by));
    if (to === at) return;
    setJumps((j) => [...j, { from: at, to }]); setAt(to);
  };
  const reset = (value: number) => { setAt(value); setJumps([]); };
  const steps = max <= 20 ? [1, 2, 5, 10] : max <= 50 ? [1, 5, 10, 20] : [1, 10, 50, 100].filter((n) => n <= max);
  return (
    <div class="sheet-tool number-line-tool">
      <p class="small muted">Tap the line to choose where to start. Then jump forwards or back.</p>
      <div class="working-tools" role="group" aria-label="Length of the line">
        {RANGES.map((r) => <button key={r} type="button" class="btn ghost" aria-pressed={r === max} onClick={() => { setMax(r); reset(0); }}>0 to {r}</button>)}
      </div>
      <svg class="sheet-svg" viewBox={`0 0 ${W} 110`} role="group" aria-label={`Number line from 0 to ${max}. You are on ${at}.`}
        onPointerDown={(e: PointerEvent) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const v = Math.round((((e.clientX - r.left) / r.width) * W - L) / span * max);
          reset(Math.max(0, Math.min(max, v)));
        }}>
        <line x1={L} y1="70" x2={W - L} y2="70" stroke="currentColor" stroke-width="2" />
        {Array.from({ length: max + 1 }, (_, v) => {
          const major = v % step === 0 || v === max;
          return <g key={v}><line x1={X(v)} y1={major ? 62 : 66} x2={X(v)} y2={major ? 78 : 74} stroke="currentColor" opacity={major ? 0.9 : 0.4} />{major && <text x={X(v)} y="94" text-anchor="middle" font-size="9" class="fig-label">{v}</text>}</g>;
        })}
        {jumps.map((j, i) => {
          const a = X(j.from), b = X(j.to), up = j.to > j.from, mid = (a + b) / 2, lift = Math.min(44, 14 + Math.abs(b - a) / 4);
          return <g key={i}><path d={`M ${a} 66 Q ${mid} ${66 - lift * 1.6} ${b} 66`} fill="none" stroke={up ? "#2563eb" : "#c2410c"} stroke-width="1.8" /><text x={mid} y={66 - lift * 0.8 - 3} text-anchor="middle" font-size="9" fill={up ? "#2563eb" : "#c2410c"}>{up ? "+" : "−"}{Math.abs(j.to - j.from)}</text></g>;
        })}
        <circle cx={X(at)} cy="70" r="5" fill="#f6a0bc" stroke="currentColor" stroke-width="1.6" />
      </svg>
      <p class="board-status" aria-live="polite">You are on <strong>{at}</strong>.</p>
      <div class="working-tools" role="group" aria-label="Jump">
        {steps.map((n) => <button key={`m${n}`} type="button" class="btn ghost" aria-label={`Back ${n}`} onClick={() => jump(-n)}>−{n}</button>)}
        {steps.map((n) => <button key={`p${n}`} type="button" class="btn ghost" aria-label={`Forward ${n}`} onClick={() => jump(n)}>+{n}</button>)}
      </div>
      <div class="working-tools">
        <button type="button" class="btn ghost" disabled={!jumps.length} onClick={() => { const last = jumps[jumps.length - 1]; setAt(last.from); setJumps(jumps.slice(0, -1)); }}><Icon name="undo" size={16} />Undo jump</button>
        <button type="button" class="btn ghost" disabled={!jumps.length && at === 0} onClick={() => reset(0)}>Start again</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- hundred square
const MULTIPLES = [2, 3, 4, 5, 10];

/** A hundred square to colour: for counting on, patterns and multiples. */
export function HundredSquareTool() {
  const [on, setOn] = useState<Set<number>>(new Set());
  const toggle = (n: number) => setOn((s) => { const next = new Set(s); next.has(n) ? next.delete(n) : next.add(n); return next; });
  const multiples = (k: number) => setOn(new Set(Array.from({ length: 100 }, (_, i) => i + 1).filter((n) => n % k === 0)));
  return (
    <div class="sheet-tool hundred-tool">
      <p class="small muted">Tap a number to colour it. Try the multiples to see the pattern.</p>
      <div class="hundred" role="group" aria-label="Hundred square">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" class={`hundred-cell${on.has(n) ? " on" : ""}`} aria-pressed={on.has(n)} aria-label={`${n}${on.has(n) ? ", coloured" : ""}`} onClick={() => toggle(n)}>{n}</button>
        ))}
      </div>
      <div class="working-tools" role="group" aria-label="Show multiples">
        {MULTIPLES.map((k) => <button key={k} type="button" class="btn ghost" onClick={() => multiples(k)}>Multiples of {k}</button>)}
        <button type="button" class="btn ghost" disabled={!on.size} onClick={() => setOn(new Set())}>Clear</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- fraction wall
const WALL = [1, 2, 3, 4, 5, 6, 8, 10, 12];

/** A fraction wall: every row is the same whole cut into more equal parts. Tap parts to shade them and compare rows. */
export function FractionWallTool() {
  const [on, setOn] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setOn((s) => { const next = new Set(s); next.has(key) ? next.delete(key) : next.add(key); return next; });
  return (
    <div class="sheet-tool wall-tool">
      <p class="small muted">Every row is the same size. Tap parts to shade them, then look down the wall to find equal amounts.</p>
      <div class="wall" role="group" aria-label="Fraction wall">
        {WALL.map((d) => (
          <div class="wall-row" key={d} style={{ gridTemplateColumns: `repeat(${d}, 1fr)` }}>
            {Array.from({ length: d }, (_, i) => {
              const key = `${d}:${i}`;
              return <button key={key} type="button" class={`wall-part${on.has(key) ? " on" : ""}`} aria-pressed={on.has(key)} aria-label={`Part ${i + 1} of ${d}${on.has(key) ? ", shaded" : ""}`} onClick={() => toggle(key)}>{d === 1 ? "1 whole" : `1/${d}`}</button>;
            })}
          </div>
        ))}
      </div>
      <button type="button" class="btn ghost" disabled={!on.size} onClick={() => setOn(new Set())}>Clear the wall</button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- column method
type Op = "add" | "subtract" | "multiply" | "divide";
const OPS: { id: Op; label: string; sign: string }[] = [{ id: "add", label: "Add", sign: "+" }, { id: "subtract", label: "Subtract", sign: "−" }, { id: "multiply", label: "Multiply", sign: "×" }, { id: "divide", label: "Divide", sign: "÷" }];
const COLS = 6;
const HEADS = ["", "TTh", "Th", "H", "T", "O"];

/** A frame for written methods: digits go in place-value columns, with a row for carrying. Nothing is checked. */
export function ColumnSheetTool() {
  const [op, setOp] = useState<Op>("add");
  const [cells, setCells] = useState<Record<string, string>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const rows: { id: string; label: string; small?: boolean; sign?: string; rule?: boolean }[] = op === "divide"
    ? [{ id: "q", label: "Answer" }, { id: "n", label: "Share this number", sign: "÷" }, { id: "r", label: "Remainders carried", small: true }]
    : op === "multiply"
      ? [{ id: "c", label: "Carry", small: true }, { id: "a", label: "First number" }, { id: "b", label: "Times", sign: "×" }, { id: "p1", label: "× ones", rule: true }, { id: "p2", label: "× tens", sign: "+" }, { id: "t", label: "Total", rule: true }]
      : [{ id: "c", label: "Carry", small: true }, { id: "a", label: "First number" }, { id: "b", label: op === "add" ? "Add" : "Take away", sign: op === "add" ? "+" : "−" }, { id: "t", label: "Answer", rule: true }];
  const set = (key: string, value: string) => setCells((c) => ({ ...c, [key]: value.replace(/\D/g, "").slice(-1) }));
  const move = (row: number, col: number, dr: number, dc: number) => {
    const r = Math.max(0, Math.min(rows.length - 1, row + dr)), c = Math.max(1, Math.min(COLS, col + dc));
    refs.current[`${rows[r].id}${c}`]?.focus();
  };
  return (
    <div class="sheet-tool column-tool">
      <div class="working-tools" role="group" aria-label="Which method">
        {OPS.map((o) => <button key={o.id} type="button" class="btn ghost" aria-pressed={op === o.id} onClick={() => { setOp(o.id); setCells({}); }}>{o.sign} {o.label}</button>)}
      </div>
      <p class="small muted">Type one digit in each box, lining up the columns. Arrow keys move between boxes.</p>
      <div class="column-sheet" role="group" aria-label="Written method">
        <div class="column-row heads" aria-hidden="true">{HEADS.map((h, i) => <span key={i} class="column-head">{h}</span>)}</div>
        {rows.map((row, ri) => (
          <div class={`column-row${row.small ? " small" : ""}${row.rule ? " rule" : ""}`} key={row.id} role="group" aria-label={row.label}>
            <span class="column-sign" aria-hidden="true">{row.sign ?? ""}</span>
            {Array.from({ length: COLS - 1 }, (_, i) => {
              const col = i + 1, key = `${row.id}${col}`;
              return (
                <input key={key} ref={(el) => { refs.current[key] = el; }} class="column-cell" inputMode="numeric" maxLength={2} autoComplete="off"
                  aria-label={`${row.label}, ${["ten thousands", "thousands", "hundreds", "tens", "ones"][i]}`} value={cells[key] ?? ""}
                  onInput={(e) => { set(key, e.currentTarget.value); if (e.currentTarget.value) move(ri, col, 0, -1); }}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    const d: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }, m = d[e.key];
                    if (m) { e.preventDefault(); move(ri, col, m[0], m[1]); }
                    else if (e.key === "Backspace" && !cells[key]) move(ri, col, 0, 1);
                  }} />
              );
            })}
          </div>
        ))}
      </div>
      <button type="button" class="btn ghost" disabled={!Object.values(cells).some(Boolean)} onClick={() => setCells({})}>Clear the sheet</button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- ruler and protractor
export type Placement = { x: number; y: number; rot: number };

/** A ruler or a protractor lying over the paper. Its body lets the pen through, so lines can be drawn along its edge; move it by its handle. */
export function PaperInstrument({ kind, at, onChange }: { kind: "ruler" | "protractor"; at: Placement; onChange: (p: Placement) => void }) {
  const drag = useRef(false);
  const ruler = kind === "ruler";
  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    const box = (e.currentTarget as HTMLElement).closest(".paper-wrap")!.getBoundingClientRect();
    onChange({ ...at, x: Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - box.top) / box.height) * 100)) });
  };
  return (
    <div class={`paper-instrument ${kind}`} style={{ left: `${at.x}%`, top: `${at.y}%`, transform: `translate(-50%, -50%) rotate(${at.rot}deg)` }}>
      {ruler ? (
        <svg viewBox="0 0 300 40" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="298" height="38" rx="3" fill="#f6e0a0" fill-opacity=".55" stroke="currentColor" stroke-width="1.4" />
          {Array.from({ length: 151 }, (_, i) => {
            const cm = i % 10 === 0, half = i % 5 === 0;
            return <line key={i} x1={i * 2} y1="1" x2={i * 2} y2={cm ? 16 : half ? 11 : 7} stroke="currentColor" stroke-width={cm ? 1 : 0.6} />;
          })}
          {Array.from({ length: 16 }, (_, i) => <text key={i} x={Math.min(Math.max(i * 20, 6), 294)} y="29" text-anchor="middle" font-size="9" class="fig-label">{i}</text>)}
        </svg>
      ) : (
        <svg viewBox="0 0 300 190" aria-hidden="true" focusable="false">
          <Scale />
          <g stroke="currentColor" stroke-width="1"><line x1="150" y1="158" x2="150" y2="178" /><line x1="140" y1="168" x2="160" y2="168" /></g>
        </svg>
      )}
      <button type="button" class="instrument-handle" aria-label={`Move the ${kind}`}
        onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={move as unknown as (e: PointerEvent) => void}
        onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}
        onKeyDown={(e) => {
          const d: Record<string, [number, number]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }, m = d[e.key];
          if (m) { e.preventDefault(); onChange({ ...at, x: Math.max(0, Math.min(100, at.x + m[0])), y: Math.max(0, Math.min(100, at.y + m[1])) }); }
        }}><Icon name="swap" size={16} /></button>
    </div>
  );
}

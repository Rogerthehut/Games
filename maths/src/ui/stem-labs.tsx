import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons";

/** Hands-on labs for the STEM area: small things to build and try, not questions to answer. Nothing here is marked or scored. */
export type LabId = "binary" | "robot" | "learn" | "qubit";
export const LABS: { id: LabId; title: string; blurb: string; theme: string }[] = [
  { id: "binary", title: "Binary lamps", blurb: "Switch lamps on and off to build numbers the way a computer does.", theme: "Computing" },
  { id: "robot", title: "Program the robot", blurb: "Queue up instructions to steer a robot to the star.", theme: "Computing" },
  { id: "learn", title: "Teach a machine", blurb: "Place red and blue dots, then see how a nearest-neighbour model decides.", theme: "AI and machine learning" },
  { id: "qubit", title: "Qubit playground", blurb: "Try the X and H gates and measure a qubit to see the chances.", theme: "Quantum ideas" },
];

export function Lab({ id, onBack }: { id: LabId; onBack: () => void }) {
  const lab = LABS.find((l) => l.id === id)!;
  return (
    <section class="lab" aria-labelledby="lab-title" data-testid={`lab-${id}`}>
      <div class="tt-top"><button type="button" class="btn" onClick={onBack} data-testid="lab-back"><Icon name="back" size={18} /> All labs</button></div>
      <h2 id="lab-title">{lab.title}</h2>
      <p class="small muted">{lab.blurb}</p>
      {id === "binary" && <BinaryLamps />}
      {id === "robot" && <RobotLab />}
      {id === "learn" && <LearnLab />}
      {id === "qubit" && <QubitLab />}
    </section>
  );
}

/* ---------------------------------------------------------------- binary lamps */
function BinaryLamps() {
  const [bits, setBits] = useState<boolean[]>(Array(8).fill(false));
  const [target, setTarget] = useState<number | null>(null);
  const value = bits.reduce((t, b, i) => t + (b ? 2 ** (7 - i) : 0), 0);
  const won = target !== null && value === target;
  const newTarget = () => { setTarget(1 + Math.floor(Math.random() * 63)); setBits(Array(8).fill(false)); };
  return (
    <div class="lab-body">
      <div class="lamps" role="group" aria-label="Eight binary lamps">
        {bits.map((on, i) => (
          <button key={i} type="button" class={`lamp${on ? " on" : ""}`} aria-pressed={on} aria-label={`Lamp worth ${2 ** (7 - i)}, ${on ? "on" : "off"}`} onClick={() => setBits(bits.map((b, j) => (j === i ? !b : b)))}>
            <span class="lamp-val">{2 ** (7 - i)}</span><span class="lamp-bit" aria-hidden="true">{on ? 1 : 0}</span>
          </button>
        ))}
      </div>
      <p class="lab-readout" aria-live="polite"><span class="mono">{bits.map((b) => (b ? 1 : 0)).join("")}</span> in binary is <strong>{value}</strong> in ordinary numbers.</p>
      <p class="small muted">Each lamp is worth double the one to its right. Add up the lamps that are on.</p>
      <div class="lab-actions">
        <button type="button" class="btn small" onClick={newTarget} data-testid="binary-challenge">{target === null ? "Give me a challenge" : "New challenge"}</button>
        <button type="button" class="btn small" onClick={() => setBits(Array(8).fill(false))}>Clear</button>
      </div>
      {target !== null && <p class={`lab-challenge${won ? " won" : ""}`} aria-live="polite">{won ? `Yes! ${target} is ${bits.map((b) => (b ? 1 : 0)).join("").replace(/^0+/, "")} in binary.` : `Make the number ${target} with the lamps.`}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- robot */
type Dir = "up" | "down" | "left" | "right";
const MAZES: { name: string; size: number; start: [number, number]; star: [number, number]; walls: string[] }[] = [
  { name: "Easy walk", size: 5, start: [0, 4], star: [3, 4], walls: [] },
  { name: "Round the rock", size: 5, start: [0, 4], star: [4, 0], walls: ["2,4", "2,3", "2,2"] },
  { name: "The zigzag", size: 6, start: [0, 5], star: [5, 0], walls: ["1,5", "1,4", "1,3", "3,0", "3,1", "3,2", "3,3", "4,3"] },
];
const ARROW: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function RobotLab() {
  const [level, setLevel] = useState(0);
  const maze = MAZES[level];
  const [prog, setProg] = useState<Dir[]>([]);
  const [pos, setPos] = useState<[number, number]>(maze.start);
  const [step, setStep] = useState(-1);
  const [msg, setMsg] = useState("");
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const reset = (l = level) => { clearTimeout(timer.current); setProg([]); setPos(MAZES[l].start); setStep(-1); setMsg(""); };
  const pick = (l: number) => { setLevel(l); reset(l); };
  const run = () => {
    clearTimeout(timer.current);
    let p: [number, number] = maze.start;
    setPos(p); setMsg("");
    const go = (i: number) => {
      if (i >= prog.length) { setStep(-1); setMsg(p[0] === maze.star[0] && p[1] === maze.star[1] ? "You did it! The robot reached the star." : "The robot has run out of instructions. Change the program and try again."); return; }
      const [dx, dy] = DELTA[prog[i]], nx = p[0] + dx, ny = p[1] + dy;
      setStep(i);
      if (nx < 0 || ny < 0 || nx >= maze.size || ny >= maze.size || maze.walls.includes(`${nx},${ny}`)) { setMsg(`Bump! The robot hit ${nx < 0 || ny < 0 || nx >= maze.size || ny >= maze.size ? "the edge" : "a rock"} on step ${i + 1}. Find the bug and try again.`); return; }
      p = [nx, ny]; setPos(p);
      timer.current = window.setTimeout(() => go(i + 1), matchMedia("(prefers-reduced-motion: reduce)").matches ? 60 : 380);
    };
    timer.current = window.setTimeout(() => go(0), 150);
  };
  const cell = 300 / maze.size;
  return (
    <div class="lab-body">
      <div class="chips-row" role="group" aria-label="Choose a level">
        {MAZES.map((m, i) => <button key={m.name} type="button" class={`chip-btn${i === level ? " on" : ""}`} aria-pressed={i === level} onClick={() => pick(i)}>{i + 1}. {m.name}</button>)}
      </div>
      <svg class="robot-grid" viewBox="0 0 300 300" role="img" aria-label={`A ${maze.size} by ${maze.size} grid. The robot is at column ${pos[0] + 1}, row ${pos[1] + 1}. The star is at column ${maze.star[0] + 1}, row ${maze.star[1] + 1}.`}>
        {Array.from({ length: maze.size * maze.size }, (_, i) => { const x = i % maze.size, y = Math.floor(i / maze.size), wall = maze.walls.includes(`${x},${y}`); return <rect key={i} x={x * cell + 1} y={y * cell + 1} width={cell - 2} height={cell - 2} rx="6" fill={wall ? "#8a7f6a" : "var(--surface)"} stroke="currentColor" stroke-opacity=".25" />; })}
        <text x={maze.star[0] * cell + cell / 2} y={maze.star[1] * cell + cell / 2 + 10} text-anchor="middle" font-size={cell * 0.6}>⭐</text>
        <g style={{ transform: `translate(${pos[0] * cell + cell / 2}px, ${pos[1] * cell + cell / 2}px)`, transition: "transform 260ms ease" }}>
          <rect x={-cell * 0.3} y={-cell * 0.3} width={cell * 0.6} height={cell * 0.6} rx="8" fill="#c1c5ee" stroke="currentColor" stroke-width="2.5" /><circle cx={-cell * 0.1} cy={-cell * 0.05} r="3" fill="currentColor" /><circle cx={cell * 0.1} cy={-cell * 0.05} r="3" fill="currentColor" /><line x1={-cell * 0.1} y1={cell * 0.1} x2={cell * 0.1} y2={cell * 0.1} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </g>
      </svg>
      <div class="prog" aria-label="Your program" aria-live="polite">
        {prog.length === 0 ? <span class="muted small">Your program is empty. Add some arrows.</span> : prog.map((d, i) => <span key={i} class={`prog-step${i === step ? " now" : ""}`}>{ARROW[d]}</span>)}
      </div>
      <div class="lab-actions" role="group" aria-label="Add an instruction">
        {(["left", "up", "down", "right"] as Dir[]).map((d) => <button key={d} type="button" class="btn small" aria-label={`Add ${d}`} disabled={prog.length >= 16} onClick={() => setProg([...prog, d])}>{ARROW[d]}</button>)}
        <button type="button" class="btn small" onClick={() => setProg(prog.slice(0, -1))} disabled={!prog.length}>Undo</button>
      </div>
      <div class="lab-actions">
        <button type="button" class="btn primary small" onClick={run} disabled={!prog.length} data-testid="robot-run">Run program</button>
        <button type="button" class="btn small" onClick={() => reset()}>Start again</button>
      </div>
      {msg && <p class={`lab-challenge${msg.startsWith("You did") ? " won" : ""}`} role="status">{msg}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- teach a machine */
type Dot = { x: number; y: number; c: "red" | "blue" };
const PRESETS: { name: string; dots: Dot[] }[] = [
  { name: "Two clear groups", dots: [{ x: 2, y: 2, c: "red" }, { x: 3, y: 4, c: "red" }, { x: 1.5, y: 5, c: "red" }, { x: 8, y: 7, c: "blue" }, { x: 7, y: 8.5, c: "blue" }, { x: 8.5, y: 5.5, c: "blue" }] },
  { name: "Lopsided data", dots: [{ x: 2, y: 2, c: "red" }, { x: 3, y: 4, c: "red" }, { x: 1.5, y: 5, c: "red" }, { x: 4, y: 3, c: "red" }, { x: 3, y: 7, c: "red" }, { x: 5, y: 5, c: "red" }, { x: 7, y: 8, c: "blue" }] },
  { name: "One odd dot", dots: [{ x: 2, y: 2, c: "red" }, { x: 3, y: 4, c: "red" }, { x: 8, y: 7, c: "blue" }, { x: 7, y: 8.5, c: "blue" }, { x: 8.5, y: 5.5, c: "blue" }, { x: 7.5, y: 7, c: "red" }] },
];
const nearest = (dots: Dot[], x: number, y: number) => dots.reduce<{ d: Dot; dist: number } | null>((best, d) => { const dist = (d.x - x) ** 2 + (d.y - y) ** 2; return !best || dist < best.dist ? { d, dist } : best; }, null);

function LearnLab() {
  const [dots, setDots] = useState<Dot[]>(PRESETS[0].dots);
  const [colour, setColour] = useState<"red" | "blue" | "test">("red");
  const [test, setTest] = useState<{ x: number; y: number } | null>(null);
  const [regions, setRegions] = useState(true);
  const place = (e: MouseEvent) => {
    const svg = e.currentTarget as SVGSVGElement, r = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100) / 10, y = Math.round((1 - (e.clientY - r.top) / r.height) * 100) / 10;
    if (colour === "test") setTest({ x, y }); else setDots([...dots, { x, y, c: colour }]);
  };
  const near = test && dots.length ? nearest(dots, test.x, test.y) : null;
  const X = (v: number) => v * 30, Y = (v: number) => 300 - v * 30;
  const cells = regions && dots.length ? Array.from({ length: 400 }, (_, i) => { const cx = (i % 20) / 2 + 0.25, cy = Math.floor(i / 20) / 2 + 0.25, n = nearest(dots, cx, cy)!; return { x: cx - 0.25, y: cy - 0.25, c: n.d.c }; }) : [];
  const reds = dots.filter((d) => d.c === "red").length, blues = dots.length - reds;
  return (
    <div class="lab-body">
      <div class="chips-row" role="group" aria-label="Choose a starting set of dots">
        {PRESETS.map((p) => <button key={p.name} type="button" class="chip-btn" onClick={() => { setDots(p.dots); setTest(null); }}>{p.name}</button>)}
        <button type="button" class="chip-btn" onClick={() => { setDots([]); setTest(null); }}>Clear</button>
      </div>
      <div class="chips-row" role="group" aria-label="What happens when you tap the grid">
        <button type="button" class={`chip-btn tone-red${colour === "red" ? " on" : ""}`} aria-pressed={colour === "red"} onClick={() => setColour("red")}>Add red</button>
        <button type="button" class={`chip-btn tone-blue${colour === "blue" ? " on" : ""}`} aria-pressed={colour === "blue"} onClick={() => setColour("blue")}>Add blue</button>
        <button type="button" class={`chip-btn${colour === "test" ? " on" : ""}`} aria-pressed={colour === "test"} onClick={() => setColour("test")} data-testid="learn-test">Test a new dot</button>
      </div>
      <svg class="learn-grid" viewBox="0 0 300 300" onClick={place as unknown as (e: MouseEvent) => void} role="img" aria-label={`A grid with ${reds} red dots and ${blues} blue dots.${near ? ` The test dot is nearest to a ${near.d.c} dot, so the model says ${near.d.c}.` : ""}`}>
        {cells.map((c, i) => <rect key={i} x={X(c.x)} y={Y(c.y + 0.5)} width="15" height="15" fill={c.c === "red" ? "#f6a0bc" : "#c1c5ee"} opacity=".45" />)}
        <rect x="0" y="0" width="300" height="300" fill="none" stroke="currentColor" stroke-width="2" />
        {dots.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="8" fill={d.c === "red" ? "#f6a0bc" : "#c1c5ee"} stroke="currentColor" stroke-width="2.5" />)}
        {test && near && <g><line x1={X(test.x)} y1={Y(test.y)} x2={X(near.d.x)} y2={Y(near.d.y)} stroke="#c2410c" stroke-width="2.5" stroke-dasharray="6 4" /><circle cx={X(test.x)} cy={Y(test.y)} r="10" fill={near.d.c === "red" ? "#f6a0bc" : "#c1c5ee"} stroke="#c2410c" stroke-width="3.5" /><text x={X(test.x)} y={Y(test.y) + 5} text-anchor="middle" font-size="14" font-weight="800">?</text></g>}
      </svg>
      <label class="lab-check"><input type="checkbox" checked={regions} onChange={(e) => setRegions((e.currentTarget as HTMLInputElement).checked)} /> Show what the model would decide everywhere</label>
      <p class="lab-readout" aria-live="polite">{near ? <>The test dot is nearest to a <strong>{near.d.c}</strong> dot, so the model says <strong>{near.d.c}</strong>.</> : dots.length ? "Choose “Test a new dot” and tap the grid to see what the model decides." : "Add some red and blue dots to teach the model."}</p>
      {reds + blues > 0 && (reds === 0 || blues === 0 || Math.max(reds, blues) >= 4 * Math.min(reds, blues)) && <p class="small muted">Notice how little the model has seen of one colour. With lopsided data it will say the common colour almost everywhere. That is how bias creeps in.</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- qubit */
function QubitLab() {
  const [amp, setAmp] = useState<[number, number]>([1, 0]);
  const [log, setLog] = useState<string[]>(["Start: the qubit is |0⟩."]);
  const [counts, setCounts] = useState<[number, number] | null>(null);
  const p1 = Math.round(amp[1] * amp[1] * 1000) / 10, p0 = Math.round((100 - p1) * 10) / 10;
  const apply = (g: "X" | "H") => {
    const [a, b] = amp, k = Math.SQRT1_2;
    const next: [number, number] = g === "X" ? [b, a] : [k * (a + b), k * (a - b)];
    const clean = (n: number) => (Math.abs(n) < 1e-9 ? 0 : n);
    setAmp([clean(next[0]), clean(next[1])]); setCounts(null);
    setLog((l) => [...l.slice(-5), `Applied ${g}.`]);
  };
  const measure = () => {
    const r = Math.random() < amp[1] * amp[1] ? 1 : 0;
    setAmp(r ? [0, 1] : [1, 0]); setCounts(null);
    setLog((l) => [...l.slice(-5), `Measured: ${r}. The qubit is now |${r}⟩.`]);
  };
  const many = () => { let ones = 0; for (let i = 0; i < 100; i++) if (Math.random() < amp[1] * amp[1]) ones++; setCounts([100 - ones, ones]); };
  const reset = () => { setAmp([1, 0]); setCounts(null); setLog(["Start: the qubit is |0⟩."]); };
  const fmt = (n: number) => (Math.abs(n) < 0.0005 ? "0" : (Math.round(n * 1000) / 1000).toString());
  return (
    <div class="lab-body">
      <p class="lab-readout mono" aria-live="polite">{fmt(amp[0])} |0⟩ {amp[1] < 0 ? "−" : "+"} {fmt(Math.abs(amp[1]))} |1⟩</p>
      <div class="qbars" role="img" aria-label={`Chance of measuring 0: ${p0} percent. Chance of measuring 1: ${p1} percent.`}>
        <div class="qbar-col"><div class="qbar-fill z" style={{ height: `${p0}%` }} /><span>0: {p0}%</span></div>
        <div class="qbar-col"><div class="qbar-fill o" style={{ height: `${p1}%` }} /><span>1: {p1}%</span></div>
      </div>
      <div class="lab-actions" role="group" aria-label="Gates and measurement">
        <button type="button" class="btn small" onClick={() => apply("X")} data-testid="qubit-x">X gate</button>
        <button type="button" class="btn small" onClick={() => apply("H")} data-testid="qubit-h">H gate</button>
        <button type="button" class="btn primary small" onClick={measure} data-testid="qubit-measure">Measure once</button>
        <button type="button" class="btn small" onClick={many}>Measure 100 copies</button>
        <button type="button" class="btn small" onClick={reset}>Reset</button>
      </div>
      {counts && <p class="lab-readout" aria-live="polite">Of 100 identical qubits: <strong>{counts[0]}</strong> gave 0 and <strong>{counts[1]}</strong> gave 1. The chances show up over many measurements, not in one.</p>}
      <ul class="lab-log small muted" aria-label="What you did">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <p class="small muted">X swaps 0 and 1. H turns a definite 0 or 1 into an equal mix, and using H twice undoes it. A single measurement always gives exactly 0 or 1, and then the qubit stays that way.</p>
    </div>
  );
}

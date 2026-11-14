import { useMemo, useRef, useState } from "preact/hooks";
import { advance, COLOUR_PICTURES, coloursNeeded, countRound, DIGIT_STROKES, shapeRound, sumRound, waypoints, type ColourPicture, type Pt, type ShapeKind } from "../engine/little";
import { mulberry32 } from "../engine/rng";
import { Icon } from "./icons";
import { blip, Burst, buzz, CritterArt, say, ShapeArt, SHAPE_NAME, type Critter } from "./little-bits";

/** The five activities. Every touch answers back (a pop, a wobble, a sound, a voice); nothing is marked wrong. Each calls onDone() when a round is finished. */
interface GameProps { max: number; onDone: () => void }
const seed = () => mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const SPOTS = [[18, 22], [50, 14], [82, 24], [30, 52], [66, 50], [14, 78], [48, 80], [84, 76], [38, 34], [72, 30]] as const;
const AGAIN = (go: () => void) => <button type="button" class="little-next" onClick={go} aria-label="Again" data-testid="little-again"><Icon name="arrow" size={34} /></button>;

export function CountGame({ max, onDone }: GameProps) {
  const [round, setRound] = useState(() => countRound(seed(), max));
  const [tapped, setTapped] = useState<number[]>([]);
  const done = tapped.length === round.n;
  const tap = (i: number) => {
    if (tapped.includes(i)) return;
    const next = [...tapped, i]; setTapped(next); blip(next.length - 1); buzz();
    say(WORDS[next.length]);
    if (next.length === round.n) { setTimeout(() => { blip(0, "win"); say(`${WORDS[round.n]}! Well done!`); }, 700); onDone(); }
  };
  const again = () => { setRound(countRound(seed(), max)); setTapped([]); };
  return (
    <div class="little-play" data-testid="little-count">
      <p class="little-prompt" aria-live="polite">{done ? `${round.n}!` : "Tap each one to count"}</p>
      <div class="little-field">
        {Array.from({ length: round.n }, (_, i) => (
          <button key={i} type="button" class={`little-thing${tapped.includes(i) ? " counted" : ""}`} style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%`, animationDelay: `${i * 90}ms` }}
            onClick={() => tap(i)} aria-label={tapped.includes(i) ? `counted ${tapped.indexOf(i) + 1}` : "tap to count"} data-testid="little-thing">
            <CritterArt kind={round.kind as Critter} />{tapped.includes(i) && <b class="little-badge">{tapped.indexOf(i) + 1}</b>}
          </button>
        ))}
      </div>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

export function TraceGame({ max, onDone }: GameProps) {
  const [digit, setDigit] = useState(() => (max <= 5 ? 1 : 1));
  const stroke = DIGIT_STROKES[digit][0], pts = useMemo(() => waypoints(stroke), [digit]);
  const [next, setNext] = useState(0);
  const svg = useRef<SVGSVGElement>(null), down = useRef(false);
  const done = next >= pts.length;
  const at = (e: PointerEvent): Pt => { const r = svg.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 140]; };
  const move = (e: PointerEvent) => {
    if (!down.current || done) return;
    const n = advance(pts, next, at(e));
    if (n !== next) { setNext(n); blip(Math.floor(n / 3), "tap"); if (n >= pts.length) { blip(0, "win"); say(WORDS[digit]); buzz(30); onDone(); } }
  };
  const nextDigit = () => { const d = digit >= max && max < 9 ? 1 : (digit + 1) % 10; setDigit(d === 0 && max <= 5 ? 1 : d); setNext(0); };
  const pathD = (list: Pt[]) => list.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const reached = pts.slice(0, Math.max(1, next));
  const tip = pts[Math.min(next, pts.length - 1)];
  return (
    <div class="little-play" data-testid="little-trace">
      <p class="little-prompt">{done ? `${digit}!` : `Trace the ${WORDS[digit]}`}</p>
      <svg ref={svg} class="little-trace" viewBox="0 0 100 140" role="img" aria-label={`The number ${digit}. Draw along the dotted line with your finger.`} data-testid="trace-pad"
        onPointerDown={(e) => { down.current = true; (e.currentTarget as Element).setPointerCapture(e.pointerId); move(e); }} onPointerMove={move}
        onPointerUp={() => { down.current = false; }} onPointerCancel={() => { down.current = false; }}>
        <path d={pathD(pts)} class="trace-guide" />
        <path d={pathD(reached)} class="trace-ink" />
        {pts.map(([x, y], i) => i % 3 === 0 && i >= next ? <circle key={i} cx={x} cy={y} r="1.7" class="trace-dot" /> : null)}
        {!done && <circle cx={tip[0]} cy={tip[1]} r="5" class="trace-tip" />}
      </svg>
      {done && <><Burst />{AGAIN(nextDigit)}</>}
    </div>
  );
}

export function AddGame({ max, onDone }: GameProps) {
  const [round, setRound] = useState(() => sumRound(seed(), Math.min(max, 6)));
  const adding = round.op === "add";
  const [moved, setMoved] = useState(0);                       // ducks that have hopped in, or biscuits eaten
  const left = round.change - moved, here = adding ? round.start + moved : round.start - moved;
  const done = moved === round.change;
  const tap = () => {
    if (done) return;
    const m = moved + 1; setMoved(m); blip(adding ? round.start + m - 1 : m, "tap"); buzz();
    const total = adding ? round.start + m : round.start - m; say(WORDS[total]);
    if (m === round.change) { setTimeout(() => { blip(0, "win"); say(adding ? `${WORDS[round.start]} and ${WORDS[round.change]} more is ${WORDS[round.result]}` : `${WORDS[round.start]} take away ${WORDS[round.change]} leaves ${WORDS[round.result]}`); }, 800); onDone(); }
  };
  const again = () => { setRound(sumRound(seed(), Math.min(max, 6))); setMoved(0); };
  const thing: Critter = adding ? "duck" : "biscuit";
  const row = (n: number, tappable: boolean) => Array.from({ length: n }, (_, i) => tappable
    ? <button key={`t${i}`} type="button" class={`little-mini little-wait${i === 0 ? " first" : ""}`} onClick={tap} aria-label={adding ? "send a duck to the pond" : "eat a biscuit"} data-testid="little-move"><CritterArt kind={thing} /></button>
    : <span key={`s${i}`} class="little-mini"><CritterArt kind={thing} /></span>);
  return (
    <div class="little-play" data-testid="little-add">
      <p class="little-prompt" aria-live="polite">{done ? `${round.result}!` : adding ? "Tap the ducks to send them to the pond" : "Tap a biscuit to eat it"}</p>
      <div class={`little-scene ${adding ? "pond" : "plate"}`}>
        <div class="little-group" aria-label={adding ? `${here} ducks in the pond` : `${here} biscuits on the plate`}>{row(here, false)}</div>
      </div>
      {!done && <div class="little-bank">{row(left, true)}</div>}
      <p class="little-sum" aria-label="the sum">
        <b>{round.start}</b><span>{adding ? "+" : "−"}</span><b>{round.change}</b><span>=</span><b class={done ? "show" : "hide"}>{done ? round.result : "?"}</b>
      </p>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

const SHAPE_COLOURS: Record<ShapeKind, string> = { circle: "#f782a9", square: "#8294e9", triangle: "#f5dc63", star: "#4cc6a7" };
export function ShapesGame({ max, onDone }: GameProps) {
  const count = max <= 5 ? 2 : 4;
  const [round, setRound] = useState(() => { const r = seed(), s = shapeRound(r, count); return { shapes: s, holes: [...s].sort(() => r() - 0.5) }; });
  const [placed, setPlaced] = useState<ShapeKind[]>([]);
  const [drag, setDrag] = useState<{ kind: ShapeKind; x: number; y: number; ox: number; oy: number } | null>(null);
  const [bounce, setBounce] = useState<ShapeKind | null>(null);
  const done = placed.length === count;
  const start = (kind: ShapeKind, e: PointerEvent) => { const r = (e.currentTarget as Element).getBoundingClientRect(); (e.currentTarget as Element).setPointerCapture(e.pointerId); setDrag({ kind, x: 0, y: 0, ox: e.clientX, oy: e.clientY }); say(SHAPE_NAME[kind]); void r; };
  const move = (e: PointerEvent) => { if (drag) setDrag({ ...drag, x: e.clientX - drag.ox, y: e.clientY - drag.oy }); };
  const drop = (e: PointerEvent) => {
    if (!drag) return;
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((el) => (el as HTMLElement).dataset?.hole) as HTMLElement | undefined;
    if (hit && hit.dataset.hole === drag.kind) {
      const next = [...placed, drag.kind]; setPlaced(next); blip(next.length, "tap"); buzz(20);
      if (next.length === count) { setTimeout(() => { blip(0, "win"); say("All done! Well done!"); }, 500); onDone(); }
    } else { setBounce(drag.kind); blip(0, "oops"); setTimeout(() => setBounce(null), 500); }
    setDrag(null);
  };
  const again = () => { const r = seed(), s = shapeRound(r, count); setRound({ shapes: s, holes: [...s].sort(() => r() - 0.5) }); setPlaced([]); };
  return (
    <div class="little-play" data-testid="little-shapes">
      <p class="little-prompt">{done ? "All in!" : "Drag each shape to its hole"}</p>
      <div class="little-holes">
        {round.holes.map((k) => <div key={k} class={`little-hole${placed.includes(k) ? " filled" : ""}`} data-hole={k} data-testid={`hole-${k}`}><ShapeArt kind={k} colour={SHAPE_COLOURS[k]} outline={!placed.includes(k)} /></div>)}
      </div>
      <div class="little-tray">
        {round.shapes.filter((k) => !placed.includes(k)).map((k) => (
          <div key={k} class={`little-shape${drag?.kind === k ? " dragging" : ""}${bounce === k ? " bounce" : ""}`} style={drag?.kind === k ? { transform: `translate(${drag.x}px, ${drag.y}px) scale(1.15)` } : undefined}
            onPointerDown={(e) => start(k, e)} onPointerMove={move} onPointerUp={drop} onPointerCancel={() => setDrag(null)} data-testid={`shape-${k}`} role="img" aria-label={`${SHAPE_NAME[k]}, drag to its hole`}>
            <ShapeArt kind={k} colour={SHAPE_COLOURS[k]} />
          </div>
        ))}
      </div>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

export function ColourGame({ onDone }: GameProps) {
  const [picNo, setPicNo] = useState(() => Math.floor(Math.random() * COLOUR_PICTURES.length));
  const pic: ColourPicture = COLOUR_PICTURES[picNo % COLOUR_PICTURES.length], need = coloursNeeded(pic);
  const [chosen, setChosen] = useState(need[0]);
  const [filled, setFilled] = useState<Record<number, true>>({});
  const [shake, setShake] = useState<number | null>(null);
  const total = pic.cells.filter((c) => c > 0).length, done = Object.keys(filled).length === total;
  const tap = (i: number) => {
    const n = pic.cells[i]; if (!n || filled[i]) return;
    if (n === chosen) {
      const f = { ...filled, [i]: true as const }; setFilled(f); blip(Object.keys(f).length % 8); buzz();
      if (Object.keys(f).length === total) { setTimeout(() => { blip(0, "win"); say(`You made ${pic.name}!`); }, 500); onDone(); }
    } else { setShake(i); blip(0, "oops"); setTimeout(() => setShake(null), 450); }
  };
  const again = () => { const n = picNo + 1; setPicNo(n); setFilled({}); setChosen(coloursNeeded(COLOUR_PICTURES[n % COLOUR_PICTURES.length])[0]); };
  return (
    <div class="little-play" data-testid="little-colour">
      <p class="little-prompt">{done ? `${pic.name[0].toUpperCase()}${pic.name.slice(1)}!` : "Pick a colour, then tap its number"}</p>
      <div class="little-palette" role="group" aria-label="Colours">
        {need.map((n) => <button key={n} type="button" class={`little-swatch${chosen === n ? " on" : ""}`} style={{ background: pic.palette[n] }} onClick={() => { setChosen(n); blip(n); say(WORDS[n]); }} aria-pressed={chosen === n} aria-label={`colour ${n}`} data-testid={`swatch-${n}`}>{n}</button>)}
      </div>
      <div class="little-picture" style={{ gridTemplateColumns: `repeat(${pic.size}, 1fr)` }}>
        {pic.cells.map((n, i) => n === 0 ? <span key={i} class="little-cell empty" /> :
          <button key={i} type="button" class={`little-cell${filled[i] ? " filled" : ""}${shake === i ? " shake" : ""}`} style={filled[i] ? { background: pic.palette[n] } : undefined} onClick={() => tap(i)} aria-label={filled[i] ? "coloured in" : `number ${n}`} data-testid={`cell-${i}`}>{filled[i] ? "" : n}</button>)}
      </div>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { advance, countRound, DIGIT_PATHS, shapeCount, shapeRound, shapesFor, type LittleStage, sumRound, waypoints, type Pt, type ShapeKind } from "../engine/little";
import { mulberry32 } from "../engine/rng";
import { artFor, artNumbers } from "../engine/little-art";
import { Icon } from "./icons";
import { blip, Burst, buzz, CritterArt, say, ShapeArt, SHAPE_NAME, type Critter } from "./little-bits";

/** The five activities. Every touch answers back (a pop, a wobble, a sound, a voice); nothing is marked wrong. Each calls onDone() when a round is finished. */
interface GameProps { max: number; stage?: LittleStage; onDone: () => void }
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
  const pts = useMemo(() => waypoints(DIGIT_PATHS[digit]), [digit]);
  const [next, setNext] = useState(0);
  const svg = useRef<SVGSVGElement>(null), down = useRef(false);
  const done = next >= pts.length;
  const at = (e: PointerEvent): Pt => { const r = svg.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 140]; };
  const move = (e: PointerEvent) => {
    if (!down.current || done) return;
    const n = advance(pts, next, at(e));
    if (n !== next) { setNext(n); blip(Math.floor(n / 6), "tap"); if (n >= pts.length) { blip(0, "win"); say(WORDS[digit]); buzz(30); onDone(); } }
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
        {pts.map(([x, y], i) => i % 5 === 0 && i >= next ? <circle key={i} cx={x} cy={y} r="1.7" class="trace-dot" /> : null)}
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

const SHAPE_COLOURS: Record<ShapeKind, string> = {
  circle: "#f782a9", square: "#8294e9", triangle: "#f5dc63", star: "#4cc6a7", rectangle: "#f08a3c", oval: "#b58be8", diamond: "#6ab7e8", heart: "#ef6f6c",
  pentagon: "#7fd36a", hexagon: "#f9a8d0", octagon: "#e8c15a", semicircle: "#5fc3c8", crescent: "#f5dc63", cross: "#f782a9", trapezium: "#8294e9",
};
export function ShapesGame({ max, stage = max <= 5 ? "nursery" : "reception", onDone }: GameProps) {
  const count = shapeCount(stage), pool = shapesFor(stage);
  const [round, setRound] = useState(() => { const r = seed(), s = shapeRound(r, count, pool); return { shapes: s, holes: [...s].sort(() => r() - 0.5) }; });
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
  const again = () => { const r = seed(), s = shapeRound(r, count, pool); setRound({ shapes: s, holes: [...s].sort(() => r() - 0.5) }); setPlaced([]); };
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

export function ColourGame({ max, stage = max <= 5 ? "nursery" : "reception", onDone }: GameProps) {
  const pool = artFor(stage);
  const [no, setNo] = useState(() => Math.floor(Math.random() * pool.length));
  const art = pool[no % pool.length], need = artNumbers(art);
  const [chosen, setChosen] = useState(need[0]);
  const [filled, setFilled] = useState<Record<number, true>>({});
  const [shake, setShake] = useState<number | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [spots, setSpots] = useState<[number, number, number][]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const total = art.regions.length, count = Object.keys(filled).length, done = count === total;
  // number labels sit in the middle of each shape (or where the picture says), found once the picture is on the screen
  useEffect(() => {
    const els = svg.current?.querySelectorAll<SVGPathElement>("path[data-r]"); if (!els) return;
    setSpots(Array.from(els).map((el, i) => { const at = art.regions[i].at, b = el.getBBox(), size = Math.max(3.4, Math.min(8, Math.min(b.width, b.height) * 0.6)); return (at ? [at[0], at[1], size] : [b.x + b.width / 2, b.y + b.height / 2, size]) as [number, number, number]; }));
  }, [art.id]);
  const tap = (i: number) => {
    const r = art.regions[i]; if (filled[i]) return;
    if (r.n === chosen) {
      const f = { ...filled, [i]: true as const }; setFilled(f); blip(Object.keys(f).length % 8); buzz();
      if (Object.keys(f).length === total) { setTimeout(() => { blip(0, "win"); say(`You made ${art.name}!`); }, 500); onDone(); }
    } else { setShake(i); setHint(r.n); blip(0, "oops"); setTimeout(() => { setShake(null); setHint(null); }, 900); }
  };
  const again = () => { const n = no + 1; setNo(n); setFilled({}); setChosen(artNumbers(pool[n % pool.length])[0]); };
  return (
    <div class="little-play" data-testid="little-colour">
      <p class="little-prompt">{done ? `${art.name[0].toUpperCase()}${art.name.slice(1)}!` : "Pick a colour, then tap its number"}</p>
      <div class="little-palette" role="group" aria-label="Colours">
        {need.map((n) => <button key={n} type="button" class={`little-swatch${chosen === n ? " on" : ""}${hint === n ? " hint" : ""}`} style={{ background: art.palette[n] }} onClick={() => { setChosen(n); blip(n); say(WORDS[n] ?? String(n)); }} aria-pressed={chosen === n} aria-label={`colour ${n}`} data-testid={`swatch-${n}`}>{n}</button>)}
      </div>
      <svg ref={svg} class="little-art" viewBox="0 0 100 100" role="group" aria-label={`Colour by number: ${art.name}`}>
        {art.regions.map((r, i) => (
          <path key={`${art.id}${i}`} d={r.d} data-r={i} data-n={r.n} data-testid={`region-${i}`} class={`art-region${filled[i] ? " filled" : ""}${shake === i ? " shake" : ""}`}
            fill={filled[i] ? art.palette[r.n] : "#fff"} stroke="#121522" stroke-width="0.9" stroke-linejoin="round" onPointerDown={(e) => { e.preventDefault(); tap(i); }} />
        ))}
        {art.decor.map((d, i) => <path key={`d${i}`} d={d.d} fill={d.fill ?? "none"} stroke={d.stroke ?? "none"} stroke-width={d.w ?? 1} stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />)}
        {spots.map(([x, y, size], i) => !filled[i] && art.regions[i] ? <text key={`n${i}`} x={x} y={y} class="art-num" style={{ fontSize: `${size}px` }} pointer-events="none">{art.regions[i].n}</text> : null)}
      </svg>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

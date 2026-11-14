import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { advance, buildMax, isSnap, snapDeck, snapMax, SNAP_THINGS, type SnapCard, digitsOf, hundredMax, readOptions, splitTens, DIGIT_PATHS, shapeCount, shapesFor, type LittleStage, sumRound, waypoints, type Pt, type ShapeKind } from "../engine/little";
import { artFor, artNumbers } from "../engine/little-art";
import { rand } from "../engine/little-random";
import { Icon } from "./icons";
import { blip, Burst, buzz, CritterArt, say, ShapeArt, SHAPE_NAME, type Critter } from "./little-bits";

/** The five activities. Every touch answers back (a pop, a wobble, a sound, a voice); nothing is marked wrong. Each calls onDone() when a round is finished. */
interface GameProps { max: number; stage?: LittleStage; onDone: () => void }
const COUNT_KINDS = ["star", "duck", "apple", "fish", "ball"] as const;
const newCount = (max: number) => ({ n: rand.intFresh("count.n", 1, max, 3), kind: rand.bag("count.kind", COUNT_KINDS), spots: rand.shuffle(SPOTS.map((_, i) => i)) });
let lastSum = "";
const newSum = (max: number) => { let r = sumRound(rand.rng, max), tries = 0; while (`${r.op}${r.start}${r.change}` === lastSum && tries++ < 20) r = sumRound(rand.rng, max); lastSum = `${r.op}${r.start}${r.change}`; return r; };
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const SPOTS = [[18, 22], [50, 14], [82, 24], [30, 52], [66, 50], [14, 78], [48, 80], [84, 76], [38, 34], [72, 30]] as const;
const AGAIN = (go: () => void) => <button type="button" class="little-next" onClick={go} aria-label="Again" data-testid="little-again"><Icon name="arrow" size={34} /></button>;

export function CountGame({ max, onDone }: GameProps) {
  const [round, setRound] = useState(() => newCount(max));
  const [tapped, setTapped] = useState<number[]>([]);
  const done = tapped.length === round.n;
  const tap = (i: number) => {
    if (tapped.includes(i)) return;
    const next = [...tapped, i]; setTapped(next); blip(next.length - 1); buzz();
    say(WORDS[next.length]);
    if (next.length === round.n) { setTimeout(() => { blip(0, "win"); say(`${WORDS[round.n]}! Well done!`); }, 700); onDone(); }
  };
  const again = () => { setRound(newCount(max)); setTapped([]); };
  return (
    <div class="little-play" data-testid="little-count">
      <p class="little-prompt" aria-live="polite">{done ? `${round.n}!` : "Tap each one to count"}</p>
      <div class="little-field">
        {Array.from({ length: round.n }, (_, i) => (
          <button key={i} type="button" class={`little-thing${tapped.includes(i) ? " counted" : ""}`} style={{ left: `${SPOTS[round.spots[i]][0]}%`, top: `${SPOTS[round.spots[i]][1]}%`, animationDelay: `${i * 90}ms` }}
            onClick={() => tap(i)} aria-label={tapped.includes(i) ? `counted ${tapped.indexOf(i) + 1}` : "tap to count"} data-testid="little-thing">
            <CritterArt kind={round.kind as Critter} />{tapped.includes(i) && <b class="little-badge">{tapped.indexOf(i) + 1}</b>}
          </button>
        ))}
      </div>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

export function TraceGame({ max, stage = "older", onDone }: GameProps) {
  const [num, setNum] = useState(1);
  // one digit at a time to start with; Year 1 and up also trace two-digit numbers, a digit at a time, tens first
  const digits = digitsOf(num), W = 100 * digits.length;
  const groups = useMemo(() => digits.map((d, k) => waypoints(DIGIT_PATHS[d]).map(([x, y]) => [x + k * 100, y] as Pt)), [num]);
  const pts = useMemo(() => groups.flat(), [groups]);
  const [next, setNext] = useState(0);
  const svg = useRef<SVGSVGElement>(null), down = useRef(false);
  const done = next >= pts.length;
  const at = (e: PointerEvent): Pt => { const r = svg.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * 140]; };
  const move = (e: PointerEvent) => {
    if (!down.current || done) return;
    const n = advance(pts, next, at(e));
    if (n !== next) { setNext(n); blip(Math.floor(n / 6), "tap"); if (n >= pts.length) { blip(0, "win"); say(String(num)); buzz(30); onDone(); } }
  };
  const nextNumber = () => {
    const top = max <= 5 ? 5 : 9, n = stage === "older" && rand.int(1, 10) <= 6 ? rand.intFresh("trace.two", 10, 99, 8) : rand.bag("trace.digit", Array.from({ length: top + 1 }, (_, i) => i).filter((d) => d > 0 || top > 5));
    setNum(n); setNext(0);
  };
  const pathD = (list: Pt[]) => list.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const guide = groups.map((g) => pathD(g)).join(" ");
  const reached = (() => { let left = Math.max(1, next); return groups.map((g) => { const take = g.slice(0, Math.max(0, Math.min(g.length, left))); left -= g.length; return take.length > 1 ? pathD(take) : ""; }).join(" "); })();
  const tip = pts[Math.min(next, pts.length - 1)];
  return (
    <div class="little-play" data-testid="little-trace">
      <p class="little-prompt">{done ? `${num}!` : `Trace the ${num}`}</p>
      <svg ref={svg} class="little-trace" style={{ aspectRatio: `${W} / 140`, width: `min(${digits.length > 1 ? 92 : 80}vw, ${digits.length > 1 ? 70 : 46}dvh, ${digits.length > 1 ? 560 : 360}px)` }} viewBox={`0 0 ${W} 140`} role="img" aria-label={`The number ${num}. Draw along the dotted line with your finger.`} data-testid="trace-pad"
        onPointerDown={(e) => { down.current = true; (e.currentTarget as Element).setPointerCapture(e.pointerId); move(e); }} onPointerMove={move}
        onPointerUp={() => { down.current = false; }} onPointerCancel={() => { down.current = false; }}>
        <path d={guide} class="trace-guide" />
        <path d={reached} class="trace-ink" />
        {pts.map(([x, y], i) => i % 5 === 0 && i >= next ? <circle key={i} cx={x} cy={y} r="1.7" class="trace-dot" /> : null)}
        {!done && <circle cx={tip[0]} cy={tip[1]} r="5" class="trace-tip" />}
      </svg>
      {done && <><Burst />{AGAIN(nextNumber)}</>}
    </div>
  );
}

export function AddGame({ max, onDone }: GameProps) {
  const [round, setRound] = useState(() => newSum(Math.min(max, 6)));
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
  const again = () => { setRound(newSum(Math.min(max, 6))); setMoved(0); };
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
  const [round, setRound] = useState(() => { const s = rand.pickFresh("shapes", pool, count); return { shapes: s, holes: rand.shuffle(s) }; });
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
  const again = () => { const s = rand.pickFresh("shapes", pool, count); setRound({ shapes: s, holes: rand.shuffle(s) }); setPlaced([]); };
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
  const ids = pool.map((a) => a.id), [artId, setArtId] = useState(() => rand.bag("colour.art", ids));
  const art = pool.find((a) => a.id === artId) ?? pool[0], need = artNumbers(art);
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
  const again = () => { const id = rand.bag("colour.art", ids), next = pool.find((a) => a.id === id) ?? pool[0]; setArtId(id); setFilled({}); setChosen(artNumbers(next)[0]); };
  return (
    <div class="little-play" data-testid="little-colour">
      <p class="little-prompt">{done ? `${art.name[0].toUpperCase()}${art.name.slice(1)}!` : "Pick a colour, then tap its number"}</p>
      <div class="little-palette" role="group" aria-label="Colours">
        {need.map((n) => <button key={n} type="button" class={`little-swatch${chosen === n ? " on" : ""}${hint === n ? " hint" : ""}`} style={{ background: art.palette[n] }} onClick={() => { setChosen(n); blip(n); say(WORDS[n] ?? String(n)); }} aria-pressed={chosen === n} aria-label={`colour ${n}`} data-testid={`swatch-${n}`}>{n}</button>)}
      </div>
      <svg ref={svg} class="colour-art" viewBox="0 0 100 100" role="group" aria-label={`Colour by number: ${art.name}`}>
        {art.regions.map((r, i) => (
          <path key={`${art.id}${i}`} d={r.d} data-r={i} data-n={r.n} data-testid={`region-${i}`} class={`art-region${filled[i] ? " filled" : ""}${shake === i ? " shake" : ""}`}
            fill={filled[i] ? art.palette[r.n] : "#fff"} fill-rule="evenodd" stroke={r.plain ? "none" : "#121522"} stroke-width="0.9" stroke-linejoin="round" onPointerDown={(e) => { e.preventDefault(); tap(i); }} />
        ))}
        {art.decor.map((d, i) => <path key={`d${i}`} d={d.d} fill={d.fill ?? "none"} fill-rule="evenodd" stroke={d.stroke ?? "none"} stroke-width={d.w ?? 1} stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />)}
        {spots.map(([x, y, size], i) => !filled[i] && art.regions[i] ? <text key={`n${i}`} x={x} y={y} class="art-num" style={{ fontSize: `${size}px` }} pointer-events="none">{art.regions[i].n}</text> : null)}
      </svg>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

/** The hundred square: find the number you are asked for, or count in tens. Each row is a ten, so the pattern is part of the picture. */
export function HundredGame({ max, stage = max <= 5 ? "nursery" : "reception", onDone }: GameProps) {
  const top = hundredMax(stage), cols = 10, rows = Math.ceil(top / cols);
  const [mode, setMode] = useState<"find" | "tens">("find");
  const make = (m: "find" | "tens") => (m === "find" ? rand.pickFresh("hundred.targets", Array.from({ length: top }, (_, i) => i + 1), Math.min(5, top)) : Array.from({ length: Math.floor(top / 10) || 1 }, (_, i) => (i + 1) * 10));
  const [targets, setTargets] = useState(() => make("find"));
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<number[]>([]);
  const [oops, setOops] = useState<number | null>(null);
  const target = targets[step], done = step >= targets.length;
  const speakTarget = (n: number) => say(mode === "find" ? `Find ${n}` : `${n}`);
  const choose = (m: "find" | "tens") => { setMode(m); const t = make(m); setTargets(t); setStep(0); setLit([]); say(m === "find" ? `Find ${t[0]}` : "Let's count in tens"); };
  const tap = (n: number) => {
    if (done) return;
    say(String(n));
    if (n === target) {
      setLit((l) => [...l, n]); blip(step); buzz();
      const s = step + 1; setStep(s);
      if (s >= targets.length) { setTimeout(() => { blip(0, "win"); say("Well done!"); }, 600); onDone(); } else setTimeout(() => speakTarget(targets[s]), 900);
    } else { setOops(n); blip(0, "oops"); setTimeout(() => setOops(null), 450); }
  };
  const again = () => { const t = make(mode); setTargets(t); setStep(0); setLit([]); setTimeout(() => speakTarget(t[0]), 300); };
  return (
    <div class="little-play" data-testid="little-hundred">
      <div class="seg" role="group" aria-label="What to do">
        <button type="button" class={mode === "find" ? "on" : ""} aria-pressed={mode === "find"} onClick={() => choose("find")} data-testid="hundred-find">Find the number</button>
        {top >= 20 && <button type="button" class={mode === "tens" ? "on" : ""} aria-pressed={mode === "tens"} onClick={() => choose("tens")} data-testid="hundred-tens">Count in tens</button>}
      </div>
      <p class="little-prompt" aria-live="polite">{done ? "You did it!" : mode === "find" ? `Find ${target}` : `Tap ${target}`}</p>
      <div class="little-hundred" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="group" aria-label={`Numbers 1 to ${top}`}>
        {Array.from({ length: rows * cols }, (_, i) => i + 1).map((n) => n > top ? <span key={n} /> : (
          <button key={n} type="button" class={`little-sq${lit.includes(n) ? " lit" : ""}${oops === n ? " oops" : ""}${n % 10 === 0 ? " ten" : ""}`} onClick={() => tap(n)} data-testid={`sq-${n}`} aria-label={String(n)}>{n}</button>
        ))}
      </div>
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

/** Tens and ones: build a number from rods (tens) and cubes (ones), or read what rods and cubes make. Ten cubes trade for a rod. */
export function TensGame({ max, stage = max <= 5 ? "nursery" : "reception", onDone }: GameProps) {
  const [round, setRound] = useState(() => ({ n: rand.intFresh("tens.target", 11, buildMax(stage), 5), mode: "build" as "build" | "read", options: [] as number[] }));
  const [tens, setTens] = useState(0), [ones, setOnes] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const built = tens * 10 + ones, build = round.mode === "build";
  const done = build ? built === round.n : picked === round.n;
  const shown = build ? { tens, ones } : splitTens(round.n);
  const addTen = () => { if (tens >= 9 || done) return; setTens(tens + 1); blip(tens, "tap"); buzz(); say(`${(tens + 1) * 10 + ones}`); check(tens + 1, ones); };
  const addOne = () => {
    if (done) return;
    if (ones === 9) { if (tens >= 9) return; setOnes(0); setTens(tens + 1); blip(7, "tap"); say("Ten ones make one ten!"); check(tens + 1, 0); return; }
    setOnes(ones + 1); blip(ones, "tap"); buzz(); say(`${tens * 10 + ones + 1}`); check(tens, ones + 1);
  };
  const check = (t: number, o: number) => { if (build && t * 10 + o === round.n) { setTimeout(() => { blip(0, "win"); say(`${round.n}. ${t} tens and ${o} ones.`); }, 700); onDone(); } };
  const pick = (n: number) => { setPicked(n); if (n === round.n) { blip(0, "win"); say(`${round.n}. ${shown.tens} tens and ${shown.ones} ones.`); onDone(); } else { blip(0, "oops"); setTimeout(() => setPicked(null), 600); } };
  const again = () => { const n = rand.intFresh("tens.target", 11, buildMax(stage), 5), mode = round.mode === "build" ? "read" : "build"; setRound({ n, mode, options: readOptions(rand.rng, n) }); setTens(0); setOnes(0); setPicked(null); };
  const rods = (n: number) => Array.from({ length: n }, (_, i) => <button key={`r${i}`} type="button" class="little-rod" disabled={!build || done} onClick={() => { setTens(tens - 1); blip(2, "oops"); }} aria-label="a ten, tap to take away"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></button>);
  const cubes = (n: number) => Array.from({ length: n }, (_, i) => <button key={`c${i}`} type="button" class="little-cube" disabled={!build || done} onClick={() => { setOnes(ones - 1); blip(2, "oops"); }} aria-label="a one, tap to take away" />);
  return (
    <div class="little-play" data-testid="little-tens">
      <p class="little-prompt" aria-live="polite">{done ? `${round.n}!` : build ? `Make ${round.n}` : "What number is this?"}</p>
      <div class="little-mat">
        <div class="little-col"><h3>Tens</h3><div class="little-pieces" data-testid="tens-col">{rods(shown.tens)}</div></div>
        <div class="little-col"><h3>Ones</h3><div class="little-pieces little-ones" data-testid="ones-col">{cubes(shown.ones)}</div></div>
      </div>
      {build ? (
        <>
          <p class="little-sum"><b data-testid="tens-total">{built}</b></p>
          <p class="muted" aria-live="polite">{tens} {tens === 1 ? "ten" : "tens"} and {ones} {ones === 1 ? "one" : "ones"}</p>
          {!done && <div class="little-adders"><button type="button" class="little-add-ten" onClick={addTen} data-testid="add-ten" aria-label="add a ten">+10</button><button type="button" class="little-add-one" onClick={addOne} data-testid="add-one" aria-label="add a one">+1</button></div>}
        </>
      ) : (
        <div class="little-options" role="group" aria-label="Choose the number">
          {round.options.length === 0 ? <button type="button" class="btn big" onClick={again}>Start</button> : round.options.map((n) => <button key={n} type="button" class={`little-opt${picked === n ? (n === round.n ? " right" : " wrong") : ""}`} onClick={() => pick(n)} data-testid={`opt-${n}`}>{n}</button>)}
        </div>
      )}
      {done && <><Burst />{AGAIN(again)}</>}
    </div>
  );
}

const PLURAL: Record<string, string> = { lemon: "lemons", apple: "apples", strawberry: "strawberries", star: "stars", duck: "ducks", fish: "fish", ball: "balls", cherry: "cherries", flower: "flowers" };
const cardWords = (c: SnapCard) => (c.kind === "objects" ? `${c.n} ${c.n === 1 ? c.thing : PLURAL[c.thing]}` : c.kind === "num" ? String(c.n) : `${c.a} plus ${c.b}`);
function SnapFace({ card }: { card: SnapCard }) {
  if (card.kind === "num") return <span class="snap-num">{card.n}</span>;
  if (card.kind === "sum") return <span class="snap-num snap-sum">{card.a}<i>+</i>{card.b}</span>;
  return <span class="snap-objects" data-count={card.n}>{Array.from({ length: card.n }, (_, i) => <span key={i} class="snap-thing"><CritterArt kind={card.thing as Critter} /></span>)}</span>;
}
/** Snap: turn the cards one at a time. When a card matches the one before, tap SNAP. Missing one just shows the pair; nothing is lost. */
export function SnapGame({ max, stage = max <= 5 ? "nursery" : "reception", onDone }: GameProps) {
  const mk = () => { const top = snapMax(stage), numbers = rand.pickFresh("snap.numbers", Array.from({ length: top }, (_, i) => i + 1), Math.min(top, stage === "nursery" ? 4 : 6)), things = rand.pickFresh("snap.things", SNAP_THINGS, 4); return snapDeck(rand.rng, stage, 14, 4, numbers, things); };
  const [deck, setDeck] = useState(mk);
  const [turned, setTurned] = useState(0);                 // how many cards are face up so far
  const [found, setFound] = useState(0), [missed, setMissed] = useState(0);
  const [pending, setPending] = useState(false);           // the card on show is a snap that hasn't been called yet
  const [wobble, setWobble] = useState(false), [cheer, setCheer] = useState(false);
  const now = deck[turned - 1], before = deck[turned - 2];
  const turn = () => {
    if (turned >= deck.length) return;
    if (pending) { setMissed((m) => m + 1); say("That was a snap! Look, the same number."); }
    const c = deck[turned], s = isSnap(deck[turned - 1], c, stage);
    setTurned(turned + 1); setPending(s); blip(turned % 8); buzz(); if (!pending) say(cardWords(c));
    if (turned + 1 >= deck.length && !s) setTimeout(() => { blip(0, "win"); say("All done! Well done!"); onDone(); }, 500);
  };
  const snap = () => {
    if (pending) {
      setPending(false); setFound((f) => f + 1); setCheer(true); setTimeout(() => setCheer(false), 900); blip(0, "win"); buzz(40); say("Snap!");
      if (turned >= deck.length) setTimeout(() => { say("All done! Well done!"); onDone(); }, 800);
    } else { setWobble(true); blip(0, "oops"); say("Not a match. Turn the next card."); setTimeout(() => setWobble(false), 450); }
  };
  const again = () => { setDeck(mk()); setTurned(0); setFound(0); setMissed(0); setPending(false); };
  const allDone = turned >= deck.length && !pending;
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { if ((e.target as HTMLElement)?.tagName === "BUTTON") return; e.preventDefault(); snap(); } else if (e.key === "ArrowRight" || e.key === "n") turn(); };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });
  return (
    <div class="little-play snap-play" data-testid="little-snap" onClick={(e) => { if ((e.target as HTMLElement).closest(".snap-deck, .little-next")) return; if (turned >= 1) snap(); }}>
      <p class="little-prompt" aria-live="polite">{allDone ? `You found ${found} ${found === 1 ? "snap" : "snaps"}!` : turned === 0 ? "Tap the pile to turn a card" : pending ? "It's a match! Tap anywhere!" : "Do they match? Tap anywhere to snap"}</p>
      <div class="snap-table">
        <button type="button" class={`snap-deck${turned >= deck.length ? " empty" : ""}`} onClick={turn} disabled={turned >= deck.length} data-testid="snap-turn" aria-label={turned >= deck.length ? "No cards left" : turned === 0 ? "Tap the pile to turn the first card" : "Tap the pile to turn the next card"}>
          <span class="snap-deck-back" aria-hidden="true"><i>?</i></span><small>{deck.length - turned} left</small>
        </button>
        <button type="button" class={`snap-card snap-before${before ? "" : " empty"}`} disabled={!before} data-testid="snap-before" aria-label={before ? `The card before: ${cardWords(before)}. Tap to call snap.` : "No card yet"}>{before && <SnapFace card={before} />}</button>
        <button type="button" class={`snap-card snap-now${now ? "" : " empty"}${pending ? " match" : ""}${cheer ? " cheer" : ""}`} disabled={!now} data-testid="snap-now" aria-label={now ? `This card: ${cardWords(now)}. Tap to call snap.` : "No card yet"}>{now && <SnapFace card={now} />}</button>
      </div>
      {!allDone && (
        <button type="button" class={`snap-call${wobble ? " wobble" : ""}${pending ? " ready" : ""}`} disabled={turned < 2} data-testid="snap-call">SNAP!</button>
      )}
      <p class="muted small" aria-live="polite">{turned} of {deck.length} cards</p>
      {allDone && <><Burst />{AGAIN(again)}</>}
      {missed > 0 && allDone && <p class="muted small">{missed} went by, and that's fine. Try again to catch them.</p>}
    </div>
  );
}

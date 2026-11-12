import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { mulberry32 } from "../engine/rng";
import { ROUND_LENGTH, SECONDS_EACH, makeRound, summarise, verdict, type Attempt } from "../landing/quickfire";
import { parseAnswer, sameNumber } from "../landing/try-answer";
import bankJson from "../landing/try-bank.json";
import type { TryItem } from "../landing/try-types";
import { Maths } from "./maths";
import { Pip, type PipPose } from "./pip";
import { Solution } from "./solution";

const BANK = bankJson as unknown as TryItem[];
const YEARS = [3, 4, 5, 6] as const;
const SET_SIZE = 5;

type Start = (mode: "sign-up" | "sign-in") => void;
type Year = "any" | (typeof YEARS)[number];

/** A different question each time, never one of the last few, and from the chosen year if one is picked. */
function pickNext(recent: string[], year: Year): TryItem {
  const inYear = year === "any" ? BANK : BANK.filter((b) => b.year === year);
  const pool = inYear.filter((b) => !recent.includes(b.id));
  const from = pool.length ? pool : inYear.length ? inYear : BANK;
  return from[Math.floor(Math.random() * from.length)];
}

const Flame = ({ lit = true }: { lit?: boolean }) => (
  <svg class={`try-flame${lit ? " lit" : ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-9.5Z" /></svg>
);
const Star = () => <svg class="try-xp-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6-6.3 3.6 1.5-7L2 9.3l7-.8Z" /></svg>;

/** Little pieces that fly out and fall: a cheap flourish (transform and opacity only). */
const Confetti = ({ n = 18 }: { n?: number }) => (
  <span class="try-confetti" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <i key={i} style={{ "--x": `${((i * 37) % 100) - 50}px`, "--y": `${-60 - ((i * 53) % 70)}px`, "--r": `${(i * 97) % 360}deg`, "--d": `${(i % 6) * 40}ms`, "--c": ["#ffd23f", "#ff7aa8", "#7ee0b8", "#9db4ff", "#fff"][i % 5] }} />)}
  </span>
);

/** Slow-drifting maths symbols behind everything. Transform only, and paused when the card is off screen. */
const SYMBOLS = ["+", "×", "÷", "π", "√", "∞", "%", "θ", "="];
const Drift = () => (
  <span class="try-drift" aria-hidden="true">
    {SYMBOLS.map((s, i) => <b key={i} style={{ "--l": `${(i * 11 + 6) % 94}%`, "--t": `${(i * 29 + 8) % 84}%`, "--s": `${1.4 + (i % 4) * 0.5}rem`, "--dur": `${14 + (i % 5) * 3}s`, "--dl": `${-i * 1.7}s` }}>{s}</b>)}
  </span>
);

function Question({ onStart, score }: { onStart: Start; score: Score }) {
  const recent = useRef<string[]>([]);
  const [year, setYear] = useState<Year>("any");
  const [item, setItem] = useState<TryItem>(() => pickNext([], "any"));
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState<"ask" | "right" | "wrong" | "how">("ask");
  const [hint, setHint] = useState(false);
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(0);
  const [slip, setSlip] = useState("");
  const [gain, setGain] = useState(0);
  const [medal, setMedal] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = (y: Year) => {
    recent.current = [item.id, ...recent.current].slice(0, 6);
    setItem(pickNext(recent.current, y)); setTyped(""); setStage("ask"); setHint(false); setNote(""); setSlip(""); setGain(0);
    setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
  };
  const chooseYear = (y: Year) => { setYear(y); recent.current = []; setItem(pickNext([], y)); setTyped(""); setStage("ask"); setHint(false); setNote(""); setSlip(""); setGain(0); setMedal(false); };
  const check = () => {
    const n = parseAnswer(typed);
    if (n === null) { setNote("Type a number to check it."); setShake((x) => x + 1); return; }
    setNote("");
    if (sameNumber(n, item.value)) {
      const first = stage !== "wrong" && !hint, pts = first ? 10 : 5;
      setGain(pts); setStage("right");
      const reached = score.right(pts);
      if (reached >= SET_SIZE) setMedal(true);
      return;
    }
    score.wrong();
    const hit = item.slips.find((s) => sameNumber(s.value, n));
    setSlip(hit ? `Your answer ${hit.reason}.` : "");
    setStage("wrong"); setShake((x) => x + 1);
  };
  const pose: PipPose = stage === "right" ? "cheer" : stage === "how" ? "wave" : "think";

  if (medal) return <Medal score={score} onKeep={() => { score.newSet(); setMedal(false); load(year); }} onStart={onStart} />;

  return (
    <div class="try-pane" key={item.id}>
      <div class="try-years" role="group" aria-label="Choose a school year">
        {(["any", ...YEARS] as Year[]).map((y) => <button key={y} type="button" class={`try-year${year === y ? " on" : ""}`} aria-pressed={year === y} onClick={() => chooseYear(y)} data-testid={`try-year-${y}`}>{y === "any" ? "Any year" : `Year ${y}`}</button>)}
      </div>
      <div class="try-qhead">
        <div>
          <p class="try-meta"><span class="try-chip">Year {item.year}</span> {item.name}</p>
          <p class="try-prompt" data-testid="try-prompt"><Maths text={item.prompt} /></p>
        </div>
        <span class={`try-pip ${stage}`}><Pip pose={pose} size={58} /></span>
      </div>
      {stage !== "how" && (
        <form class="try-form" onSubmit={(e) => { e.preventDefault(); if (stage === "ask" || stage === "wrong") check(); }}>
          <label class="sr" for="try-answer">Your answer</label>
          <input id="try-answer" ref={input} key={shake} class={`try-input${shake && stage !== "right" ? " shake" : ""}${stage === "right" ? " ok" : stage === "wrong" ? " bad" : ""}`} type="text" inputMode="decimal" autocomplete="off" autocapitalize="off" spellcheck={false}
            value={typed} onInput={(e) => { setTyped((e.target as HTMLInputElement).value); if (stage === "wrong") setStage("ask"); }} readOnly={stage === "right"} placeholder="Type your answer" data-testid="try-input" />
          {item.unit && <span class="try-unit">{item.unit}</span>}
          {stage === "ask" || stage === "wrong" ? <button type="submit" class="try-btn primary" data-testid="try-check">Check</button> : null}
        </form>
      )}
      <div class="try-live-region" role="status" aria-live="polite" data-testid="try-feedback">
        {note && <p class="try-note">{note}</p>}
        {stage === "right" && <p class="try-good"><span class="try-tick" aria-hidden="true">✓</span> Yes, {item.shown ? <Maths text={item.shown} /> : item.value}. <span class="try-gain">+{gain}</span><Confetti /></p>}
        {stage === "wrong" && <p class="try-bad">Not quite{slip ? "." : ", have another go."} {slip}</p>}
      </div>
      {stage === "wrong" && slip && <p class="try-report"><span class="try-report-tag">In the learning report</span> The likely reason is recorded, so you can work on it together.</p>}
      {stage === "ask" && !hint && <button type="button" class="try-link" onClick={() => setHint(true)} data-testid="try-hint">Need a hint?</button>}
      {hint && stage !== "how" && <p class="try-hint"><Maths text={item.hint} /></p>}
      {(stage === "wrong" || stage === "right") && <button type="button" class="try-btn glow" onClick={() => setStage("how")} data-testid="try-show">{stage === "wrong" ? "Show me how" : "Show me how it works"}</button>}
      {stage === "how" && (
        <div class="try-how" data-testid="try-how">
          <p class="try-answer-is">The answer is <strong class="try-underline"><Maths text={item.shown || String(item.value)} /></strong></p>
          <Solution q={{ solution: item.solution, worked: item.worked }} class="steps try-steps" />
        </div>
      )}
      {(stage === "how" || stage === "right") && (
        <div class="try-end">
          <p>Every topic works like this, from Year 3 to Year 13, with the method drawn out.</p>
          <div class="try-actions">
            <button type="button" class="try-btn primary" onClick={() => onStart("sign-up")} data-testid="try-cta">Create an account</button>
            <button type="button" class="try-btn" onClick={() => load(year)} data-testid="try-another">Another one</button>
          </div>
        </div>
      )}
      {stage === "ask" && <button type="button" class="try-link" onClick={() => load(year)} data-testid="try-skip">Try a different one</button>}
    </div>
  );
}

/** What five right answers earn, to show what the app's rewards feel like. */
function Medal({ score, onKeep, onStart }: { score: Score; onKeep: () => void; onStart: Start }) {
  return (
    <div class="try-pane try-medal" data-testid="try-medal">
      <Confetti n={28} />
      <svg class="try-medal-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <path d="M38 6h16l8 30H42Zm28 0h16l-4 30H58Z" fill="#ff7aa8" /><circle cx="60" cy="74" r="34" fill="#ffd23f" stroke="#20243a" stroke-width="4" /><circle cx="60" cy="74" r="25" fill="none" stroke="#fff3a8" stroke-width="3" /><path d="m60 56 5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L60 84.6l-11.2 6 2.1-12.5-9.1-8.9 12.6-1.8Z" fill="#fff" stroke="#20243a" stroke-width="2.5" stroke-linejoin="round" />
      </svg>
      <p class="try-medal-title">Maths star!</p>
      <p class="try-prompt">{SET_SIZE} right, {score.xp} points{score.best >= 3 ? <>, and a streak of {score.best}</> : null}.</p>
      <p class="try-small">In the app, rewards, streaks and a weekly rhythm keep children coming back, and the learning report shows what they're really learning.</p>
      <div class="try-actions">
        <button type="button" class="try-btn primary" onClick={() => onStart("sign-up")} data-testid="try-medal-cta">Create an account</button>
        <button type="button" class="try-btn" onClick={onKeep} data-testid="try-keep-going">Keep going</button>
      </div>
    </div>
  );
}

function QuickFire({ onStart, score }: { onStart: Start; score: Score }) {
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [facts, setFacts] = useState(() => makeRound(mulberry32(1)));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [flash, setFlash] = useState<"" | "ok" | "bad">("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [combo, setCombo] = useState(0);
  const began = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  const begin = () => { setFacts(makeRound(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0))); setIdx(0); setAttempts([]); setTyped(""); setFlash(""); setCombo(0); busy.current = false; setPhase("play"); began.current = performance.now(); setTimeout(() => input.current?.focus({ preventScroll: true }), 60); };
  const fact = facts[idx];
  const record = (right: boolean) => {
    if (busy.current || !fact) return;
    busy.current = true;
    const ms = Math.round(performance.now() - began.current), next = [...attempts, { fact, right, ms }];
    setAttempts(next); setFlash(right ? "ok" : "bad"); setCombo(right ? combo + 1 : 0);
    if (right) score.right(ms <= 3000 ? 3 : 2, false);
    setTimeout(() => {
      busy.current = false; setFlash(""); setTyped("");
      if (idx + 1 >= facts.length) setPhase("done"); else { setIdx(idx + 1); began.current = performance.now(); input.current?.focus({ preventScroll: true }); }
    }, right ? 170 : 650);
  };
  const onInput = (v: string) => {
    if (busy.current) return;
    const clean = v.replace(/\D/g, "").slice(0, 3);
    setTyped(clean);
    if (clean && Number(clean) === fact.answer) record(true);
    else if (clean.length >= String(fact.answer).length) record(false);
  };
  const sum = useMemo(() => (phase === "done" ? summarise(attempts) : null), [phase, attempts]);

  if (phase === "idle") return (
    <div class="try-pane">
      <div class="try-qhead">
        <div>
          <p class="try-meta"><span class="try-chip">Times tables</span> Quick-fire</p>
          <p class="try-prompt">{ROUND_LENGTH} facts, {SECONDS_EACH} seconds each. Type the answer and it jumps straight on.</p>
        </div>
        <span class="try-pip ask"><Pip pose="think" size={58} /></span>
      </div>
      <button type="button" class="try-btn primary big glow" onClick={begin} data-testid="qf-start">Start</button>
      <p class="try-small">quarter times every answer and keeps a chart of which facts are quick and which need work.</p>
    </div>
  );
  if (phase === "done" && sum) {
    const tier = sum.right === sum.total && (sum.averageMs ?? 9999) <= 3000 ? "Gold" : sum.right >= 8 ? "Silver" : sum.right >= 5 ? "Bronze" : "Keep going";
    return (
      <div class="try-pane" data-testid="qf-result">
        <Confetti n={tier === "Gold" ? 28 : tier === "Silver" ? 18 : 10} />
        <div class="try-qhead">
          <div>
            <p class="try-meta"><span class="try-chip">Times tables</span> Round done · <strong class={`try-tier ${tier.replace(" ", "").toLowerCase()}`}>{tier}</strong></p>
            <p class="try-prompt"><strong>{sum.right}</strong> of {sum.total} right{sum.averageMs !== null ? <> · about <strong>{(sum.averageMs / 1000).toFixed(1)}s</strong> each</> : null}</p>
          </div>
          <span class="try-pip right"><Pip pose="cheer" size={58} /></span>
        </div>
        <ol class="qf-bars" aria-label="How long each answer took">
          {attempts.map((a, i) => (
            <li key={i} class={a.right ? "ok" : "bad"} style={{ "--d": `${i * 55}ms`, "--w": `${a.right ? Math.min(1, Math.max(0.12, a.ms / (SECONDS_EACH * 1000))) : 1}` }}>
              <span class="qf-fact">{a.fact.a} × {a.fact.b}</span><i /><span class="qf-time">{a.right ? `${(a.ms / 1000).toFixed(1)}s` : `${a.fact.answer}`}</span>
            </li>
          ))}
        </ol>
        <p class="try-small">{verdict(sum)} In the app, every fact gets its own speed and the grid turns green as they become quick.</p>
        <div class="try-actions">
          <button type="button" class="try-btn primary" onClick={() => onStart("sign-up")} data-testid="qf-cta">Create an account</button>
          <button type="button" class="try-btn" onClick={begin} data-testid="qf-again">Go again</button>
        </div>
      </div>
    );
  }
  return (
    <div class="try-pane">
      <p class="try-meta"><span class="try-chip">Times tables</span> {idx + 1} of {facts.length}{combo >= 2 && <span class="try-combo" key={combo}> <Flame /> combo ×{combo}</span>}</p>
      <div class="qf-timer" aria-hidden="true"><i key={idx} style={{ animationDuration: `${SECONDS_EACH}s` }} onAnimationEnd={() => record(false)} /></div>
      <p class={`qf-q ${flash}`} data-testid="qf-q" aria-live="polite">{fact.a} × {fact.b}{flash === "bad" ? <span class="qf-right"> = {fact.answer}</span> : null}{flash === "ok" && <span class="qf-pop" aria-hidden="true">✓</span>}</p>
      <input ref={input} class={`try-input qf-input ${flash}`} type="text" inputMode="numeric" autocomplete="off" aria-label={`${fact.a} times ${fact.b}`} value={typed} onInput={(e) => onInput((e.target as HTMLInputElement).value)} data-testid="qf-input" />
    </div>
  );
}

interface Score { xp: number; streak: number; best: number; right: (points: number, counts?: boolean) => number; wrong: () => void; newSet: () => void }

/** The "Try one" card on the marketing page: a real question with its method drawn out, points and a streak, and a quick-fire times tables round. */
export function TryCard({ onStart }: { onStart: Start }) {
  const [tab, setTab] = useState<"question" | "tables">("question");
  const [live, setLive] = useState(true);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const setRight = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setLive(es.some((e) => e.isIntersecting)), { threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const score: Score = {
    xp, streak, best,
    right: (points, counts = true) => { setXp((x) => x + points); setStreak((s) => { const n = s + 1; setBest((b) => Math.max(b, n)); return n; }); if (counts) { setRight.current += 1; return setRight.current; } return 0; },
    wrong: () => setStreak(0),
    newSet: () => { setRight.current = 0; },
  };
  return (
    <div class={`try-card${live ? " try-live" : ""}`} ref={box} data-testid="try-card">
      <Drift />
      <div class="try-top">
        <div class="try-tabs" role="tablist" aria-label="Try quarter">
          <button role="tab" id="try-tab-q" aria-selected={tab === "question"} aria-controls="try-panel" class={tab === "question" ? "on" : ""} onClick={() => setTab("question")} data-testid="try-tab-question">Try a question</button>
          <button role="tab" id="try-tab-t" aria-selected={tab === "tables"} aria-controls="try-panel" class={tab === "tables" ? "on" : ""} onClick={() => setTab("tables")} data-testid="try-tab-tables">Quick-fire tables</button>
        </div>
        <div class="try-score" aria-label={`${xp} points, streak ${streak}`}>
          <span class="try-xp" key={xp}><Star /> <b>{xp}</b></span>
          <span class={`try-streak${streak >= 2 ? " hot" : ""}`} key={`s${streak}`}><Flame lit={streak >= 2} /> <b>{streak}</b></span>
        </div>
      </div>
      <div class="try-bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, setRight.current / SET_SIZE)})` }} /></div>
      <div id="try-panel" role="tabpanel" aria-labelledby={tab === "question" ? "try-tab-q" : "try-tab-t"}>
        {tab === "question" ? <Question onStart={onStart} score={score} /> : <QuickFire onStart={onStart} score={score} />}
      </div>
    </div>
  );
}

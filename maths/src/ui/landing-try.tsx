import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { mulberry32 } from "../engine/rng";
import { ROUND_LENGTH, SECONDS_EACH, makeRound, summarise, verdict, type Attempt } from "../landing/quickfire";
import { parseAnswer, sameNumber } from "../landing/try-answer";
import bankJson from "../landing/try-bank.json";
import type { TryItem } from "../landing/try-types";
import { Maths } from "./maths";
import { Solution } from "./solution";

const BANK = bankJson as unknown as TryItem[];

type Start = (mode: "sign-up" | "sign-in") => void;

/** A different question each time, never one of the last few. */
function pickNext(recent: string[]): TryItem {
  const pool = BANK.filter((b) => !recent.includes(b.id));
  const from = pool.length ? pool : BANK;
  return from[Math.floor(Math.random() * from.length)];
}

/** Six little dots that fly out and fade: a cheap flourish (transform and opacity only). */
const Burst = () => <span class="try-burst" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ "--a": `${i * 60 + 15}deg` }} />)}</span>;

function Question({ onStart }: { onStart: Start }) {
  const recent = useRef<string[]>([]);
  const [item, setItem] = useState<TryItem>(() => pickNext([]));
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState<"ask" | "right" | "wrong" | "how">("ask");
  const [hint, setHint] = useState(false);
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(0);
  const [slip, setSlip] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const another = () => {
    recent.current = [item.id, ...recent.current].slice(0, 6);
    setItem(pickNext(recent.current)); setTyped(""); setStage("ask"); setHint(false); setNote(""); setSlip("");
    setTimeout(() => input.current?.focus({ preventScroll: true }), 50);
  };
  const check = () => {
    const n = parseAnswer(typed);
    if (n === null) { setNote("Type a number to check it."); setShake((x) => x + 1); return; }
    setNote("");
    if (sameNumber(n, item.value)) { setStage("right"); return; }
    const hit = item.slips.find((s) => sameNumber(s.value, n));
    setSlip(hit ? `Your answer ${hit.reason}.` : "");
    setStage("wrong");
  };

  return (
    <div class="try-pane" key={item.id}>
      <p class="try-meta"><span class="try-chip">Year {item.year}</span> {item.name}</p>
      <p class="try-prompt" data-testid="try-prompt"><Maths text={item.prompt} /></p>
      {stage !== "how" && (
        <form class="try-form" onSubmit={(e) => { e.preventDefault(); if (stage === "ask" || stage === "wrong") check(); }}>
          <label class="sr" for="try-answer">Your answer</label>
          <input id="try-answer" ref={input} key={shake} class={`try-input${shake ? " shake" : ""}${stage === "right" ? " ok" : stage === "wrong" ? " bad" : ""}`} type="text" inputMode="decimal" autocomplete="off" autocapitalize="off" spellcheck={false}
            value={typed} onInput={(e) => { setTyped((e.target as HTMLInputElement).value); if (stage === "wrong") setStage("ask"); }} readOnly={stage === "right"} placeholder="Type your answer" data-testid="try-input" />
          {item.unit && <span class="try-unit">{item.unit}</span>}
          {stage === "ask" || stage === "wrong" ? <button type="submit" class="try-btn primary" data-testid="try-check">Check</button> : null}
        </form>
      )}
      <div class="try-live-region" role="status" aria-live="polite" data-testid="try-feedback">
        {note && <p class="try-note">{note}</p>}
        {stage === "right" && <p class="try-good"><span class="try-tick" aria-hidden="true">✓</span> Yes, {item.shown ? <Maths text={item.shown} /> : item.value}. <Burst /></p>}
        {stage === "wrong" && <p class="try-bad">Not quite{slip ? "." : ", have another go."} {slip}</p>}
      </div>
      {stage === "wrong" && slip && (
        <p class="try-report"><span class="try-report-tag">In the learning report</span> The likely reason is recorded so you can work on it together.</p>
      )}
      {stage === "ask" && !hint && <button type="button" class="try-link" onClick={() => setHint(true)} data-testid="try-hint">Need a hint?</button>}
      {hint && stage !== "how" && <p class="try-hint"><Maths text={item.hint} /></p>}
      {(stage === "wrong" || stage === "right") && <button type="button" class="try-btn" onClick={() => setStage("how")} data-testid="try-show">{stage === "wrong" ? "Show me how" : "Show me how it works"}</button>}
      {stage === "how" && (
        <div class="try-how" data-testid="try-how">
          <p class="try-answer-is">The answer is <strong><Maths text={item.shown || String(item.value)} /></strong></p>
          <Solution q={{ solution: item.solution, worked: item.worked }} class="steps try-steps" />
        </div>
      )}
      {(stage === "how" || stage === "right") && (
        <div class="try-end">
          <p>Every topic works like this, from Year 3 to Year 13, with the method drawn out.</p>
          <div class="try-actions">
            <button type="button" class="try-btn primary" onClick={() => onStart("sign-up")} data-testid="try-cta">Create an account</button>
            <button type="button" class="try-btn" onClick={another} data-testid="try-another">Another one</button>
          </div>
        </div>
      )}
      {stage === "ask" && <button type="button" class="try-link" onClick={another} data-testid="try-skip">Try a different one</button>}
    </div>
  );
}

function QuickFire({ onStart }: { onStart: Start }) {
  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [facts, setFacts] = useState(() => makeRound(mulberry32(1)));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [flash, setFlash] = useState<"" | "ok" | "bad">("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const began = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  const begin = () => { setFacts(makeRound(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0))); setIdx(0); setAttempts([]); setTyped(""); setFlash(""); busy.current = false; setPhase("play"); began.current = performance.now(); setTimeout(() => input.current?.focus({ preventScroll: true }), 60); };
  const fact = facts[idx];
  const record = (right: boolean) => {
    if (busy.current || !fact) return;
    busy.current = true;
    const next = [...attempts, { fact, right, ms: Math.round(performance.now() - began.current) }];
    setAttempts(next); setFlash(right ? "ok" : "bad");
    setTimeout(() => {
      busy.current = false; setFlash(""); setTyped("");
      if (idx + 1 >= facts.length) setPhase("done"); else { setIdx(idx + 1); began.current = performance.now(); input.current?.focus({ preventScroll: true }); }
    }, right ? 160 : 650);
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
      <p class="try-meta"><span class="try-chip">Times tables</span> Quick-fire</p>
      <p class="try-prompt">{ROUND_LENGTH} facts. {SECONDS_EACH} seconds each. Type the answer and it jumps straight on.</p>
      <button type="button" class="try-btn primary big" onClick={begin} data-testid="qf-start">Start</button>
      <p class="try-small">quarter times every answer and keeps a chart of which facts are quick and which need work.</p>
    </div>
  );
  if (phase === "done" && sum) return (
    <div class="try-pane" data-testid="qf-result">
      <p class="try-meta"><span class="try-chip">Times tables</span> Round done</p>
      <p class="try-prompt"><strong>{sum.right}</strong> of {sum.total} right{sum.averageMs !== null ? <> · about <strong>{(sum.averageMs / 1000).toFixed(1)}s</strong> each</> : null}</p>
      <ol class="qf-bars" aria-label="How long each answer took">
        {attempts.map((a, i) => (
          <li key={i} class={a.right ? "ok" : "bad"} style={{ "--d": `${i * 45}ms`, "--w": `${a.right ? Math.min(1, Math.max(0.12, a.ms / (SECONDS_EACH * 1000))) : 1}` }}>
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
  return (
    <div class="try-pane">
      <p class="try-meta"><span class="try-chip">Times tables</span> {idx + 1} of {facts.length}</p>
      <div class="qf-timer" aria-hidden="true"><i key={idx} style={{ animationDuration: `${SECONDS_EACH}s` }} onAnimationEnd={() => record(false)} /></div>
      <p class={`qf-q ${flash}`} data-testid="qf-q" aria-live="polite">{fact.a} × {fact.b}{flash === "bad" ? <span class="qf-right"> = {fact.answer}</span> : null}</p>
      <input ref={input} class={`try-input qf-input ${flash}`} type="text" inputMode="numeric" autocomplete="off" aria-label={`${fact.a} times ${fact.b}`} value={typed} onInput={(e) => onInput((e.target as HTMLInputElement).value)} data-testid="qf-input" />
    </div>
  );
}

/** The "Try one" card on the marketing page: a real question with its method drawn out, and a quick-fire times tables round. */
export function TryCard({ onStart }: { onStart: Start }) {
  const [tab, setTab] = useState<"question" | "tables">("question");
  const [live, setLive] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  // animations only run while the card is on screen
  useEffect(() => {
    const el = box.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setLive(es.some((e) => e.isIntersecting)), { threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div class={`try-card${live ? " try-live" : ""}`} ref={box} data-testid="try-card">
      <div class="try-tabs" role="tablist" aria-label="Try quarter">
        <button role="tab" id="try-tab-q" aria-selected={tab === "question"} aria-controls="try-panel" class={tab === "question" ? "on" : ""} onClick={() => setTab("question")} data-testid="try-tab-question">Try a question</button>
        <button role="tab" id="try-tab-t" aria-selected={tab === "tables"} aria-controls="try-panel" class={tab === "tables" ? "on" : ""} onClick={() => setTab("tables")} data-testid="try-tab-tables">Quick-fire tables</button>
      </div>
      <div id="try-panel" role="tabpanel" aria-labelledby={tab === "question" ? "try-tab-q" : "try-tab-t"}>
        {tab === "question" ? <Question onStart={onStart} /> : <QuickFire onStart={onStart} />}
      </div>
    </div>
  );
}

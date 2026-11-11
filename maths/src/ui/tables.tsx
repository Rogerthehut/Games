import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { addPoints, recordAnswer, type Profile } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import {
  ALL_TABLES, CHECK_LENGTH, CHECK_SECONDS, MAX_TABLE, STATUS_WORDS, TRICKS, checkQuestions, factKey, factStatus, pickRound, recordFact, summarise, tablesOf,
  type FactStatus, type TableQ,
} from "../engine/tables";
import { Keypad, applyKey, useDigitKeys } from "./answer-input";
import { useApp } from "./context";
import { Icon } from "./icons";
import { playPracticeSound, readPracticeQuestion, stopPracticeNarration } from "./practice-audio";

type View = { name: "hub" } | { name: "learn"; table: number } | { name: "round"; only?: number } | { name: "check" };
interface Result { q: TableQ; ok: boolean; ms: number; typed: string }

/** Learn, practise and memorise the times tables: a grid that fills in as facts become quick, short rounds that lean on the tricky ones, and an optional timed check. */
export function Tables() {
  const { leave } = useApp();
  const [view, setView] = useState<View>({ name: "hub" });
  const [run, setRun] = useState(0); // a new number starts a fresh round
  const again = () => setRun((n) => n + 1);
  const hub = () => setView({ name: "hub" });
  return (
    <main class="tt-screen">
      {view.name === "hub" && <Hub onLearn={(table) => setView({ name: "learn", table })} onRound={(only) => setView({ name: "round", only })} onCheck={() => setView({ name: "check" })} onBack={() => leave({ name: "home" })} />}
      {view.name === "learn" && <Learn table={view.table} onTable={(table) => setView({ name: "learn", table })} onPractise={() => setView({ name: "round", only: view.table })} onBack={hub} />}
      {view.name === "round" && <Session key={`r${view.only ?? 0}-${run}`} timed={false} only={view.only} onBack={hub} onAgain={again} />}
      {view.name === "check" && <Session key={`check-${run}`} timed onBack={hub} onAgain={again} />}
    </main>
  );
}

const WORD: Record<FactStatus, string> = STATUS_WORDS;

function Hub({ onLearn, onRound, onCheck, onBack }: { onLearn: (t: number) => void; onRound: (only?: number) => void; onCheck: () => void; onBack: () => void }) {
  const { profile, update } = useApp();
  const t = tablesOf(profile), s = useMemo(() => summarise(profile), [profile]);
  const last = t.checks[t.checks.length - 1];
  const toggle = (n: number) => update((p) => { const cur = tablesOf(p), on = cur.active.includes(n); const active = on ? cur.active.filter((x) => x !== n) : [...cur.active, n].sort((a, b) => a - b); return { ...p, tables: { ...cur, active: active.length ? active : cur.active } }; });
  return (
    <div class="tt-wrap">
      <div class="tt-top">
        <button type="button" class="btn" onClick={onBack} data-testid="tables-back"><Icon name="back" size={18} /> Back</button>
      </div>
      <h1>Times tables</h1>
      <p class="tt-lead"><strong>{s.counts.quick}</strong> of {s.total} facts are quick and secure. Every fact you answer quickly turns green.</p>

      <div class="tt-grid-wrap">
        <table class="tt-grid" aria-label="Every times table fact from 2 × 2 to 12 × 12, coloured by how well you know it">
          <thead><tr><th scope="col"><span class="sr">Times</span><span aria-hidden="true">×</span></th>{ALL_TABLES.map((n) => <th scope="col" key={n}>{n}</th>)}</tr></thead>
          <tbody>
            {ALL_TABLES.map((a) => (
              <tr key={a}>
                <th scope="row">{a}</th>
                {ALL_TABLES.map((b) => {
                  const st = factStatus(t.facts[factKey(a, b)]);
                  return <td key={b} class={`tt-cell st-${st}`} aria-label={`${a} times ${b} is ${a * b}. ${WORD[st]}.`}>{a * b}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul class="tt-key" aria-label="Key">
        {(["new", "learning", "slow", "quick"] as FactStatus[]).map((k) => <li key={k}><i class={`tt-swatch st-${k}`} />{WORD[k]} <span class="tt-n">{s.counts[k]}</span></li>)}
      </ul>

      <section class="tt-card" aria-labelledby="tt-mine">
        <h2 id="tt-mine">Tables I'm working on</h2>
        <p class="small muted">Practice rounds use these tables. Add more when you're ready.</p>
        <div class="tt-chips" role="group" aria-label="Choose your tables">
          {ALL_TABLES.map((n) => <button type="button" key={n} class={`chip-btn${t.active.includes(n) ? " on" : ""}`} aria-pressed={t.active.includes(n)} onClick={() => toggle(n)}>{n}×</button>)}
        </div>
      </section>

      <div class="tt-actions">
        <button type="button" class="btn primary tt-big" onClick={() => onRound()} data-testid="tables-practise">Practise</button>
        <button type="button" class="btn tt-big" onClick={() => onLearn(t.active[0] ?? 2)} data-testid="tables-learn">Learn a table</button>
      </div>

      <section class="tt-card" aria-labelledby="tt-check">
        <h2 id="tt-check">Check practice</h2>
        <p>Like the Year 4 times tables check: {CHECK_LENGTH} questions, {CHECK_SECONDS} seconds each, tables 2 to 12. It's just for practice, and you can do it whenever you like.</p>
        {last && <p class="small muted">Last time: {last.score} out of {last.total}.</p>}
        <button type="button" class="btn" onClick={onCheck} data-testid="tables-check">Try the check</button>
      </section>
    </div>
  );
}

function Learn({ table, onTable, onPractise, onBack }: { table: number; onTable: (n: number) => void; onPractise: () => void; onBack: () => void }) {
  const [covered, setCovered] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [look, setLook] = useState(7);
  useEffect(() => { setShown(new Set()); }, [table, covered]);
  const rows = Array.from({ length: MAX_TABLE }, (_, i) => i + 1);
  const reveal = (k: number) => setShown((s) => new Set(s).add(k));
  return (
    <div class="tt-wrap">
      <div class="tt-top">
        <button type="button" class="btn" onClick={onBack}><Icon name="back" size={18} /> Back</button>
      </div>
      <h1>The {table} times table</h1>
      <div class="tt-chips" role="group" aria-label="Choose a table">
        {ALL_TABLES.map((n) => <button type="button" key={n} class={`chip-btn${n === table ? " on" : ""}`} aria-pressed={n === table} onClick={() => onTable(n)}>{n}×</button>)}
      </div>
      <p class="tt-trick"><strong>A way to remember it.</strong> {TRICKS[table]}</p>
      <div class="tt-actions">
        <button type="button" class={`btn${covered ? " primary" : ""}`} aria-pressed={covered} onClick={() => setCovered(!covered)}>{covered ? "Show all the answers" : "Cover the answers"}</button>
      </div>
      <ol class="tt-rows">
        {rows.map((k) => {
          const hidden = covered && !shown.has(k);
          return (
            <li key={k}>
              <button type="button" class={`tt-row${look === k ? " on" : ""}`} onClick={() => { setLook(k); if (hidden) reveal(k); }} aria-label={hidden ? `${k} times ${table}. Tap to see the answer.` : `${k} times ${table} is ${k * table}`}>
                <span>{k} × {table}</span><span aria-hidden="true">=</span><strong>{hidden ? "?" : k * table}</strong>
              </button>
            </li>
          );
        })}
      </ol>
      <section class="tt-card" aria-labelledby="tt-pic">
        <h2 id="tt-pic">See it: {look} groups of {table}</h2>
        <Dots rows={look} cols={table} />
        <p class="small muted">{look} rows of {table} dots make {look * table}. It's also {table} rows of {look}.</p>
      </section>
      <div class="tt-actions"><button type="button" class="btn primary tt-big" onClick={onPractise} data-testid="learn-practise">Practise the {table}s</button></div>
    </div>
  );
}

/** A grid of dots: rows × cols, drawn as groups of five so the total can be counted. */
function Dots({ rows, cols }: { rows: number; cols: number }) {
  const gap = 18, r = 6.5, w = cols * gap + 6, h = rows * gap + 6;
  return (
    <svg class="tt-dots" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${rows} rows of ${cols} dots`}>
      {Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => <circle key={`${x}-${y}`} cx={x * gap + gap / 2 + 3} cy={y * gap + gap / 2 + 3} r={r} class={y % 2 ? "alt" : ""} />))}
    </svg>
  );
}

const isTouch = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

/** One round (practice or the timed check). Practice is untimed: speed is noticed quietly, and a mistake is shown and typed in again to help it stick. */
function Session({ timed, only, onBack, onAgain }: { timed: boolean; only?: number; onBack: () => void; onAgain: () => void }) {
  const { profile, update } = useApp();
  const [qs] = useState<TableQ[]>(() => { const seed = Math.floor(Math.random() * 2 ** 31); return timed ? checkQuestions(mulberry32(seed)) : pickRound(profile, Date.now(), mulberry32(seed), { only }); });
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"ask" | "right" | "wrong">("ask");
  const [results, setResults] = useState<Result[]>([]);
  const [left, setLeft] = useState(CHECK_SECONDS);
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef(soundOn); soundRef.current = soundOn;
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const logged = useRef(false);
  const q = qs[i];
  const done = i >= qs.length;
  const typedRef = useRef(typed); typedRef.current = typed;
  const phaseRef = useRef(phase); phaseRef.current = phase;

  const next = () => { setTyped(""); setPhase("ask"); setLeft(CHECK_SECONDS); shownAt.current = Date.now(); setI((n) => n + 1); };
  const settle = (ok: boolean, text: string) => {
    const ms = Date.now() - shownAt.current;
    setResults((r) => [...r, { q, ok, ms, typed: text }]);
    update((p) => recordFact(p, q.a, q.b, ok, ms));
    if (soundRef.current) playPracticeSound(ok ? "success" : "tap");
    if (timed) { setTimeout(next, 150); setPhase(ok ? "right" : "wrong"); return; }
    if (ok) { setPhase("right"); setTimeout(next, 450); } else { setPhase("wrong"); setTyped(""); }
  };

  const press = (key: string) => {
    if (done || phaseRef.current === "right") return;
    if (key !== "⌫" && !/^\d$/.test(key)) return;
    const text = digits(applyKey(typedRef.current, key, typedRef.current.length, typedRef.current.length).text).slice(0, 3);
    setTyped(text);
    const want = String(q.answer);
    if (phaseRef.current === "wrong") { if (text === want) next(); return; } // typing the right answer in after a mistake
    if (text.length >= want.length) settle(text === want, text);
  };
  useDigitKeys(press, { onEscape: () => leaveEarlyRef.current() });

  // the optional countdown, on the timed check only
  useEffect(() => {
    if (!timed || done) return;
    const id = setInterval(() => {
      const gone = (Date.now() - shownAt.current) / 1000;
      setLeft(Math.max(0, CHECK_SECONDS - gone));
      if (gone >= CHECK_SECONDS && phaseRef.current === "ask") settle(false, typedRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [i, timed, done]);

  const finish = () => {
    if (logged.current || results.length === 0) return;
    logged.current = true;
    const right = results.filter((r) => r.ok).length;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    update((p) => {
      let x: Profile = recordAnswer(p, "times-tables", right / results.length >= 0.8 ? "right" : "wrong");
      const t = tablesOf(x);
      x = { ...x, tables: { ...t, rounds: t.rounds + (timed ? 0 : 1), checks: timed && done ? [...t.checks, { at: Date.now(), score: right, total: results.length }].slice(-20) : t.checks },
        sessions: [...x.sessions, { at: startedAt.current, minutes, answered: results.length, correct: right, skills: ["times-tables"] }] };
      return addPoints(x, 5 + right);
    });
  };
  useEffect(() => { if (done) finish(); }, [done]);
  const leaveEarly = () => { stopPracticeNarration(); finish(); onBack(); };
  const leaveEarlyRef = useRef(leaveEarly); leaveEarlyRef.current = leaveEarly;
  useEffect(() => () => stopPracticeNarration(), [i]);

  if (done) return <Summary timed={timed} results={results} onAgain={onAgain} onBack={onBack} />;

  const want = String(q.answer);
  const prompt = q.op === "×" ? `${q.a} × ${q.b}` : `${q.a * q.b} ÷ ${q.a}`;
  return (
    <div class="tt-wrap tt-play">
      <div class="tt-top">
        <button type="button" class="btn ghost" onClick={leaveEarly} data-testid="tables-stop"><Icon name="x" size={18} /> Stop</button>
        <span class="tt-top-right">
          <button type="button" class="icon-btn" aria-pressed={soundOn} aria-label={soundOn ? "Sounds on. Tap to turn off" : "Sounds off. Tap to turn on"} onClick={() => setSoundOn(!soundOn)} data-testid="tables-sound"><Icon name={soundOn ? "speaker" : "mute"} size={22} /></button>
          <span class="tt-count" aria-live="polite">{i + 1} of {qs.length}</span>
        </span>
      </div>
      <div class="progress" role="progressbar" aria-valuenow={i} aria-valuemin={0} aria-valuemax={qs.length} aria-label="Progress"><i style={{ width: `${(100 * i) / qs.length}%` }} /></div>
      {timed && <div class="tt-clock" aria-hidden="true"><i style={{ width: `${(100 * left) / CHECK_SECONDS}%` }} /></div>}
      <div class={`tt-q ${phase}`} data-testid="tables-question">
        <p class="tt-prompt">{prompt} <span aria-hidden="true">=</span></p>
        <p class={`tt-answer ${typed ? "" : "empty"}`} aria-live="polite" data-testid="tables-typed">{typed || "?"}</p>
        {phase === "right" && !timed && <p class="tt-msg good" role="status">Yes!</p>}
        {phase === "wrong" && !timed && <p class="tt-msg bad" role="status">{prompt} = <strong>{want}</strong>. Type {want} to carry on.</p>}
        {phase === "wrong" && timed && <p class="tt-msg bad" role="status">Not quite</p>}
        {phase === "right" && timed && <p class="tt-msg good" role="status">✓</p>}
      </div>
      {!timed && phase === "ask" && (
        <button type="button" class="btn ghost audio-control tt-read" data-testid="tables-read"
          onClick={() => readPracticeQuestion(q.op === "×" ? `What is ${q.a} times ${q.b}?` : `What is ${q.a * q.b} divided by ${q.a}?`, profile.narrationVoice ?? "female", () => {})}>
          <Icon name="speaker" size={21} />Read aloud
        </button>
      )}
      <Keypad mode="digits" onKey={press} />
      {!isTouch() && <p class="small muted tt-hint">You can also type the answer on your keyboard.</p>}
    </div>
  );
}
const digits = (t: string) => t.replace(/[^\d]/g, "");

function Summary({ timed, results, onAgain, onBack }: { timed: boolean; results: Result[]; onAgain: () => void; onBack: () => void }) {
  const right = results.filter((r) => r.ok).length;
  const quick = results.filter((r) => r.ok && r.ms <= 3000).length;
  const missed = [...new Map(results.filter((r) => !r.ok || r.ms > 3000).map((r) => [factKey(r.q.a, r.q.b), r])).values()].slice(0, 8);
  return (
    <div class="tt-wrap">
      <h1>{timed ? "Check practice done" : "Well done!"}</h1>
      <p class="tt-score"><strong>{right}</strong> out of {results.length} right{!timed && right > 0 ? `, and ${quick} of them were quick` : ""}.</p>
      {missed.length > 0 && (
        <section class="tt-card" aria-labelledby="tt-again">
          <h2 id="tt-again">{timed ? "Worth another look" : "Facts to come back to"}</h2>
          <ul class="tt-missed">{missed.map((r) => <li key={factKey(r.q.a, r.q.b)}>{r.q.a} × {r.q.b} = <strong>{r.q.a * r.q.b}</strong>{r.ok ? <span class="small muted"> (right, but slow)</span> : null}</li>)}</ul>
        </section>
      )}
      <div class="tt-actions">
        <button type="button" class="btn primary tt-big" onClick={onAgain}>{timed ? "Try again" : "Another round"}</button>
        <button type="button" class="btn tt-big" onClick={onBack} data-testid="tables-done">Back to my tables</button>
      </div>
    </div>
  );
}

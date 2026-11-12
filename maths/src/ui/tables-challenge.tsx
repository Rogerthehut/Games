import { useEffect, useRef, useState } from "preact/hooks";
import { mulberry32 } from "../engine/rng";
import { factKey, recordFact, type TableQ } from "../engine/tables";
import {
  BLITZ_SECONDS, MODES, RACE_LENGTH, RACE_PENALTY_MS, bestKey, challengesOf, countsAsResult, describeScore, familyBoard, nextChallengeQ, recordChallenge,
  type ChallengeMode, type ChallengeScope, type RecordedChallenge,
} from "../engine/tables-challenge";
import { Keypad, applyKey, useDigitKeys } from "./answer-input";
import { Avatar } from "./avatar";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Sparkles } from "./pip";

const SCOPES: { id: ChallengeScope; label: string; blurb: string }[] = [
  { id: "mine", label: "My tables", blurb: "The tables you're working on" },
  { id: "all", label: "All tables", blurb: "Every table from 2 to 12, the fair one to compare" },
];
const digits = (t: string) => t.replace(/[^\d]/g, "");
export const modeName = (m: ChallengeMode) => MODES.find((x) => x.id === m)!.name;

/** The card on the tables page: pick a challenge, see your best, and start. */
export function ChallengeCard({ onStart, onBoard }: { onStart: (mode: ChallengeMode, scope: ChallengeScope) => void; onBoard: () => void }) {
  const { profile } = useApp();
  const [scope, setScope] = useState<ChallengeScope>("all");
  const c = challengesOf(profile);
  return (
    <section class="tt-card tt-challenges" aria-labelledby="tt-ch">
      <h2 id="tt-ch">Challenges</h2>
      <p class="small muted">Beat your own best. Every round makes the facts quicker.</p>
      <div class="tt-chips" role="group" aria-label="Which tables">
        {SCOPES.map((s) => <button key={s.id} type="button" class={`chip-btn${scope === s.id ? " on" : ""}`} aria-pressed={scope === s.id} onClick={() => setScope(s.id)} data-testid={`scope-${s.id}`}>{s.label}</button>)}
      </div>
      <ul class="tt-modes">
        {MODES.map((m) => {
          const best = c.bests[bestKey(m.id, scope)];
          return (
            <li key={m.id} class="tt-mode">
              <div><strong>{m.name}</strong><span class="small muted">{m.blurb}</span><span class="tt-best" data-testid={`best-${m.id}`}>{best ? <>Your best: <b>{describeScore(m.id, best)}</b></> : "No score yet. Set your first!"}</span></div>
              <button type="button" class="btn primary" onClick={() => onStart(m.id, scope)} data-testid={`start-${m.id}`}>Start</button>
            </li>
          );
        })}
      </ul>
      <button type="button" class="btn" onClick={onBoard} data-testid="open-board"><Icon name="star" size={18} /> Scoreboard</button>
    </section>
  );
}

/** One challenge: the blitz counts down from 60 seconds, the race counts up until 25 are answered. */
export function ChallengeSession({ mode, scope, onBack, onAgain, onBoard }: { mode: ChallengeMode; scope: ChallengeScope; onBack: () => void; onAgain: () => void; onBoard: () => void }) {
  const { profile, update } = useApp();
  const profileRef = useRef(profile); profileRef.current = profile;
  const rng = useRef(mulberry32(Math.floor(Math.random() * 2 ** 31)));
  const [q, setQ] = useState<TableQ>(() => nextChallengeQ(profile, scope, rng.current));
  const [typed, setTyped] = useState("");
  const [flash, setFlash] = useState<"" | "right" | "wrong">("");
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState<RecordedChallenge | null>(null);
  const [missed, setMissed] = useState<{ text: string; answer: number }[]>([]);
  const startedAt = useRef(Date.now()), shownAt = useRef(Date.now()), finished = useRef(false);
  const typedRef = useRef(typed); typedRef.current = typed;
  const qRef = useRef(q); qRef.current = q;
  const tallyRef = useRef(tally); tallyRef.current = tally;
  const missedRef = useRef(missed); missedRef.current = missed;

  const finish = (ms: number) => {
    if (finished.current) return;
    finished.current = true;
    const { right, wrong } = tallyRef.current;
    const done = recordChallenge(profileRef.current, mode, scope, right, wrong, ms);
    update((p) => recordChallenge(p, mode, scope, right, wrong, ms).profile);
    setOutcome(done);
  };

  const answer = (text: string) => {
    if (finished.current) return;
    const cur = qRef.current, ok = text === String(cur.answer), took = Date.now() - shownAt.current;
    update((p) => recordFact(p, cur.a, cur.b, ok, took));
    const next = { right: tallyRef.current.right + (ok ? 1 : 0), wrong: tallyRef.current.wrong + (ok ? 0 : 1) };
    setTally(next); tallyRef.current = next;
    if (!ok && missedRef.current.length < 6 && !missedRef.current.some((m) => m.text === cur.prompt)) setMissed([...missedRef.current, { text: cur.prompt, answer: cur.answer }]);
    setFlash(ok ? "right" : "wrong"); setTimeout(() => setFlash(""), 160);
    setTyped("");
    if (mode === "race" && next.right + next.wrong >= RACE_LENGTH) { finish(Date.now() - startedAt.current); return; }
    const nq = nextChallengeQ(profileRef.current, scope, rng.current, factKey(cur.a, cur.b));
    setQ(nq); shownAt.current = Date.now();
  };

  const press = (key: string) => {
    if (finished.current || (key !== "⌫" && !/^\d$/.test(key))) return;
    const text = digits(applyKey(typedRef.current, key, typedRef.current.length, typedRef.current.length).text).slice(0, 3);
    setTyped(text);
    if (text.length >= String(qRef.current.answer).length) answer(text);
  };
  useDigitKeys(press, { onEscape: () => { finished.current = true; onBack(); } });

  useEffect(() => {
    const id = setInterval(() => {
      if (finished.current) return;
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (mode === "blitz" && ms >= BLITZ_SECONDS * 1000) finish(BLITZ_SECONDS * 1000);
    }, 100);
    return () => clearInterval(id);
  }, []);

  if (outcome) return <ChallengeResultView mode={mode} scope={scope} outcome={outcome} missed={missed} onAgain={onAgain} onBack={onBack} onBoard={onBoard} />;

  const left = Math.max(0, BLITZ_SECONDS - elapsed / 1000);
  const asked = tally.right + tally.wrong;
  return (
    <div class="tt-wrap tt-play tt-challenge">
      <div class="tt-top">
        <button type="button" class="btn ghost" onClick={() => { finished.current = true; onBack(); }} data-testid="challenge-stop"><Icon name="x" size={18} /> Stop</button>
        <span class="tt-top-right">
          <span class="tt-count" aria-live="off">{mode === "blitz" ? `${tally.right} right` : `${asked} of ${RACE_LENGTH}`}</span>
        </span>
      </div>
      {mode === "blitz"
        ? <div class="tt-clock" role="timer" aria-label={`${Math.ceil(left)} seconds left`}><i style={{ width: `${(100 * left) / BLITZ_SECONDS}%` }} /></div>
        : <div class="progress" role="progressbar" aria-valuenow={asked} aria-valuemin={0} aria-valuemax={RACE_LENGTH} aria-label="Progress"><i style={{ width: `${(100 * asked) / RACE_LENGTH}%` }} /></div>}
      <p class="tt-time" data-testid="challenge-time" aria-hidden="true">{mode === "blitz" ? `${Math.ceil(left)}s` : `${(elapsed / 1000).toFixed(1)}s`}</p>
      <div class={`tt-q ${flash}`} data-testid="challenge-question">
        <p class="tt-prompt">{q.prompt} <span aria-hidden="true">=</span></p>
        <p class={`tt-answer ${typed ? "" : "empty"}`} aria-live="polite" data-testid="tables-typed">{typed || "?"}</p>
      </div>
      <Keypad mode="digits" onKey={press} />
    </div>
  );
}

function ChallengeResultView({ mode, scope, outcome, missed, onAgain, onBack, onBoard }: { mode: ChallengeMode; scope: ChallengeScope; outcome: RecordedChallenge; missed: { text: string; answer: number }[]; onAgain: () => void; onBack: () => void; onBoard: () => void }) {
  const r = outcome.result, counted = countsAsResult(mode, r.right, r.wrong);
  const total = r.right + r.wrong;
  return (
    <div class="tt-wrap tt-result">
      <h1>{outcome.newBest ? "New personal best!" : mode === "race" && !counted ? "Race stopped" : "Round done"}</h1>
      {outcome.newBest && <p class="tt-spark" aria-hidden="true"><Sparkles /></p>}
      <p class="tt-score" data-testid="challenge-score"><strong>{counted ? describeScore(mode, r) : `${r.right} right`}</strong></p>
      <p class="small muted">{mode === "blitz" ? `${r.right} right out of ${total} in ${BLITZ_SECONDS} seconds` : counted ? `${r.right} right out of ${total}${r.wrong ? `, with ${r.wrong * RACE_PENALTY_MS / 1000} seconds added for the wrong ones` : ""}` : "Finish all 25 to set a score."}</p>
      {counted && outcome.previous && !outcome.newBest && <p class="tt-msg good">Your best is still <strong>{describeScore(mode, outcome.previous)}</strong>. Have another go to beat it.</p>}
      {counted && outcome.previous && outcome.newBest && <p class="tt-msg good">Your last best was {describeScore(mode, outcome.previous)}.</p>}
      {missed.length > 0 && (
        <section class="tt-card" aria-labelledby="tt-ch-missed">
          <h2 id="tt-ch-missed">Worth another look</h2>
          <ul class="tt-missed">{missed.map((m) => <li key={m.text}>{m.text} = <strong>{m.answer}</strong></li>)}</ul>
        </section>
      )}
      <p class="small muted">{scope === "all" ? "All tables" : "My tables"} · {modeName(mode)}</p>
      <div class="tt-actions">
        <button type="button" class="btn primary tt-big" onClick={onAgain} data-testid="challenge-again">Try to beat it</button>
        <button type="button" class="btn tt-big" onClick={onBoard} data-testid="challenge-board">Scoreboard</button>
        <button type="button" class="btn tt-big" onClick={onBack} data-testid="challenge-done">Back to my tables</button>
      </div>
    </div>
  );
}

/** Personal bests and the family board. Only best scores are shown, so nobody sees a low number. */
export function Scoreboard({ onBack }: { onBack: () => void }) {
  const { profile, profiles } = useApp();
  const [mode, setMode] = useState<ChallengeMode>("blitz");
  const [scope, setScope] = useState<ChallengeScope>("all");
  const c = challengesOf(profile);
  const rows = familyBoard(profiles, mode, scope, profile.id);
  const recent = c.history.filter((h) => h.mode === mode && h.scope === scope).slice(-6).reverse();
  const alone = profiles.length < 2;
  return (
    <div class="tt-wrap tt-board">
      <div class="tt-top"><button type="button" class="btn" onClick={onBack} data-testid="board-back"><Icon name="back" size={18} /> Back</button></div>
      <h1>Scoreboard</h1>
      <div class="tt-chips" role="group" aria-label="Challenge">
        {MODES.map((m) => <button key={m.id} type="button" class={`chip-btn${mode === m.id ? " on" : ""}`} aria-pressed={mode === m.id} onClick={() => setMode(m.id)} data-testid={`board-mode-${m.id}`}>{m.name}</button>)}
      </div>
      <div class="tt-chips" role="group" aria-label="Which tables">
        {SCOPES.map((s) => <button key={s.id} type="button" class={`chip-btn${scope === s.id ? " on" : ""}`} aria-pressed={scope === s.id} onClick={() => setScope(s.id)}>{s.label}</button>)}
      </div>

      <section class="tt-card" aria-labelledby="tt-family">
        <h2 id="tt-family">{alone ? "Your best" : "The family board"}</h2>
        <ol class="tt-rank" data-testid="family-board">
          {rows.map((r) => (
            <li key={r.id} class={`${r.you ? "you" : ""}${r.rank === 1 ? " first" : ""}`}>
              <span class="tt-place" aria-label={r.rank ? `Place ${r.rank}` : "No score yet"}>{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank || "–"}</span>
              <Avatar choice={r.avatar} year={r.year} size={36} />
              <span class="tt-who"><strong>{r.name}{r.you ? " (you)" : ""}</strong>{r.best && <small class="muted">{new Date(r.best.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>}</span>
              <span class="tt-pts">{r.best ? describeScore(mode, r.best) : "Not yet"}</span>
            </li>
          ))}
        </ol>
        {alone && <p class="small muted">Other learners on this account will appear here, so brothers and sisters can compete.</p>}
        <p class="small muted">Only best scores are shown. A grown-up can choose who appears in the Parents' area.</p>
      </section>

      <section class="tt-card" aria-labelledby="tt-recent">
        <h2 id="tt-recent">My recent rounds</h2>
        {recent.length === 0 ? <p class="muted">No rounds yet. Try a challenge!</p> : (
          <ul class="tt-missed">{recent.map((h) => <li key={h.at}>{new Date(h.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: <strong>{describeScore(mode, h)}</strong>{h.wrong ? <span class="small muted"> · {h.wrong} wrong</span> : null}</li>)}</ul>
        )}
      </section>
    </div>
  );
}

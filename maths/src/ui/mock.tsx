import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { check } from "../engine/check";
import { MOCK_SECONDS, MOCK_TOTAL, buildMock } from "../engine/mock";
import { addPoints, recordAnswer, recordMistake, type MockRecord } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import type { Question, Strand } from "../engine/types";
import { AnswerInput } from "./answer-input";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Maths } from "./maths";

interface Taken { q: Question; inputs: string[]; correct: boolean; tag?: string; message?: string }

const clock = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export function Mock() {
  const { profile, update, go } = useApp();
  const items = useMemo(() => buildMock(mulberry32(Date.now() & 0xffffff)), []);
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState<Question | null>(null);
  const [values, setValues] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const [taken, setTaken] = useState<Taken[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const show = (i: number) => {
    const it = items[i];
    setQ(SKILL_BY_ID[it.skillId].generate(mulberry32((Date.now() + i * 7919) & 0x7fffffff), it.level));
    setValues([""]);
    setNote("");
  };
  const start = () => { startedAt.current = Date.now(); setPhase("run"); show(0); };

  const finish = (all: Taken[]) => {
    const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    const by = new Map<Strand, { right: number; n: number }>();
    for (const t of all) {
      const st = SKILL_BY_ID[t.q.skill].strand;
      const e = by.get(st) ?? { right: 0, n: 0 };
      by.set(st, { right: e.right + (t.correct ? 1 : 0), n: e.n + 1 });
    }
    const rec: MockRecord = {
      at: Date.now(), total: all.length, score: all.filter((t) => t.correct).length, seconds, limitSeconds: MOCK_SECONDS,
      byStrand: [...by].map(([strand, v]) => ({ strand, ...v })),
    };
    update((p) => {
      let n = p;
      for (const t of all) {
        n = recordAnswer(n, t.q.skill, t.correct ? "right" : "wrong");
        if (!t.correct && t.tag && t.message) n = recordMistake(n, t.tag, t.q.skill, t.message);
      }
      n = addPoints(n, 20 + rec.score);
      return { ...n, mocks: [...(n.mocks ?? []), rec], sessions: [...n.sessions, { at: startedAt.current, minutes: Math.max(1, Math.round(seconds / 60)), answered: all.length, correct: rec.score, skills: [...new Set(all.map((t) => t.q.skill))] }] };
    });
    setPhase("done");
  };

  const record = (inputs: string[], correct: boolean, tag?: string, message?: string) => {
    if (!q) return;
    const all = [...taken, { q, inputs, correct, tag, message }];
    setTaken(all);
    if (idx + 1 >= MOCK_TOTAL) finish(all);
    else { setIdx(idx + 1); show(idx + 1); }
  };
  const submit = () => {
    if (!q) return;
    const r = check(q, values);
    if (r.outcome === "invalid") { setNote("Type an answer, or choose “Leave blank”."); return; }
    record(values, r.outcome === "correct", r.tag, r.feedback);
  };

  if (phase === "intro") {
    return (
      <main class="page narrow">
        <div class="card">
          <h1>Practice paper</h1>
          <p class="lede">{MOCK_TOTAL} questions in the style of 11+ maths, with a guide time of {MOCK_SECONDS / 60} minutes.</p>
          <ul class="plain-list">
            <li>The clock runs, but it won't stop you. Try to finish in time, as in a real paper.</li>
            <li>No hints, and no marks until the end. Then you'll see every question you missed, with the steps.</li>
            <li>Paper and a pencil are fine. No calculator.</li>
          </ul>
          <p class="small muted">This is original practice material in a general 11+ style. It is not an official or past paper, and real tests vary by area and exam provider.</p>
          <div class="actions"><button class="btn primary" onClick={start}>Start the paper</button><button class="btn" onClick={() => go({ name: "plan" })}>Not now</button></div>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    const score = taken.filter((t) => t.correct).length;
    const missed = taken.filter((t) => !t.correct);
    const rec = profile.mocks?.[profile.mocks.length - 1];
    const prev = profile.mocks && profile.mocks.length > 1 ? profile.mocks[profile.mocks.length - 2] : undefined;
    return (
      <main class="page report">
        <div class="card hero">
          <h1>Practice paper result</h1>
          <p class="big-level">{score} / {taken.length}</p>
          <p class="lede">Finished in {clock(rec?.seconds ?? elapsed)} of {clock(MOCK_SECONDS)}.{prev && <> Last paper: {prev.score} / {prev.total}.</>}</p>
          <p class="small muted">An indicator for practice, not a prediction. Real 11+ pass marks vary by area and year, and this is not a standardised score.</p>
        </div>
        {rec && (
          <div class="card">
            <h2>By topic area</h2>
            <ul class="bars">
              {rec.byStrand.map((s) => (
                <li key={s.strand}>
                  <div class="bar-head"><span>{s.strand}</span><span class="muted small">{s.right} of {s.n}</span></div>
                  <div class="bar-track"><i class="bar-fill" style={{ width: `${(100 * s.right) / s.n}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div class="card">
          <h2>{missed.length ? `Review: ${missed.length} to learn from` : "No mistakes to review"}</h2>
          <ul class="finding-list">
            {missed.map((t, i) => (
              <li key={i}>
                <p><Maths text={t.q.prompt} /></p>
                <p class="small muted">Your answer: {t.inputs.every((v) => !v.trim()) ? "left blank" : t.inputs.join(", ")} · Correct: <Maths text={t.q.shown} /></p>
                <details><summary class="small">Show the steps</summary><ol class="steps">{t.q.solution.map((s, j) => <li key={j}><Maths text={s} /></li>)}</ol></details>
              </li>
            ))}
          </ul>
          <p class="small muted">Topics you missed will come back in your next practice sessions.</p>
        </div>
        <div class="actions"><button class="btn primary" onClick={() => go({ name: "home" })}>Done</button></div>
      </main>
    );
  }

  if (!q) return null;
  const left = MOCK_SECONDS - elapsed;
  return (
    <main class="page practice">
      <div class="p-top">
        <button class="linkish" onClick={() => finish(taken)} disabled={taken.length === 0}>End paper early</button>
        <div class="progress" role="progressbar" aria-valuenow={idx} aria-valuemin={0} aria-valuemax={MOCK_TOTAL} aria-label="Paper progress"><i style={{ width: `${(idx / MOCK_TOTAL) * 100}%` }} /></div>
        <span class={`timer ${left < 0 ? "over" : left < 120 ? "low" : ""}`} aria-label="Time left">{left >= 0 ? clock(left) : `+${clock(left)}`}</span>
      </div>
      <div class="card q-card">
        <div class="q-meta"><span class="small muted">Question {idx + 1} of {MOCK_TOTAL}</span></div>
        <p class="q-text"><Maths text={q.prompt} /></p>
        {q.figure && <FigureView fig={q.figure} />}
        <AnswerInput answer={q.answer} values={values} onChange={setValues} onSubmit={submit} />
        {note && <div class="banner almost" role="alert">{note}</div>}
        {left < 0 && <div class="banner hint">The guide time is up. In a real paper you'd stop here; carry on to finish and see your result.</div>}
        <div class="actions">
          <button class="btn primary" onClick={submit} disabled={values.every((v) => !v.trim())}>Next</button>
          <button class="btn" onClick={() => record([""], false)}>Leave blank</button>
        </div>
      </div>
    </main>
  );
}

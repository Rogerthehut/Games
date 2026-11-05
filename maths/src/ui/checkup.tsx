import { useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { check } from "../engine/check";
import { TEST_LENGTH, applyBaseline, applyResponse, nextItem, replay, summarise } from "../engine/diagnostic";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { AnswerInput } from "./answer-input";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Maths } from "./maths";

/**
 * The check-up. Adaptive, untimed, and deliberately silent about right and wrong: the child sees no marks, so
 * a miss doesn't feel like failing, and the result isn't distorted by hints or feedback.
 */
export function Checkup() {
  const { profile, update, go } = useApp();
  const startYear = Math.max(3, Math.min(13, profile.year));
  const saved = profile.diag?.responses ?? [];
  const [started, setStarted] = useState(false);
  const [state, setState] = useState(() => replay(startYear, saved));
  const [q, setQ] = useState<Question | null>(null);
  const [level, setLevel] = useState(1);
  const [values, setValues] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const shownAt = useRef(Date.now());
  const rng = useMemo(() => mulberry32(Date.now() & 0xffffff), []);

  const load = (s = state) => {
    const item = nextItem(s, rng);
    if (!item) return finish(s);
    const skill = SKILL_BY_ID[item.skillId];
    setQ(skill.generate(mulberry32((Date.now() + s.n * 7919) & 0x7fffffff), item.level));
    setLevel(item.level);
    setValues([""]);
    setNote("");
    shownAt.current = Date.now();
  };

  const begin = () => {
    if (!profile.diag) update((p) => ({ ...p, diag: { startedAt: Date.now(), responses: [] } }));
    setStarted(true);
    load();
  };

  function finish(s: typeof state) {
    const rec = summarise(s);
    update((p) => applyBaseline(p, rec));
    go({ name: "report" });
  }

  const record = (correct: boolean) => {
    if (!q) return;
    const resp = { skillId: q.skill, level, correct, ms: Date.now() - shownAt.current };
    const next = applyResponse(state, resp);
    setState(next);
    update((p) => ({ ...p, diag: { startedAt: p.diag?.startedAt ?? Date.now(), responses: [...(p.diag?.responses ?? []), resp] } }));
    if (next.n >= TEST_LENGTH) finish(next);
    else load(next);
  };

  const submit = () => {
    if (!q) return;
    const res = check(q, values);
    if (res.outcome === "invalid") { setNote("Type an answer, or choose “Not sure”."); return; }
    record(res.outcome === "correct" || res.outcome === "almost"); // presentation isn't what this test measures
  };

  if (!started) {
    const resuming = saved.length > 0;
    return (
      <main class="page narrow">
        <div class="card">
          <h1>{resuming ? "Welcome back" : "Let's find your starting point"}</h1>
          {resuming ? (
            <p class="lede">You're {saved.length} of {TEST_LENGTH} questions into the check-up. Pick up where you left off.</p>
          ) : (
            <>
              <p class="lede">A short check-up of about {TEST_LENGTH} questions, around 20 minutes. It adjusts as you go: some questions will feel easy and some hard, and that's exactly how it's meant to work.</p>
              <ul class="plain-list">
                <li>You won't be told if an answer is right or wrong.</li>
                <li>There's no timer, and no hints in this one.</li>
                <li>If you're not sure, choose <strong>Not sure</strong>. That helps just as much as a guess.</li>
                <li>No calculator, but paper and a pencil are fine.</li>
              </ul>
            </>
          )}
          <div class="actions">
            <button class="btn primary" onClick={begin}>{resuming ? "Continue" : "Start the check-up"}</button>
            <button class="btn" onClick={() => go({ name: "home" })}>Not now</button>
          </div>
        </div>
      </main>
    );
  }

  if (!q) return null;
  const pct = Math.round((state.n / TEST_LENGTH) * 100);
  return (
    <main class="page practice">
      <div class="p-top">
        <button class="linkish" onClick={() => go({ name: "home" })}>Pause and come back later</button>
        <div class="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Check-up progress"><i style={{ width: `${pct}%` }} /></div>
        <span class="small muted">{state.n + 1} of {TEST_LENGTH}</span>
      </div>
      <div class="card q-card">
        <p class="q-text"><Maths text={q.prompt} /></p>
        {q.figure && <FigureView fig={q.figure} />}
        <AnswerInput answer={q.answer} values={values} onChange={setValues} onSubmit={submit} />
        {note && <div class="banner almost" role="alert">{note}</div>}
        <div class="actions">
          <button class="btn primary" onClick={submit} disabled={values.every((v) => !v.trim())}>Next</button>
          <button class="btn" onClick={() => record(false)}>Not sure</button>
        </div>
      </div>
    </main>
  );
}

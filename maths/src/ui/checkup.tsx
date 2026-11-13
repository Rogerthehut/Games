import { noteQuestion } from "../account/question-stats";
import { useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { recordWrongOnce } from "../engine/wrong-log";
import { check } from "../engine/check";
import { TEST_LENGTH, applyBaseline, applyResponse, nextItem, replay, summarise } from "../engine/diagnostic";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { AnswerInput } from "./answer-input";
import { WorkingOut } from "./working-out";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { Pip } from "./pip";
import { QBar, QTop } from "./qshell";

/**
 * The check-up. Adaptive, untimed, and deliberately silent about right and wrong: the child sees no marks, so
 * a miss doesn't feel like failing, and the result isn't distorted by hints or feedback.
 */
export function Checkup() {
  const { profile, update, go, leave } = useApp();
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
    { const seed = (Date.now() + s.n * 7919) & 0x7fffffff; setQ({ ...skill.generate(mulberry32(seed), item.level), seed }); } // the seed lets a missed question be asked again
    setLevel(item.level);
    setValues([""]);
    setNote("");
    shownAt.current = Date.now();
  };

  const begin = () => {
    if (!profile.diag) update((p) => ({ ...p, diag: { startedAt: Date.now(), responses: [] } }));
    setStarted(true);
    const draft = profile.diag?.draft;
    if (draft) {
      setQ(draft.question);
      setLevel(draft.question.level);
      setValues(draft.values);
      shownAt.current = Date.now();
    } else load();
  };

  function finish(s: typeof state) {
    const rec = summarise(s);
    update((p) => applyBaseline(p, rec));
    go({ name: "report" });
  }

  const record = (correct: boolean, typed: string[] = [], tag?: string, message?: string) => {
    if (!q) return;
    const resp = { skillId: q.skill, level, correct, ms: Date.now() - shownAt.current };
    noteQuestion({ skill: q.skill, level, year: profile.year, kind: correct ? "right" : "wrong", secs: resp.ms / 1000, tags: tag ? [tag] : [] }, profile.shareStats !== false);
    if (!correct) update((p) => recordWrongOnce(p, q, typed, "check-up", tag, message));
    const next = applyResponse(state, resp);
    setState(next);
    update((p) => ({ ...p, diag: { startedAt: p.diag?.startedAt ?? Date.now(), responses: [...(p.diag?.responses ?? []), resp] } }));
    if (next.n >= TEST_LENGTH) finish(next);
    else load(next);
  };

  const saveAndLeave = () => {
    if (q) update((p) => ({
      ...p,
      diag: { startedAt: p.diag?.startedAt ?? Date.now(), responses: p.diag?.responses ?? [], draft: { question: q, values } },
    }));
    leave({ name: "home" });
  };

  const submit = () => {
    if (!q) return;
    const res = check(q, values);
    if (res.outcome === "invalid") { setNote(res.feedback ?? "Type an answer, or tap Not sure."); return; }
    record(res.outcome === "correct" || res.outcome === "almost", values, res.tag, res.feedback); // presentation isn't what this test measures
  };

  if (!started) {
    const resuming = saved.length > 0 || !!profile.diag?.draft;
    return (
      <main class="splash">
        <div class={resuming ? "splash-in" : "splash-in milestone-shell"}>
          {resuming && <div class="pip-slot"><Pip pose="think" size={110} /></div>}
          <div class={resuming ? undefined : "milestone-banner"}>
            {!resuming && <div class="checkup-bulb"><Pip pose="think" size={72} /></div>}
            <h1>{resuming ? "Welcome back" : "Quick check-up"}</h1>
            <p class="splash-sub">{resuming ? `${saved.length} of ${TEST_LENGTH} done. Pick up where you left off.` : `${TEST_LENGTH} questions, about 20 minutes. It finds the right place to start.`}</p>
          </div>
          {!resuming && (
            <ul class="tips">
              <li>Questions get easier or harder as you go.</li>
              <li>You won't see if you're right. That's normal.</li>
              <li>Not sure? Tap <strong>Not sure</strong>. That helps too.</li>
            </ul>
          )}
          <button class="btn primary big" onClick={begin} data-testid="checkup-start">{resuming ? "Keep going" : "Start"} <Icon name="arrow" size={20} /></button>
          <button class="linkish" onClick={() => leave({ name: "home" })}>Not now</button>
        </div>
      </main>
    );
  }

  if (!q) return null;
  return (
    <div class="qpage" data-phase="ask">
      <QTop onClose={saveAndLeave} closeLabel="Save and leave check-up" closeText="Save and leave" index={state.n} total={TEST_LENGTH} />
      <div class="qbody" key={state.n}>
        <p class="q-topic">Check-up</p>
        <div class="question-desk">
          <div class="question-main">
            <p class="q-text" data-testid="question"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <AnswerInput answer={q.answer} skill={q.skill} values={values} onChange={setValues} onSubmit={submit} />
            <div class="fb-zone" aria-live="polite">{note && <div class="fb nearly" role="alert"><p>{note}</p></div>}</div>
          </div>
          <WorkingOut />
        </div>
      </div>
      <QBar
        help
        left={<button class="btn ghost" onClick={() => record(false)} data-testid="not-sure">Not sure</button>}
        right={<button class="btn primary" onClick={submit} disabled={!values.some((v) => v.trim())} data-testid="next">Next <Icon name="arrow" size={20} /></button>}
      />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { check, type Result } from "../engine/check";
import { DAY, addPoints, levelOf, recordAnswer, recordMistake, skillName, type Pick, type Profile } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import { AnswerInput } from "./answer-input";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Maths } from "./maths";
import { Pip, Sparkles } from "./pip";

type Phase = "intro" | "ask" | "correct" | "reveal" | "done";
const PRAISE = ["Correct!", "Nice work.", "That's it.", "Spot on.", "Yes, exactly."];

function makeQuestion(profile: Profile, skillId: string, avoid: Set<string>, seed: number, level?: number): Question {
  const skill = SKILL_BY_ID[skillId];
  const lv = level ?? levelOf(profile.skills[skillId]);
  let q = skill.generate(mulberry32(seed), lv);
  for (let i = 1; i < 8 && avoid.has(q.prompt); i++) q = skill.generate(mulberry32(seed + i * 7919), lv);
  return q;
}

const dueText = (due: number, now: number) => {
  const d = Math.round((due - now) / DAY);
  return d <= 0 ? "later today" : d === 1 ? "tomorrow" : `in ${d} days`;
};

export function Practice({ plan }: { plan: Pick[] }) {
  const { profile, update, go } = useApp();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [q, setQ] = useState<Question | null>(null);
  const [values, setValues] = useState<string[]>([""]);
  const [result, setResult] = useState<Result | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stepsShown, setStepsShown] = useState(0);
  const [praise, setPraise] = useState(PRAISE[0]);
  const tally = useRef({ answered: 0, correct: 0, points: 0, skills: new Set<string>(), seenPrompts: new Set<string>(), introduced: new Set<string>(), shownAt: Date.now(), activeMs: 0, logged: false, giveUps: 0, bounces: 0 });
  const startedAt = useMemo(() => Date.now(), []);

  const total = plan.length;
  const skill = q ? SKILL_BY_ID[q.skill] : null;

  // Load the question for the current step.
  useEffect(() => {
    if (idx >= total) return;
    const { skillId } = plan[idx];
    const st = profile.skills[skillId];
    const t = tally.current;
    const isNew = !st || (st.seen === 0 && !st.assumed);
    const seed = Date.now() + idx * 104729;
    if (isNew && !t.introduced.has(skillId)) {
      t.introduced.add(skillId);
      setQ(makeQuestion(profile, skillId, t.seenPrompts, seed, 1));
      setPhase("intro");
      setStepsShown(0);
    } else {
      const nq = makeQuestion(profile, skillId, t.seenPrompts, seed);
      t.seenPrompts.add(nq.prompt);
      setQ(nq);
      setPhase("ask");
    }
    setValues([""]);
    setResult(null); setAttempts(0); setHinted(false); setShowHint(false); setStepsShown(0);
    t.shownAt = Date.now();
  }, [idx]);

  const beginReal = () => {
    const t = tally.current;
    const nq = makeQuestion(profile, plan[idx].skillId, t.seenPrompts, Date.now() + idx * 31, 1);
    t.seenPrompts.add(nq.prompt);
    setQ(nq); setPhase("ask"); setValues([""]); setResult(null); setStepsShown(0); t.shownAt = Date.now();
  };

  const logSession = () => {
    const t = tally.current;
    if (t.logged || t.answered === 0) return;
    t.logged = true;
    const minutes = Math.max(1, Math.round(t.activeMs / 60000));
    update((p) => ({ ...p, sessions: [...p.sessions, { at: startedAt, minutes, answered: t.answered, correct: t.correct, skills: [...t.skills] }] }));
  };

  const settle = (kind: "right" | "helped" | "wrong", mistake?: Result) => {
    if (!q) return;
    const t = tally.current;
    t.answered++; t.skills.add(q.skill);
    t.activeMs += Math.min(180_000, Date.now() - t.shownAt);
    if (kind !== "wrong") t.correct++;
    const pts = kind === "right" ? 10 : kind === "helped" ? 7 : 4;
    t.points += pts;
    update((p) => {
      let n = recordAnswer(p, q.skill, kind);
      if (mistake?.tag && mistake.feedback) n = recordMistake(n, mistake.tag, q.skill, mistake.feedback);
      return addPoints(n, pts);
    });
  };

  const submit = () => {
    if (!q || phase !== "ask") return;
    const res = check(q, values);
    if (res.outcome === "invalid" || res.outcome === "almost") { setResult(res); return; }
    if (res.outcome === "correct") {
      if (attempts > 0) tally.current.bounces++; // got it after an earlier miss
      settle(attempts === 0 && !hinted ? "right" : "helped");
      setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      setResult(res); setPhase("correct");
      return;
    }
    setAttempts(attempts + 1);
    if (attempts === 0) { setResult(res); return; }
    settle("wrong", res);
    setResult(res); setPhase("reveal"); setStepsShown(99);
  };

  const giveUp = () => {
    tally.current.giveUps++;
    settle("wrong");
    setResult(null); setPhase("reveal"); setStepsShown(99);
  };

  const next = () => {
    if (idx + 1 >= total) {
      if (!tally.current.logged) { tally.current.points += 10; update((p) => addPoints(p, 10)); } // finishing bonus
      logSession(); setPhase("done"); setIdx(total);
    }
    else setIdx(idx + 1);
  };
  const finishEarly = () => { logSession(); go({ name: "home" }); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON") return;
      if (phase === "correct" || phase === "reveal") next();
      else if (phase === "intro") (stepsShown < (q?.solution.length ?? 0) ? setStepsShown(stepsShown + 1) : beginReal());
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  if (phase === "done") return <Summary plan={plan} points={tally.current.points} answered={tally.current.answered} correct={tally.current.correct} giveUps={tally.current.giveUps} bounces={tally.current.bounces} />;
  if (!q || !skill) return null;

  const pct = Math.round((idx / total) * 100);
  return (
    <main class="page practice">
      <div class="p-top">
        <button class="linkish" onClick={finishEarly}>Finish for now</button>
        <div class="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Session progress"><i style={{ width: `${pct}%` }} /></div>
        <span class="small muted">{idx + 1} of {total}</span>
      </div>

      <div class="card q-card" key={idx}>
        <div class="q-meta"><span class="badge">{skill.name}</span><span class="small muted">Level {q.level}</span></div>

        {phase === "intro" ? (
          <>
            <h2 class="intro-h">Watch one first</h2>
            <p class="muted">This is a new skill. Here's a worked example. Step through it, then try one yourself.</p>
            <p class="q-text"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <ol class="steps">
              {q.solution.slice(0, stepsShown).map((s, i) => <li key={i}><Maths text={s} /></li>)}
            </ol>
            {stepsShown >= q.solution.length && <p class="answer-shown">Answer: <Maths text={q.shown} /></p>}
            <div class="actions">
              {stepsShown < q.solution.length
                ? <button class="btn primary" onClick={() => setStepsShown(stepsShown + 1)}>{stepsShown === 0 ? "Show the first step" : "Next step"}</button>
                : <button class="btn primary" onClick={beginReal}>Now you try</button>}
              <button class="btn" onClick={beginReal}>Skip, I know this</button>
            </div>
          </>
        ) : (
          <>
            <p class="q-text"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}

            <AnswerInput answer={q.answer} values={values} onChange={setValues} onSubmit={submit} disabled={phase !== "ask"} />

            {phase === "ask" && result && result.outcome !== "correct" && (
              <div class={`banner ${result.outcome}`} role="alert">
                <span class="banner-pip"><Pip pose="think" size={52} /></span>
                <span>
                  {result.outcome === "wrong" && <strong>Not quite. </strong>}
                  {result.outcome === "almost" && <strong>Nearly. </strong>}
                  {result.feedback ? <Maths text={result.feedback} /> : result.outcome === "wrong" ? "Have another go. The hint might help." : null}
                </span>
              </div>
            )}
            {phase === "ask" && showHint && <div class="banner hint"><strong>Hint: </strong><Maths text={q.hint} /></div>}

            {phase === "correct" && (
              <div class="banner good" role="status">
                <span class="banner-pip"><Pip pose="cheer" size={60} /><Sparkles /></span>
                <span class="banner-tick" aria-hidden="true">✓<Sparkles /></span>
                <span>
                  <strong>{praise}</strong>{" "}
                  {attempts > 0 || hinted ? "It counts, and you'll see this one again soon to lock it in." : "That's the first time you've got this one without help."}
                </span>
              </div>
            )}
            {phase === "reveal" && (
              <div class="banner reveal" role="status">
                <strong>No problem, mistakes are how this works.</strong> Here's how to do it:
                <ol class="steps">{q.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
                <p class="answer-shown">Answer: <Maths text={q.shown} /></p>
                {result?.tag && <p class="small muted">We'll bring this skill back soon so it sticks.</p>}
              </div>
            )}
            {phase === "correct" && (
              <details class="why"><summary>See the steps</summary>
                <ol class="steps">{q.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
              </details>
            )}

            <div class="actions">
              {phase === "ask" ? (
                <>
                  <button class="btn primary" onClick={submit} disabled={values.every((v) => !v.trim())}>Check</button>
                  {!showHint && <button class="btn" onClick={() => { setShowHint(true); setHinted(true); }}>Hint</button>}
                  <button class="linkish" onClick={giveUp}>I'm stuck</button>
                </>
              ) : (
                <button class="btn primary" onClick={next}>{idx + 1 >= total ? "Finish" : "Next"}</button>
              )}
            </div>
          </>
        )}

        <details class="grownup">
          <summary>Grown-up help</summary>
          <p><strong>How to explain it.</strong> <Maths text={skill.parentNote} /></p>
          <p><strong>Ask them.</strong> {skill.talkAbout}</p>
        </details>
      </div>
    </main>
  );
}

function Summary({ plan, points, answered, correct, giveUps, bounces }: { plan: Pick[]; points: number; answered: number; correct: number; giveUps: number; bounces: number }) {
  const { profile, go } = useApp();
  const now = Date.now();
  const ids = [...new Set(plan.map((p) => p.skillId))];
  // Stars reward effort and resilience, never speed or perfection.
  const stars = [
    { on: true, label: "Finished the session" },
    { on: giveUps <= 2, label: "Kept going" },
    { on: bounces >= 1, label: bounces >= 1 ? `Bounced back${bounces > 1 ? ` ${bounces} times` : ""}` : "Bounce back: get one right after a miss" },
  ];
  return (
    <main class="page narrow">
      <div class="card summary">
        <div class="pip-slot"><Pip pose="cheer" size={96} /></div>
        <h1>Session complete</h1>
        <p class="lede">{correct} of {answered} correct. +{points} effort points.</p>
        <ul class="stars" aria-label="Effort stars">
          {stars.map((st, i) => (
            <li key={i} class={st.on ? "on" : ""} style={{ animationDelay: `${i * 160 + 200}ms` }}>
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.7l1.3-6.6L2.5 9.5l6.6-.8z" /></svg>
              <span>{st.label}</span>
            </li>
          ))}
        </ul>
        <ul class="recap">
          {ids.map((id) => {
            const st = profile.skills[id];
            return <li key={id}><span>{skillName(id)}</span><span class="muted small">{st ? `Next check ${dueText(st.due, now)}` : ""}</span></li>;
          })}
        </ul>
        <p class="muted small">Coming back tomorrow beats a long session today. Short and regular is how this sticks.</p>
        <div class="actions"><button class="btn primary" onClick={() => go({ name: "home" })}>Done</button></div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { check, type Result } from "../engine/check";
import { DAY, addPoints, levelOf, recordAnswer, recordMistake, skillName, type Pick, type Profile } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import type { TutorContext } from "../tutor/types";
import { AnswerInput, type InputState } from "./answer-input";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { Pip, Sparkles } from "./pip";
import { QBar, QTop } from "./qshell";
import { resolveSkin } from "./skin";
import { TutorPanel, useTutorAvailable } from "./tutor";
import { voice } from "./voice";

type Phase = "intro" | "ask" | "correct" | "reveal" | "done";

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
  const skin = resolveSkin(profile);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [q, setQ] = useState<Question | null>(null);
  const [values, setValues] = useState<string[]>([""]);
  const [result, setResult] = useState<Result | null>(null);
  const [lastChecked, setLastChecked] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stepsShown, setStepsShown] = useState(0);
  const [praise, setPraise] = useState("");
  const [showTutor, setShowTutor] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const tutorUp = useTutorAvailable();
  const tutorOn = !!profile.tutor?.enabled && tutorUp === true;
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
    } else {
      const nq = makeQuestion(profile, skillId, t.seenPrompts, seed);
      t.seenPrompts.add(nq.prompt);
      setQ(nq);
      setPhase("ask");
    }
    setValues([""]); setResult(null); setLastChecked(""); setAttempts(0); setHinted(false); setShowHint(false); setStepsShown(0); setShowTutor(false); setShowHelp(false);
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
    setLastChecked(JSON.stringify(values));
    if (res.outcome === "invalid" || res.outcome === "almost") { setResult(res); return; }
    if (res.outcome === "correct") {
      if (attempts > 0) tally.current.bounces++; // got it after an earlier miss
      settle(attempts === 0 && !hinted ? "right" : "helped");
      setPraise(voice.praise(skin));
      setResult(res); setPhase("correct");
      return;
    }
    setAttempts(attempts + 1);
    if (attempts === 0) { setResult(res); return; }
    settle("wrong", res);
    setResult(res); setPhase("reveal"); setStepsShown(99);
  };

  const showMe = () => {
    tally.current.giveUps++;
    settle("wrong");
    setResult(null); setPhase("reveal"); setStepsShown(99);
  };

  const next = () => {
    if (idx + 1 >= total) {
      if (!tally.current.logged) { tally.current.points += 10; update((p) => addPoints(p, 10)); } // finishing bonus
      logSession(); setPhase("done"); setIdx(total);
    } else setIdx(idx + 1);
  };
  const stop = () => { logSession(); go({ name: "home" }); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
      if (phase === "correct" || phase === "reveal") next();
      else if (phase === "intro") (stepsShown < (q?.solution.length ?? 0) ? setStepsShown(stepsShown + 1) : beginReal());
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  if (phase === "done") return <Summary plan={plan} points={tally.current.points} answered={tally.current.answered} correct={tally.current.correct} giveUps={tally.current.giveUps} bounces={tally.current.bounces} />;
  if (!q || !skill) return null;

  const stale = JSON.stringify(values) !== lastChecked;
  const inputState: InputState = phase === "correct" ? "right" : phase === "reveal" ? "wrong" : result?.outcome === "wrong" && !stale ? "wrong" : result?.outcome === "almost" && !stale ? "nearly" : "idle";
  const canCheck = values.some((v) => v.trim());
  const introDone = stepsShown >= q.solution.length;

  return (
    <div class="qpage" data-phase={phase}>
      <QTop onClose={stop} closeLabel="Stop for now" index={idx} total={total}
        right={<>
          <span class="count">{idx + 1}/{total}</span>
          <button class="icon-btn" aria-label="For grown-ups" aria-pressed={showHelp} onClick={() => setShowHelp(!showHelp)} data-testid="help"><Icon name="book" size={20} /></button>
        </>} />

      <div class="qbody" key={idx}>
        {showHelp && (
          <aside class="help" role="note">
            <strong>For grown-ups</strong>
            <p><strong>How to explain it.</strong> <Maths text={skill.parentNote} /></p>
            <p><strong>Ask them.</strong> {skill.talkAbout}</p>
          </aside>
        )}
        <p class="q-topic">{phase === "intro" ? "New topic · " : ""}{skill.name}</p>

        {phase === "intro" ? (
          <>
            <p class="q-lead">Here's one worked through.</p>
            <p class="q-text"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <ol class="steps">{q.solution.slice(0, stepsShown).map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
            {introDone && <p class="answer-shown">Answer: <Maths text={q.shown} /></p>}
          </>
        ) : (
          <>
            <p class="q-text" data-testid="question"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <AnswerInput answer={q.answer} values={values} onChange={setValues} onSubmit={submit} disabled={phase !== "ask"} state={inputState} />

            <div class="fb-zone" aria-live="polite">
              {phase === "ask" && result && (result.outcome === "wrong" || result.outcome === "almost" || result.outcome === "invalid") && !stale && (
                <div class={`fb ${result.outcome === "almost" ? "nearly" : "bad"}`} role="alert">
                  <span class="fb-pip"><Pip pose="think" size={48} /></span>
                  <p>
                    <strong>{result.outcome === "wrong" ? voice.notQuite(skin) : result.outcome === "almost" ? voice.nearly : ""}</strong>{" "}
                    {result.feedback ? <Maths text={result.feedback} /> : null}
                  </p>
                </div>
              )}
              {phase === "ask" && showHint && (
                <div class="fb hint"><span class="fb-icon"><Icon name="bulb" size={20} /></span><p><Maths text={q.hint} /></p></div>
              )}
              {phase === "correct" && (
                <div class="fb good" role="status">
                  <span class="fb-pip"><Pip pose="cheer" size={56} /><Sparkles /></span>
                  <span class="fb-tick" aria-hidden="true"><Icon name="check" size={18} /><Sparkles /></span>
                  <p><strong>{praise}</strong>{attempts > 0 || hinted ? " We'll ask again soon so it sticks." : ""}</p>
                </div>
              )}
              {phase === "reveal" && (
                <div class="fb reveal" role="status">
                  <p><strong>{voice.reveal(skin)}</strong></p>
                  <ol class="steps">{q.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
                  <p class="answer-shown">Answer: <Maths text={q.shown} /></p>
                </div>
              )}
              {phase === "correct" && (
                <details class="why"><summary>See the steps</summary><ol class="steps">{q.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol></details>
              )}
            </div>

            {tutorOn && showTutor && (
              <TutorPanel key={idx} ctx={tutorContext(q, skill.name, profile.year, phase, values, attempts, hinted)} onClose={() => setShowTutor(false)} />
            )}
          </>
        )}

      </div>

      {phase === "intro" ? (
        <QBar
          left={<button class="btn ghost" onClick={beginReal} data-testid="intro-skip">I know this</button>}
          right={introDone
            ? <button class="btn primary" onClick={beginReal} data-testid="intro-try">Try one <Icon name="arrow" size={20} /></button>
            : <button class="btn primary" onClick={() => setStepsShown(stepsShown + 1)} data-testid="intro-next">{stepsShown === 0 ? "Show me" : "Next step"}</button>}
        />
      ) : phase === "ask" ? (
        <QBar
          left={<>
            {!showHint && <button class="btn ghost" onClick={() => { setShowHint(true); setHinted(true); }} data-testid="hint"><Icon name="bulb" size={20} /> Hint</button>}
            <button class="btn ghost" onClick={showMe} data-testid="show-me"><Icon name="eye" size={20} /> Show me</button>
            {tutorOn && !showTutor && <button class="btn ghost" onClick={() => setShowTutor(true)} data-testid="tutor-open"><Icon name="chat" size={20} /> Ask</button>}
          </>}
          right={<button class="btn primary" onClick={submit} disabled={!canCheck} data-testid="check">Check</button>}
        />
      ) : (
        <QBar
          left={tutorOn && !showTutor ? <button class="btn ghost" onClick={() => setShowTutor(true)} data-testid="tutor-open"><Icon name="chat" size={20} /> Ask</button> : undefined}
          right={<button class="btn primary" onClick={next} data-testid="next">{idx + 1 >= total ? "Finish" : "Next"} <Icon name="arrow" size={20} /></button>}
        />
      )}
    </div>
  );
}

function tutorContext(q: Question, skillName: string, year: number, phase: "ask" | "correct" | "reveal", values: string[], attempts: number, hinted: boolean): TutorContext {
  return {
    skillId: q.skill, skillName, year: Math.max(1, Math.min(13, year)), level: q.level, question: q.prompt, referenceAnswer: q.shown,
    referenceSteps: q.solution.slice(0, 8), hint: q.hint, phase, childAttempts: values.filter((v) => v.trim()).map((v) => v.slice(0, 120)).slice(0, 6), attempts, hinted,
  };
}

function Summary({ plan, points, answered, correct, giveUps, bounces }: { plan: Pick[]; points: number; answered: number; correct: number; giveUps: number; bounces: number }) {
  const { profile, go } = useApp();
  const skin = resolveSkin(profile);
  const now = Date.now();
  const ids = [...new Set(plan.map((p) => p.skillId))];
  // Stars reward effort and resilience, never speed or perfection.
  const stars = [
    { on: true, label: "Finished" },
    { on: giveUps <= 2, label: "Kept going" },
    { on: bounces >= 1, label: bounces >= 1 ? "Bounced back" : "Bounce back" },
  ];
  return (
    <div class="finish">
      <div class="finish-card summary">
        <div class="pip-slot"><Pip pose="cheer" size={112} /></div>
        <h1>{voice.finished(profile.name, skin, answered ? correct / answered : 1)}</h1>
        <p class="finish-score"><strong>{correct}</strong> of {answered} right <span class="muted">· +{points} points</span></p>
        <ul class="stars" aria-label="Effort stars">
          {stars.map((st, i) => (
            <li key={i} class={st.on ? "on" : ""} style={{ animationDelay: `${i * 160 + 200}ms` }}>
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.7l1.3-6.6L2.5 9.5l6.6-.8z" /></svg>
              <span>{st.label}</span>
            </li>
          ))}
        </ul>
        <ul class="recap">
          {ids.map((id) => {
            const st = profile.skills[id];
            return <li key={id}><span>{skillName(id)}</span><span class="muted small">{st ? `back ${dueText(st.due, now)}` : ""}</span></li>;
          })}
        </ul>
        <button class="btn primary big" onClick={() => go({ name: "home" })} data-testid="done">Done</button>
      </div>
    </div>
  );
}

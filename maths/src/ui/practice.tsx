import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { withBarChartHelp } from "../curriculum/expansion";
import { check, type Result } from "../engine/check";
import { recordWrong } from "../engine/wrong-log";
import { DAY, addPoints, levelOf, recordAnswer, recordMistake, skillName, type Pick, type Profile } from "../engine/progress";
import { mulberry32 } from "../engine/rng";
import type { Question } from "../engine/types";
import type { TutorContext } from "../tutor/types";
import { AnswerInput, type InputState } from "./answer-input";
import { useApp } from "./context";
import { FigureView, isDrawing } from "./figure";
import { describeGlyph } from "./glyph";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { Sparkles } from "./pip";
import { Avatar } from "./avatar";
import { WorkingOut, suggestedTool } from "./working-out";
import { conceptsForSkill } from "../concepts";
import { playPracticeSound, readPracticeQuestion, spokenQuestion, stopPracticeNarration, type NarrationStatus } from "./practice-audio";
import { ChapterFriend } from "./chapter-friend";
import { QBar, QTop } from "./qshell";
import { resolveSkin } from "./skin";
import { TutorPanel, useTutorAvailable } from "./tutor";
import { voice } from "./voice";

type Phase = "intro" | "ask" | "correct" | "reveal" | "done";

function makeQuestion(profile: Profile, skillId: string, avoid: Set<string>, seed: number, level?: number): Question {
  const skill = SKILL_BY_ID[skillId];
  const lv = level ?? levelOf(profile.skills[skillId]);
  let used = seed, q = skill.generate(mulberry32(used), lv);
  for (let i = 1; i < 8 && avoid.has(q.prompt); i++) { used = seed + i * 7919; q = skill.generate(mulberry32(used), lv); }
  return { ...q, seed: used }; // the seed lets the grown-ups' report make this question again
}

const dueText = (due: number, now: number) => {
  const d = Math.round((due - now) / DAY);
  return d <= 0 ? "later today" : d === 1 ? "tomorrow" : `in ${d} days`;
};

export function Practice({ plan, resume }: { plan: Pick[]; resume?: boolean }) {
  const { profile, update, leave } = useApp();
  const skin = resolveSkin(profile);
  const [saved] = useState(() => resume ? profile.practiceDraft : undefined);
  const [idx, setIdx] = useState(saved?.index ?? 0);
  const [phase, setPhase] = useState<Phase>(saved?.phase ?? "ask");
  const [q, setQ] = useState<Question | null>(() => saved?.q ? withBarChartHelp(saved.q) : null);
  const [values, setValues] = useState<string[]>(saved?.values ?? [""]);
  const [result, setResult] = useState<Result | null>(saved?.result ?? null);
  const feedback = useRef<HTMLDivElement>(null);
  const [lastChecked, setLastChecked] = useState(saved?.lastChecked ?? "");
  const [attempts, setAttempts] = useState(saved?.attempts ?? 0);
  const [hinted, setHinted] = useState(saved?.hinted ?? false);
  const [showHint, setShowHint] = useState(saved?.showHint ?? false);
  const [stepsShown, setStepsShown] = useState(saved?.stepsShown ?? 0);
  const [praise, setPraise] = useState(saved?.praise ?? "");
  const [showTutor, setShowTutor] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [narration, setNarration] = useState<NarrationStatus>("idle");
  useEffect(() => {
    setNarration("idle");
    return stopPracticeNarration;
  }, [q, phase]);
  useEffect(() => {
    if (showHint || result || phase === "reveal") {
      feedback.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [showHint, result, phase]);
  const tutorUp = useTutorAvailable();
  const tutorOn = !!profile.tutor?.enabled && tutorUp === true;
  const tally = useRef({
    answered: saved?.tally.answered ?? 0, correct: saved?.tally.correct ?? 0, points: saved?.tally.points ?? 0,
    skills: new Set(saved?.tally.skills), seenPrompts: new Set(saved?.tally.seenPrompts), introduced: new Set(saved?.tally.introduced),
    shownAt: Date.now(), activeMs: saved?.tally.activeMs ?? 0, logged: false,
    giveUps: saved?.tally.giveUps ?? 0, bounces: saved?.tally.bounces ?? 0,
  });
  const startedAt = useMemo(() => saved?.startedAt ?? Date.now(), [saved]);
  // what was typed on each wrong try of the question on screen, for the grown-ups' learning report
  const misses = useRef<{ tried: string[]; tags: string[]; notes: string[] }>({ tried: [], tags: [], notes: [] });
  const fixTally = useRef<Record<string, { right: number; total: number }>>({});   // how a "fix this" set went, by topic
  const restoring = useRef(!!saved);
  useEffect(() => {
    if (saved) update((p) => ({ ...p, practiceDraft: undefined }));
  }, []);
  useEffect(() => {
    if (q) update((p) => p.lastSkill === q.skill ? p : { ...p, lastSkill: q.skill });
  }, [q]);

  const total = plan.length;
  const skill = q ? SKILL_BY_ID[q.skill] : null;

  // Load the question for the current step.
  useEffect(() => {
    if (restoring.current) { restoring.current = false; return; }
    if (idx >= total) return;
    const { skillId } = plan[idx];
    const st = profile.skills[skillId];
    const t = tally.current;
    const isNew = !st || (st.seen === 0 && !st.assumed);
    const seed = Date.now() + idx * 104729;
    const pick = plan[idx];
    if (pick.reason === "fix") {
      // a "fix this" set: the exact question again if it has a seed, otherwise a fresh one at the level that went wrong
      const exact = pick.seed !== undefined ? { ...SKILL_BY_ID[skillId].generate(mulberry32(pick.seed), pick.level ?? 1), seed: pick.seed } : makeQuestion(profile, skillId, t.seenPrompts, seed, pick.level);
      t.seenPrompts.add(exact.prompt);
      setQ(exact); setPhase("ask");
    } else if (isNew && !t.introduced.has(skillId)) {
      t.introduced.add(skillId);
      setQ(makeQuestion(profile, skillId, t.seenPrompts, seed, 1));
      setPhase("intro");
    } else {
      const nq = makeQuestion(profile, skillId, t.seenPrompts, seed);
      t.seenPrompts.add(nq.prompt);
      setQ(nq);
      setPhase("ask");
    }
    misses.current = { tried: [], tags: [], notes: [] };
    setValues([""]); setResult(null); setLastChecked(""); setAttempts(0); setHinted(false); setShowHint(false); setStepsShown(0); setShowTutor(false); setShowHelp(false);
    t.shownAt = Date.now();
  }, [idx]);

  const beginReal = () => {
    const t = tally.current;
    const nq = makeQuestion(profile, plan[idx].skillId, t.seenPrompts, Date.now() + idx * 31, 1);
    t.seenPrompts.add(nq.prompt);
    misses.current = { tried: [], tags: [], notes: [] };
    setQ(nq); setPhase("ask"); setValues([""]); setResult(null); setStepsShown(0); t.shownAt = Date.now();
  };

  const logSession = () => {
    const t = tally.current;
    if (t.logged || t.answered === 0) return;
    t.logged = true;
    const minutes = Math.max(1, Math.round(t.activeMs / 60000));
    const fixed = Object.entries(fixTally.current).map(([skill, v]) => ({ skill, at: Date.now(), ...v }));
    update((p) => ({ ...p, sessions: [...p.sessions, { at: startedAt, minutes, answered: t.answered, correct: t.correct, skills: [...t.skills] }], ...(fixed.length ? { fixes: [...(p.fixes ?? []), ...fixed].slice(-60) } : {}) }));
  };

  const settle = (kind: "right" | "helped" | "wrong", mistake?: Result) => {
    if (!q) return;
    const t = tally.current;
    t.answered++; t.skills.add(q.skill);
    t.activeMs += Math.min(180_000, Date.now() - t.shownAt);
    if (kind !== "wrong") t.correct++;
    const pts = kind === "right" ? 10 : kind === "helped" ? 7 : 4;
    t.points += pts;
    if (plan[idx]?.reason === "fix") { const f = fixTally.current[q.skill] ?? { right: 0, total: 0 }; fixTally.current[q.skill] = { right: f.right + (kind === "wrong" ? 0 : 1), total: f.total + 1 }; }
    const m = misses.current, tried = [...m.tried], tags = [...m.tags], notes = [...m.notes];
    update((p) => {
      let n = recordAnswer(p, q.skill, kind);
      if (mistake?.tag && mistake.feedback) n = recordMistake(n, mistake.tag, q.skill, mistake.feedback);
      if (kind === "wrong" || tried.length > 0) n = recordWrong(n, { q, outcome: kind === "wrong" ? (tried.length ? "missed" : "gave-up") : "helped", tried, tags, notes, source: "practice" });
      return addPoints(n, pts);
    });
  };

  // a quick double tap must count once: a second tap with the same answer in the same moment is ignored
  const lastTap = useRef({ key: "", at: 0 });
  const advanced = useRef(-1);
  const tapped = (key: string) => { const now = Date.now(), dup = lastTap.current.key === key && now - lastTap.current.at < 600; lastTap.current = { key, at: now }; return dup; };
  const submit = () => {
    if (!q || phase !== "ask" || tapped(`check:${idx}:${JSON.stringify(values)}`)) return;
    const res = check(q, values);
    if (soundOn && res.outcome !== "correct") playPracticeSound("tap");
    setLastChecked(JSON.stringify(values));
    if (res.outcome === "invalid" || res.outcome === "almost") { setResult(res); return; }
    if (res.outcome === "correct") {
      if (attempts > 0) tally.current.bounces++; // got it after an earlier miss
      settle(attempts === 0 && !hinted ? "right" : "helped");
      if (soundOn) playPracticeSound("success");
      setPraise(voice.praise(skin));
      setResult(res); setPhase("correct");
      return;
    }
    misses.current.tried.push(values.join(" / "));
    if (res.tag) misses.current.tags.push(res.tag);
    if (res.feedback) misses.current.notes.push(res.feedback);
    setAttempts(attempts + 1);
    if (attempts === 0) { if (!res.feedback) setHinted(true); setResult(res); return; }
    settle("wrong", res);
    setResult(res); setPhase("reveal"); setStepsShown(99);
  };

  const showMe = () => {
    if (phase !== "ask" || tapped(`show:${idx}`)) return;
    tally.current.giveUps++;
    settle("wrong");
    setResult(null); setPhase("reveal"); setStepsShown(99);
  };

  const next = () => {
    if (advanced.current === idx) return; // already moving on from this question
    advanced.current = idx;
    if (idx + 1 >= total) {
      if (!tally.current.logged) { tally.current.points += 10; update((p) => addPoints(p, 10)); } // finishing bonus
      if (plan[0]?.reason === "refresher") update((p) => ({ ...p, lastRefresher: Date.now() }));
      logSession(); setPhase("done"); setIdx(total);
    } else setIdx(idx + 1);
  };
  const stop = () => {
    if (!q || phase === "done") return;
    const t = tally.current;
    t.logged = true;
    update((p) => ({
      ...p,
      lastSkill: q.skill,
      practiceDraft: {
        plan, startedAt, index: idx, q, phase, values, result, lastChecked, attempts, hinted, showHint, stepsShown, praise,
        tally: {
          answered: t.answered, correct: t.correct, points: t.points, skills: [...t.skills], seenPrompts: [...t.seenPrompts],
          introduced: [...t.introduced], activeMs: t.activeMs, giveUps: t.giveUps, bounces: t.bounces,
        },
      },
    }));
    leave({ name: "home" });
  };
  useEffect(() => () => logSession(), []);

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
  const spoken = spokenQuestion(q.prompt);
  const narrationVoice = profile.narrationVoice ?? "female";
  const canRead = spoken && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined";
  const toggleSound = () => {
    if (!soundOn) playPracticeSound("tap");
    setSoundOn(!soundOn);
  };

  const askPill = tutorOn && !showTutor ? <button class="btn ghost" onClick={() => setShowTutor(true)} data-testid="tutor-open" aria-label="Ask the AI tutor"><Icon name="chat" size={20} /> <span class="lbl-text-2">Ask</span></button> : undefined;
  const tutorPanel = tutorOn && showTutor && phase !== "intro" ? <TutorPanel key={idx} ctx={tutorContext(q, skill.name, profile.year, phase, values, attempts, hinted)} onClose={() => setShowTutor(false)} /> : undefined;

  return (
    <div class="qpage practice-page" data-phase={phase}>
      <QTop onClose={stop} closeLabel="Save and leave practice" closeText="Save and leave" index={idx} total={total}
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
        <div class="practice-tools">
          <div><p class="workbook-tab">Practice · {idx + 1} of {total}</p><p class="q-topic">{phase === "intro" ? "New topic · " : ""}{skill.name}</p></div>
          <div class="practice-audio">
            {canRead && <button class="btn ghost audio-control" onClick={() => readPracticeQuestion(spoken, narrationVoice, setNarration)}>
              <Icon name="speaker" size={21} />Read aloud
            </button>}
            {typeof Audio !== "undefined" && phase !== "intro" && <button class="btn ghost audio-control" aria-label="Answer sound effects" aria-pressed={soundOn} onClick={toggleSound}>
              <Icon name={soundOn ? "speaker" : "mute"} size={21} />Effects
            </button>}
          </div>
        </div>
        {idx === 0 && <p class="small muted">You can save this practice and finish it later from Today.</p>}
        {canRead && narration !== "idle" && <p class="small muted" role="status">
          {narration === "loading" ? "Starting the voice…" : narration === "playing" ? "Reading the question…" :
            narration === "fallback" ? "Using an available English voice." : "This browser couldn’t play the voice. Try Read aloud again or check your device’s speech settings."}
        </p>}

        {phase === "intro" ? (
          <>
            {skill.explainer && <p class="q-lead explainer" data-testid="explainer">{skill.explainer}</p>}
            {conceptsForSkill(skill.id).length > 0 && (
              <p class="concept-links learn-about">{conceptsForSkill(skill.id).slice(0, 2).map((c) => <a key={c.id} class="chip-btn" href={`./learn/${c.id}.html`} target="_blank" rel="noopener" data-testid={`learn-about-${c.id}`}><Icon name="book" size={18} /> Learn about {c.title.charAt(0).toLowerCase() + c.title.slice(1)}</a>)}</p>
            )}
            <p class="q-lead">Here's one worked through.</p>
            <p class="q-text"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            {q.answer.kind === "choice" && (
              <AnswerInput answer={q.answer} values={introDone ? [String(q.answer.correct)] : []} onChange={() => {}} onSubmit={() => {}} disabled state={introDone ? "right" : "idle"} />
            )}
            <ol class="steps">{q.solution.slice(0, stepsShown).map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
            {introDone && <p class="answer-shown">Answer: <Maths text={q.shown} /></p>}
          </>
        ) : (
          <div class="question-desk">
            <div class="question-main">
            <p class="q-text" data-testid="question"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} onBoard={(v) => setValues([String(v)])} locked={phase !== "ask"} />}
            <div hidden={isDrawing(q.figure)}>
              <p class="practice-answer-label">Your answer</p>
              <AnswerInput answer={q.answer} skill={q.skill} values={values} onChange={setValues} onSubmit={submit} disabled={phase !== "ask"} state={inputState} reveal={phase === "reveal"} />
            </div>

            <div class="fb-zone" ref={feedback} aria-live="polite">
              {phase === "ask" && result && (result.outcome === "wrong" || result.outcome === "almost" || result.outcome === "invalid") && !stale && (
                <div class={`fb ${result.outcome === "almost" ? "nearly" : "bad"}`} role="alert">
                  <span class="fb-pip"><Avatar choice={profile.avatar} year={profile.year} pose="think" size={48} /></span>
                  <p>
                    <strong>{result.outcome === "wrong" ? voice.notQuite(skin) : result.outcome === "almost" ? voice.nearly : ""}</strong>{" "}
                    {result.feedback ? <Maths text={result.feedback} /> : result.outcome === "wrong" && !showHint ? <Maths text={q.hint} /> : null}
                  </p>
                </div>
              )}
              {phase === "ask" && showHint && (
                <div class="fb hint workbook-margin-note"><span class="fb-icon"><Icon name="bulb" size={20} /></span><p><Maths text={q.hint} /></p></div>
              )}
              {phase === "correct" && (
                <div class="fb good" role="status">
                  <span class="feedback-friend"><ChapterFriend stage={skill.stage} pose="clap" /><Sparkles /></span>
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

            </div>
            <WorkingOut suggest={suggestedTool(skill.id, skill.strand, profile.year)} />
          </div>
        )}

      </div>

      {phase === "intro" ? (
        <QBar
          left={<>
            {stepsShown > 0 && <button class="btn ghost" onClick={() => setStepsShown(stepsShown - 1)}><Icon name="back" size={18} /> Back</button>}
            <button class="btn ghost" onClick={beginReal} data-testid="intro-skip">I know this</button>
          </>}
          right={introDone
            ? <button class="btn primary" onClick={beginReal} data-testid="intro-try">Try one <Icon name="arrow" size={20} /></button>
            : <button class="btn primary" onClick={() => setStepsShown(stepsShown + 1)} data-testid="intro-next">{stepsShown === 0 ? "Show me" : "Next step"}</button>}
        />
      ) : phase === "ask" ? (
        <QBar
          help ask={askPill} float={tutorPanel}
          right={<button class="btn primary" onClick={submit} disabled={!canCheck} data-testid="check"><span class="lbl-long">Check my answer</span><span class="lbl-short">Check</span></button>}
          left={<>
            {!showHint && <button class="btn ghost" onClick={() => { setShowHint(true); setHinted(true); }} data-testid="hint" aria-label="Hint"><Icon name="bulb" size={20} /> <span class="lbl-text">Hint</span></button>}
            {(showHint || attempts > 0) && <button class="btn ghost" onClick={showMe} data-testid="show-me" aria-label="Show the steps"><Icon name="eye" size={20} /> <span class="lbl-long">Show the steps</span><span class="lbl-short lbl-text-2">Steps</span></button>}
          </>}
        />
      ) : (
        <QBar
          help ask={askPill} float={tutorPanel}
          right={<button class="btn primary" onClick={next} data-testid="next">{idx + 1 >= total ? "Finish" : "Next"} <Icon name="arrow" size={20} /></button>}
        />
      )}
    </div>
  );
}

/** Multiple-choice questions only make sense with their options, and pictures are described in words. */
function questionForTutor(q: Question): string {
  const a = q.answer;
  const drawn = q.figure && "alt" in q.figure ? ` The picture shown: ${q.figure.alt}` : "";
  if (a.kind !== "choice") return q.prompt + drawn;
  const options = a.options.map((o, i) => `${"ABCDE"[i]}) ${"glyph" in o ? describeGlyph(o.glyph) : o.text}`).join("; ");
  const fig = q.figure?.type === "glyphs" ? ` The pictures shown: ${q.figure.items.map(describeGlyph).join("; ")}.` : q.figure?.type === "working" ? ` The working: ${q.figure.lines.join(" ")}` : "";
  return `${q.prompt}${fig || drawn} Options: ${options}.`;
}
function attemptsForTutor(q: Question, values: string[]): string[] {
  const mine = values.filter((v) => v.trim()).map((v) => v.slice(0, 120)).slice(0, 6);
  return q.answer.kind === "choice" ? mine.map((v) => (/^\d$/.test(v) ? `Option ${"ABCDE"[+v]}` : v)) : mine;
}

function tutorContext(q: Question, skillName: string, year: number, phase: "ask" | "correct" | "reveal", values: string[], attempts: number, hinted: boolean): TutorContext {
  return {
    skillId: q.skill, skillName, year: Math.max(1, Math.min(13, year)), level: q.level, question: questionForTutor(q), referenceAnswer: q.shown,
    referenceSteps: q.solution.slice(0, 8), hint: q.hint, phase, childAttempts: attemptsForTutor(q, values), attempts, hinted,
  };
}

function Summary({ plan, points, answered, correct, giveUps, bounces }: { plan: Pick[]; points: number; answered: number; correct: number; giveUps: number; bounces: number }) {
  const { profile, leave } = useApp();
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
      <div class="finish-card summary milestone-shell">
        <div class="milestone-banner">
          <h1>{voice.finished(profile.name, skin, answered ? correct / answered : 1)}</h1>
          <p class="finish-score"><strong>{correct}</strong> of {answered} right <span>· +{points} points</span></p>
          {plan[0]?.reason === "fix" && <p class="small">Fix practice done: {correct} of {answered} right. The learning report shows how this topic is going.</p>}
          {plan[0]?.reason === "refresher" && <p class="small">Revision done. The tricky ones will come back sooner, and the secure ones a little later.</p>}
        </div>
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
        <button class="btn primary big" onClick={() => leave({ name: "home" })} data-testid="done">Done</button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import { check } from "../engine/check";
import { buildLesson, finishLesson } from "../engine/lesson";
import type { Question } from "../engine/types";
import { AnswerInput, type InputState } from "./answer-input";
import { useApp } from "./context";
import { FigureView, isDrawing } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { QBar, QTop } from "./qshell";
import { resolveSkin } from "./skin";
import { voice } from "./voice";

/** The screens of a lesson, in order. */
const SCREENS = ["model", "guided", "own-1", "own-2", "own-3", "revisit", "done"] as const;
type Screen = typeof SCREENS[number];
const HEADING: Record<Screen, string> = { model: "Learn", guided: "Try with help", "own-1": "Try on your own", "own-2": "Try on your own", "own-3": "Try on your own", revisit: "Remember this?", done: "Lesson complete" };
const TRIES = 2;

type Phase = "ask" | "correct" | "reveal";

/**
 * A worked-example lesson for one topic (see engine/lesson.ts): watch one worked through, try one with the first steps given,
 * do three on your own, then answer one on an earlier topic. Everything is kept in this screen; finishing records progress.
 */
export function SkillLesson({ skillId }: { skillId: string }) {
  const { profile, update, leave } = useApp();
  const skill = SKILL_BY_ID[skillId];
  const lesson = useMemo(() => buildLesson(skillId), [skillId]);
  const skin = resolveSkin(profile);
  const [at, setAt] = useState(0);
  const screen = SCREENS[at];
  const [stepsShown, setStepsShown] = useState(0);        // model: steps revealed so far
  const [values, setValues] = useState<string[]>([""]);
  const [phase, setPhase] = useState<Phase>("ask");
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState("");
  const [extra, setExtra] = useState(0);                   // guided: extra steps revealed by hints
  const [showHint, setShowHint] = useState(false);
  const tally = useRef({ helped: false, right: 0, revisit: false, busy: 0, last: "" });
  const heading = useRef<HTMLHeadingElement>(null);

  const q: Question | null = screen === "model" ? lesson.model : screen === "guided" ? lesson.guided : screen === "revisit" ? lesson.revisit.q
    : screen === "done" ? null : lesson.independent[Number(screen.slice(-1)) - 1];

  // the answer box takes focus on the question screens, so a keyboard can type straight away
  useEffect(() => { if (screen === "model" || screen === "done") heading.current?.focus({ preventScroll: true }); }, [at]);
  useEffect(() => { update((p) => p.lastSkill === skillId ? p : { ...p, lastSkill: skillId }); }, []);

  const goTo = (n: number) => {
    setAt(n); setStepsShown(0); setValues([""]); setPhase("ask"); setTries(0); setMessage(""); setExtra(0); setShowHint(false);
  };
  const finish = () => {
    update((p) => finishLesson(p, lesson, { helped: tally.current.helped, independentRight: tally.current.right, revisitRight: tally.current.revisit }));
    goTo(SCREENS.length - 1);
  };
  const next = () => (screen === "revisit" ? finish() : goTo(at + 1));
  const close = () => leave({ name: "map", skill: skillId });

  const answerState: InputState = phase === "correct" ? "right" : message && phase === "ask" ? "wrong" : "idle";
  const canCheck = !!q && phase === "ask" && values.some((v) => v.trim());
  const submit = () => {
    if (!q || phase !== "ask" || !values.some((v) => v.trim())) return;
    const now = Date.now();
    const key = `${at}:${values.join("|")}`;
    if (key === tally.current.last && now - tally.current.busy < 600) return; // a double tap on the same answer counts once
    tally.current.busy = now; tally.current.last = key;
    const result = check(q, values);
    if (result.outcome === "correct") {
      if (tries === 0 && !showHint && extra === 0) {
        if (screen.startsWith("own")) tally.current.right++;
        if (screen === "revisit") tally.current.revisit = true;
      } else if (screen === "guided") tally.current.helped = true;
      setPhase("correct"); setMessage("");
      return;
    }
    if (result.outcome === "invalid") { setMessage(result.feedback ?? "Type your answer first."); return; }
    const used = tries + 1;
    setTries(used);
    if (screen === "guided") tally.current.helped = true;
    if (used >= TRIES) { setPhase("reveal"); setMessage(""); return; }
    setMessage(result.feedback ?? q.hint);
  };

  const guidedSteps = screen === "guided" && q ? Math.min(lesson.given + extra, Math.max(0, q.solution.length - 1)) : 0;
  const hintLabel = screen === "guided" && q && lesson.given > 0 ? (guidedSteps < q.solution.length - 1 ? "Next step" : "") : "Hint";

  return (
    <main class="qpage skill-lesson" data-phase={phase}>
      <QTop onClose={close} closeLabel={screen === "done" ? "Back to skills" : `Leave the ${skill.name} lesson`} closeText={screen === "done" ? undefined : "Leave"} index={Math.min(at, SCREENS.length - 1)} total={SCREENS.length - 1} />
      <div class="qbody" key={at}>
        <section class="workbook-panel lesson-panel">
          <p class="workbook-tab">{skill.name}{screen !== "done" && <> · {at + 1} of {SCREENS.length - 1}</>}</p>
          <h1 ref={heading} tabIndex={-1}>{HEADING[screen]}</h1>

          {screen === "model" && q && <>
            <p class="q-lead explainer">{skill.explainer ?? skill.blurb}</p>
            <p class="q-lead">Here's one worked through.</p>
            <p class="q-text"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <ol class="steps">{q.solution.slice(0, stepsShown).map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
            {stepsShown >= q.solution.length && <p class="answer-shown">Answer: <Maths text={q.shown} /></p>}
          </>}

          {q && screen !== "model" && <>
            {screen === "guided" && <p class="q-lead">{lesson.given > 0 ? "The first steps are done for you. Finish it off." : "Here's how to start, then you have a go."}</p>}
            {screen === "revisit" && <p class="q-lead">{lesson.revisit.harder ? "One more, a bit harder, to make it stick." : <>A question on <strong>{SKILL_BY_ID[lesson.revisit.skillId].name}</strong>, which this lesson builds on.</>}</p>}
            <p class="q-text" data-testid="lesson-question"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} onBoard={(v) => setValues([String(v)])} locked={phase !== "ask"} />}
            {screen === "guided" && (guidedSteps > 0
              ? <ol class="steps given">{q.solution.slice(0, guidedSteps).map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
              : <p class="workbook-margin-note"><Maths text={q.hint} /></p>)}
            <div hidden={isDrawing(q.figure)}>
              <p class="practice-answer-label">Your answer</p>
              <AnswerInput answer={q.answer} skill={q.skill} values={values} onChange={setValues} onSubmit={submit} disabled={phase !== "ask"} state={answerState} reveal={phase === "reveal"} />
            </div>
            <div class="fb-zone" aria-live="polite">
              {phase === "ask" && message && <div class="fb bad" role="alert"><p><strong>{voice.notQuite(skin)}</strong> <Maths text={message} /></p></div>}
              {phase === "ask" && showHint && screen !== "guided" && <div class="fb hint workbook-margin-note"><span class="fb-icon"><Icon name="bulb" size={20} /></span><p><Maths text={q.hint} /></p></div>}
              {phase === "correct" && <div class="fb good" role="status"><p><strong>{voice.praise(skin)}</strong></p></div>}
              {phase === "reveal" && <div class="fb reveal" role="status">
                <p><strong>{voice.reveal(skin)}</strong></p>
                <ol class="steps">{q.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
                <p class="answer-shown">Answer: <Maths text={q.shown} /></p>
              </div>}
            </div>
          </>}

          {screen === "done" && <>
            <p>You've worked through {skill.name}: seen one done, tried one with help, and done three on your own.</p>
            <p class="small muted">It will come back in practice a little later, so it sticks.</p>
          </>}
        </section>
      </div>

      {screen === "model" && q ? (
        <QBar
          left={stepsShown > 0 ? <button class="btn ghost" onClick={() => setStepsShown(stepsShown - 1)}><Icon name="back" size={18} /> Back</button> : undefined}
          right={stepsShown >= q.solution.length
            ? <button class="btn primary" onClick={() => goTo(1)} data-testid="lesson-next">Try with help <Icon name="arrow" size={20} /></button>
            : <button class="btn primary" onClick={() => setStepsShown(stepsShown + 1)} data-testid="lesson-show">{stepsShown === 0 ? "Show me" : "Next step"}</button>}
        />
      ) : screen === "done" ? (
        <QBar right={<button class="btn primary" onClick={close} data-testid="lesson-done">Back to skills</button>} />
      ) : phase === "ask" ? (
        <QBar
          left={screen === "guided" && lesson.given > 0
            ? (hintLabel ? <button class="btn ghost" onClick={() => setExtra(extra + 1)} data-testid="lesson-hint"><Icon name="bulb" size={20} /> <span class="lbl-text">{hintLabel}</span></button> : undefined)
            : !showHint && screen !== "guided" ? <button class="btn ghost" onClick={() => setShowHint(true)} data-testid="lesson-hint"><Icon name="bulb" size={20} /> <span class="lbl-text">Hint</span></button> : undefined}
          right={<button class="btn primary" onClick={submit} disabled={!canCheck} data-testid="check"><span class="lbl-long">Check my answer</span><span class="lbl-short">Check</span></button>}
        />
      ) : (
        <QBar right={<button class="btn primary" onClick={next} data-testid="lesson-next">{screen === "revisit" ? "Finish" : "Next"} <Icon name="arrow" size={20} /></button>} />
      )}
    </main>
  );
}

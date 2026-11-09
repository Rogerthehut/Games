import { useEffect, useRef, useState } from "preact/hooks";
import { recordAnswer } from "../engine/progress";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { QBar, QTop } from "./qshell";

const HEADINGS = ["Learn", "Try with help", "Try on your own", "Lesson complete"];
const LAST = HEADINGS.length - 1;

function FractionBar({ parts, shaded }: { parts: number; shaded: number }) {
  return (
    <div class="fraction-model">
      <div class="fraction-bar" role="img" aria-label={`${shaded} of ${parts} equal parts shaded`} style={{ gridTemplateColumns: `repeat(${parts}, 1fr)` }}>
        {Array.from({ length: parts }, (_, i) => <span key={i} class={i < shaded ? "shaded" : ""} />)}
      </div>
      <Maths text={`$\\frac{${shaded}}{${parts}}$`} />
    </div>
  );
}

export function FractionsLesson() {
  const { profile, update, leave } = useApp();
  const [step, setStep] = useState(() => {
    const saved = profile.fractionsLesson;
    return saved === 1 || saved === 2 ? saved : 0;
  });
  const [answer, setAnswer] = useState(() => step < 3 ? profile.fractionsLessonAnswer ?? "" : "");
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    update((p) => ({ ...p, lastSkill: "frac-equiv" }));
  }, []);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const move = (next: number) => {
    setStep(next);
    setAnswer("");
    setFeedback("");
    setHint(false);
    update((p) => {
      if (p.fractionsLesson === LAST) return p;
      const saved = { ...p, fractionsLesson: next, fractionsLessonAnswer: undefined };
      if (next !== LAST) return saved;
      return recordAnswer({ ...saved, fractionsLessonHelped: undefined }, "frac-equiv", p.fractionsLessonHelped ? "helped" : "right");
    });
  };

  const saveAndLeave = () => {
    if (step === 1 || step === 2) update((p) => p.fractionsLesson === LAST ? p : { ...p, fractionsLessonAnswer: answer });
    leave({ name: "map", skill: "frac-equiv" });
  };

  const markHelpUsed = () => {
    if (step === 2) update((p) => p.fractionsLesson === LAST || p.fractionsLessonHelped ? p : { ...p, fractionsLessonHelped: true });
  };

  const submit = (event: Event) => {
    event.preventDefault();
    if (!answer.trim()) return;
    if (Number(answer) !== (step === 1 ? 2 : 6)) {
      markHelpUsed();
      setFeedback(step === 1 ? "Count the small shaded parts. Each small part is one sixth." : "Have another go. Find how many eighths cover the same amount as three quarters.");
      return;
    }
    move(step + 1);
  };

  return (
    <main class="qpage">
      <QTop onClose={saveAndLeave} closeLabel={step < LAST ? "Save and leave equivalent fractions" : "Back to skills"} closeText={step < LAST ? "Save and leave" : undefined} index={Math.min(step, 2)} total={3} />
      <div class="qbody" key={step}>
        <section class="workbook-panel fraction-lesson">
          <p class="workbook-tab">Equivalent fractions · {Math.min(step + 1, 3)} of 3</p>
          <h1 ref={heading} tabIndex={-1}>{HEADINGS[step]}</h1>
          {step === 0 && <>
            <p>Equivalent fractions describe the same amount of the same whole.</p>
            <FractionBar parts={2} shaded={1} />
            <FractionBar parts={4} shaded={2} />
            <p>Both bars are the same size. Split each half into two equal parts. There are now four parts, and two are shaded. The shaded amount stayed the same.</p>
          </>}
          {step === 1 && <>
            <p>One third of the first bar is shaded. In the second bar, each third is split into two equal parts.</p>
            <FractionBar parts={3} shaded={1} />
            <FractionBar parts={6} shaded={2} />
          </>}
          {(step === 1 || step === 2) && (
            <form id="fractions-lesson-answer" onSubmit={submit}>
              <label for="fractions-answer">{step === 1 ? "How many sixths are shaded?" : "A ribbon is three quarters blue. How many eighths of the ribbon are blue?"}</label>
              <input id="fractions-answer" class="field" inputMode="numeric" value={answer} onInput={(event) => { setAnswer(event.currentTarget.value); setFeedback(""); }} />
              {hint && <p class="workbook-margin-note">Each quarter is made of two eighths. Count two eighths for each of the three quarters.</p>}
              {step === 1 && <p class="small muted">Enter a whole number.</p>}
              <p aria-live="polite">{feedback}</p>
            </form>
          )}
          {step === LAST && <p>Three quarters and six eighths cover the same amount. When you split each quarter into two, both numbers in the fraction double.</p>}
        </section>
      </div>
      <QBar
        left={step === 2 ? <button class="btn ghost" onClick={() => { setHint(true); markHelpUsed(); }}><Icon name="bulb" size={18} /> Hint</button>
          : step === 1 ? <button class="btn ghost" onClick={() => move(0)}>Back</button> : undefined}
        right={step === 0 ? <button class="btn primary" onClick={() => move(1)}>Try with help</button>
          : step === LAST ? <button class="btn primary" onClick={() => leave({ name: "map", skill: "frac-equiv" })}>Back to skills</button>
          : <button type="submit" form="fractions-lesson-answer" class="btn primary" disabled={!answer.trim()}>Check my answer</button>}
      />
    </main>
  );
}

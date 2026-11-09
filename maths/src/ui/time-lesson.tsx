import { useEffect, useRef, useState } from "preact/hooks";
import { ClockFace } from "./clock";
import { useApp } from "./context";
import { QBar, QTop } from "./qshell";

const EXAMPLES = [
  { minute: 0, time: "3:00", words: "Three o’clock", hands: "The short hand points to 3. The long hand points to 12." },
  { minute: 15, time: "3:15", words: "Quarter past three", hands: "The short hand is just past 3. The long hand points to 3." },
  { minute: 30, time: "3:30", words: "Half past three", hands: "The short hand is halfway between 3 and 4. The long hand points to 6." },
  { minute: 45, time: "3:45", words: "Quarter to four", hands: "The short hand is nearly at 4. The long hand points to 9." },
];

const LABELS = ["Meet the clock", "Move the hands", "Your turn", "Lesson complete"];

export function TimeLesson() {
  const { profile, update, leave } = useApp();
  const [saved] = useState(() => profile.timeLesson && profile.timeLesson.step < 3 ? profile.timeLesson : undefined);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [answer, setAnswer] = useState(saved?.answer ?? "");
  const [example, setExample] = useState(saved?.example ?? 0);
  const [retry, setRetry] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const backToSkills = () => leave({ name: "map", skill: "elapsed-time" });

  useEffect(() => {
    update((p) => ({ ...p, lastSkill: "elapsed-time" }));
  }, []);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [step]);

  const move = (next: number) => {
    setStep(next);
    setAnswer("");
    setRetry(false);
    update((p) => ({ ...p, timeLesson: { step: next, answer: "", example } }));
  };
  const saveAndLeave = () => {
    if (step < 3) update((p) => ({ ...p, timeLesson: { step, answer, example } }));
    backToSkills();
  };
  const current = EXAMPLES[step === 0 ? 0 : example];

  return (
    <main class="qpage">
      <QTop onClose={saveAndLeave} closeLabel={step < 3 ? "Save and leave telling the time" : "Back to skills"}
        closeText={step < 3 ? "Save and leave" : undefined} index={Math.min(step, 2)} total={3} />
      <div class="qbody" key={step}>
        <section class="workbook-panel fraction-lesson">
          <p class="workbook-tab">Telling the time</p>
          <h1 ref={heading} tabIndex={-1}>{LABELS[step]}</h1>
          {step === 0 && <p>The short hand tells you the hour. The long hand tells you the minutes. When the long hand points to 12, it’s exactly on the hour. We say “o’clock”.</p>}
          {step === 1 && <p>Count five minutes for each number after 12. When the long hand moves halfway round to 6, 30 minutes have passed. We say “half past”.</p>}
          {step < 2 && <>
            <ClockFace hour={3} minute={current.minute} label={current.hands} />
            <p class="clock-reading" aria-live="polite"><strong>{current.time}</strong> · {current.words}</p>
            {step === 1 && <div class="actions clock-options" aria-label="Set the clock">
              {EXAMPLES.map((item, i) => <button key={item.minute} type="button" class="btn small" aria-pressed={example === i} onClick={() => setExample(i)}>{item.time}</button>)}
            </div>}
          </>}
          {step === 2 && <>
            <p>What time does this clock show?</p>
            <ClockFace hour={4} minute={30} label="The short hand is halfway between 4 and 5. The long hand points to 6." />
            <div class="actions clock-options" aria-label="Choose the time">
              {["4:00", "4:30", "6:20"].map((value) => <button key={value} class="btn" aria-pressed={answer === value} onClick={() => { setAnswer(value); setRetry(false); }}>{value}</button>)}
            </div>
            {retry && <p class="workbook-margin-note" role="status">The short hand has passed 4. Count in fives from 12 to 6 to find the minutes.</p>}
          </>}
          {step === 3 && <p>Half past four is 4:30. The long hand has travelled halfway round the clock, so it’s 30 minutes past four.</p>}
        </section>
      </div>
      <QBar left={step > 0 && step < 3 ? <button class="btn ghost" onClick={() => move(step - 1)}>Back</button> : undefined}
        right={step === 3 ? <button class="btn primary" onClick={backToSkills}>Done</button>
          : step === 2 ? <button class="btn primary" disabled={!answer} onClick={() => answer === "4:30" ? move(3) : setRetry(true)}>Check my answer</button>
          : <button class="btn primary" onClick={() => move(step + 1)}>Next</button>} />
    </main>
  );
}

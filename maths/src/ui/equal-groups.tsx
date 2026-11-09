import { useEffect, useRef, useState } from "preact/hooks";
import { useApp } from "./context";
import { Icon } from "./icons";
import { QBar, QTop } from "./qshell";
import { readPracticeQuestion, stopPracticeNarration, type NarrationStatus } from "./practice-audio";

const COPY = [
  "Look at 3 groups of 4 beans. Count in fours: 4, 8, 12. Three groups of four make twelve.",
  "Make 2 groups of 5. Tap Add a bean until each group has 5 beans.",
  "Move the beans to make 4 groups of 3. How many beans are in the groups altogether?",
];

export function EqualGroups() {
  const { go, leave, profile, update } = useApp();
  const [saved] = useState(() => profile.groupsLesson && profile.groupsLesson.step < 3 ? profile.groupsLesson : undefined);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [turningTo, setTurningTo] = useState<number | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const [places, setPlaces] = useState(() => saved?.places ?? Array<number>(12).fill(0));
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const turned = useRef(false);
  const [groups, setGroups] = useState(saved?.groups ?? [0, 0]);
  const [answer, setAnswer] = useState(saved?.answer ?? "");
  const [feedback, setFeedback] = useState("");
  const [narration, setNarration] = useState<NarrationStatus>("idle");
  const built = groups.every((count) => count === 5);
  const canGoNext = step === 0 || (step === 1 && built);
  useEffect(() => {
    update((p) => ({ ...p, lastSkill: "times-tables" }));
  }, []);
  useEffect(() => {
    if (step === 3) update((p) => ({ ...p, groupsLesson: undefined }));
  }, [step]);
  const saveAndLeave = () => {
    if (step < 3) update((p) => ({ ...p, groupsLesson: { step, answer, groups, places } }));
    leave({ name: "map", skill: "times-tables" });
  };
  useEffect(() => () => stopPracticeNarration(), [step]);
  useEffect(() => {
    if (!turned.current) return;
    if (body.current) body.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (turningTo === null) return;
    const timer = window.setTimeout(() => {
      setStep(turningTo);
      setTurningTo(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [turningTo]);

  const turnTo = (page: number) => {
    if (turningTo !== null) return;
    turned.current = true;
    setDirection(page > step ? "forward" : "back");
    stopPracticeNarration();
    setNarration("idle");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStep(page);
    else setTurningTo(page);
  };

  return (
    <section class="qpage" aria-labelledby="equal-groups-title">
      <QTop onClose={saveAndLeave} closeLabel={step < 3 ? "Save and leave equal groups" : "Back to skills"} closeText={step < 3 ? "Save and leave" : undefined} index={step} total={3} />
      <div class="qbody" ref={body}>
      <div class="workbook-panel equal-groups">
      <p class="eyebrow">Year 3 · Times tables</p>
      <h1 id="equal-groups-title">Equal groups</h1>
      <p class="lesson-bookmark" aria-live="polite">{step < 3 ? `Page ${step + 1} of 3` : "All pages finished"}</p>
      <div class="lesson-book"
        onPointerDown={(event) => {
          if (event.pointerType !== "touch" || !event.isPrimary || turningTo !== null ||
            (event.target instanceof Element && event.target.closest("button, input, label, a"))) return;
          swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => { swipe.current = null; }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
          if (dx < 0 && canGoNext) turnTo(step + 1);
          if (dx > 0 && step > 0) turnTo(step - 1);
        }}>
      <div key={step} class={`lesson-page ${turningTo !== null ? `page-leaving page-turn-${direction}` : turned.current ? "page-arriving" : ""}`}>
      {step < 3 ? <>
        <div class="lesson-instructions">
        <h2 ref={heading} tabIndex={-1}>{["Watch me", "Try it with me", "Try it yourself"][step]}</h2>
        <p>{COPY[step]}</p>
        {narration === "error" && <p role="status">Read-aloud is unavailable. You can still read the words above.</p>}
        </div>
        <div class="lesson-tools">
        {step < 2 && <div class="lesson-groups">
          {(step === 0 ? [4, 4, 4] : groups).map((count, index) => (
            <div class="lesson-group" key={index}>
              <strong>Group {index + 1}</strong>
              <div class="lesson-beans" aria-hidden="true">{Array.from({ length: count }, (_, bean) => <span key={bean} class="bean mint" />)}</div>
              <span>{count} {count === 1 ? "bean" : "beans"}</span>
              {step === 1 && <button class="btn" disabled={count === 5} aria-label={`Add a bean to group ${index + 1}`} onClick={() => setGroups((previous) => previous.map((value, i) => i === index ? Math.min(5, value + 1) : value))}>Add a bean</button>}
            </div>
          ))}
        </div>}
        {step === 0 && <p><strong>3 × 4 = 12</strong></p>}
        {step === 1 && <p role="status">{built ? "You made 2 equal groups. 5 plus 5 makes 10." : ""}</p>}
        {step === 2 && <BeanBoard places={places} onMove={(bean, place) => setPlaces((previous) => previous.map((current, index) => index === bean ? place : current))} />}
        </div>
        {step === 2 && <form id="equal-groups-answer" onSubmit={(event) => {
          event.preventDefault();
          if (Number(answer.trim()) === 12) turnTo(3);
          else setFeedback("Try counting in threes. Start at 3, then 6.");
        }}>
          <label for="lesson-answer">Your answer</label>
          <input id="lesson-answer" class="field" inputMode="numeric" value={answer} onInput={(event) => { setAnswer(event.currentTarget.value); setFeedback(""); }} />
          <p class={feedback ? "workbook-margin-note" : ""} role="status">{feedback}</p>
        </form>}
      </> : <div role="status">
        <h2 ref={heading} tabIndex={-1}>Lesson complete!</h2>
        <p>4 groups of 3 make 12. You can write that as 4 × 3 = 12.</p>
      </div>}
      </div>
      </div>
      </div>
      </div>
      <QBar
        left={<>
          <button class="btn ghost" disabled={step === 0 || turningTo !== null} onClick={() => turnTo(step - 1)}><Icon name="back" size={18} /> Back</button>
          {step < 3 && <button class="btn ghost" onClick={() => readPracticeQuestion(COPY[step], profile.narrationVoice ?? "female", setNarration)}><Icon name="speaker" size={20} /> Read aloud</button>}
        </>}
        right={step < 2
          ? <button class="btn primary" disabled={!canGoNext || turningTo !== null} onClick={() => turnTo(step + 1)}>Next page <Icon name="arrow" size={18} /></button>
          : step === 2
          ? <button type="submit" form="equal-groups-answer" class="btn primary" disabled={!answer.trim() || turningTo !== null}>Check my answer</button>
          : <button class="btn primary" onClick={() => go({ name: "practice", plan: Array.from({ length: 3 }, () => ({ skillId: "times-tables", reason: "continue" })) })}>Practise times tables</button>}
      />
    </section>
  );
}

function BeanBoard({ places, onMove }: { places: number[]; onMove: (bean: number, place: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const move = (place: number) => {
    if (picked === null) return;
    onMove(picked, place);
    setPicked(null);
  };

  return (
    <div class="lesson-groups independent-beans">
      <p role="status">{picked === null ? "Tap a bean to pick it up." : "Tap Put bean here to move it."}</p>
      {[0, 1, 2, 3, 4].map((place) => (
        <div class="lesson-group" key={place}>
          <strong>{place === 0 ? "Bean tray" : `Group ${place}`}</strong>
          <div class="lesson-beans">
            {places.map((location, bean) => location === place && (
              <button key={bean} type="button" class="lesson-bean" aria-pressed={picked === bean}
                aria-label={`Bean ${bean + 1}, ${place === 0 ? "in the tray" : `in group ${place}`}`}
                onClick={() => setPicked(picked === bean ? null : bean)}><span class="bean mint" /></button>
            ))}
          </div>
          <button type="button" class="btn small" disabled={picked === null || places[picked] === place}
            aria-label={place === 0 ? "Put bean back in the tray" : `Put bean in group ${place}`}
            onClick={() => move(place)}>Put bean here</button>
        </div>
      ))}
    </div>
  );
}

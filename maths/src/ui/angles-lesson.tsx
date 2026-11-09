import { useEffect, useRef, useState } from "preact/hooks";
import { useApp } from "./context";
import { QBar, QTop } from "./qshell";

const TITLE = ["Open the door", "Make a right angle", "Try a new diagram", "Lesson complete"];
const LAST = TITLE.length - 1;

function ray(angle: number, length: number) {
  const radians = angle * Math.PI / 180;
  return [length * Math.cos(radians), -length * Math.sin(radians)] as const;
}

function AngleLines({ degrees, length, base = 0, door = false }: { degrees: number; length: number; base?: number; door?: boolean }) {
  const [x, y] = ray(degrees, length);
  const [arcX, arcY] = ray(degrees, 28);
  return (
    <g transform={`rotate(${-base})`}>
      {degrees > 0 && <path d={`M0 0 H28 A28 28 0 0 0 ${arcX} ${arcY} Z`} class="angle-opening" />}
      <path d={`M${length} 0 H0 L${x} ${y}`} class="angle-arms" />
      {door && <g transform={`rotate(${-degrees})`}>
        <rect x="0" y="-6" width={length} height="12" rx="3" class="angle-door" />
        <circle cx={length - 12} r="2.5" fill="var(--ink)" />
      </g>}
      <circle r="5" fill="var(--ink)" />
    </g>
  );
}

export function AnglesLesson() {
  const { profile, update, leave } = useApp();
  const [saved] = useState(() => profile.anglesLesson && profile.anglesLesson.step < LAST ? profile.anglesLesson : undefined);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [degrees, setDegrees] = useState(saved?.degrees ?? 45);
  const [longDoor, setLongDoor] = useState(saved?.longDoor ?? false);
  const [answer, setAnswer] = useState(saved?.answer ?? "");
  const [checked, setChecked] = useState(saved?.checked ?? false);
  const heading = useRef<HTMLHeadingElement>(null);
  const drag = useRef<number | null>(null);
  const rightAngle = step === 1 && checked && degrees === 90;

  useEffect(() => {
    update((p) => ({ ...p, lastSkill: "angles-basic" }));
  }, []);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [step]);

  const save = (next: number, angle: number, choice: string, wasChecked: boolean) => {
    update((p) => ({ ...p, anglesLesson: { step: next, degrees: angle, longDoor, answer: choice, checked: wasChecked } }));
  };
  const exit = () => {
    if (step < LAST) save(step, degrees, answer, checked);
    leave({ name: "map", skill: "angles-basic" });
  };
  const move = (next: number) => {
    const angle = next === 1 ? 40 : degrees;
    setStep(next);
    setDegrees(angle);
    setAnswer("");
    setChecked(false);
    save(next, angle, "", false);
  };
  const turn = (angle: number) => {
    setDegrees(Math.max(0, Math.min(180, angle)));
    setChecked(false);
  };
  const pointDoor = (event: PointerEvent, svg: SVGSVGElement) => {
    const bounds = svg.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * 320 / bounds.width - 160;
    const y = Math.max(0, 136 - (event.clientY - bounds.top) * 160 / bounds.height);
    turn(5 * Math.round(Math.atan2(y, x) * 180 / (Math.PI * 5)));
  };
  const doorPosition = degrees === 0 ? "Closed" : degrees === 90 ? "Pointing straight up" : degrees === 180 ? "Opened all the way"
    : degrees < 90 ? "Pointing up and right" : "Pointing up and left";

  return (
    <main class="qpage">
      <QTop onClose={exit} closeLabel={step < LAST ? "Save and leave the angles lesson" : "Back to Skills"}
        closeText={step < LAST ? "Save and leave" : undefined} index={Math.min(step, LAST - 1)} total={LAST} />
      <div class="qbody" key={step}>
        <section class="workbook-panel fraction-lesson">
          <p class="workbook-tab">Angles</p>
          <h1 ref={heading} tabIndex={-1}>{TITLE[step]}</h1>
          {step === 0 && <p>An angle tells you how far something has turned. Drag or tap the diagram to open the door, or use the slider. Now predict what will happen if you make the door longer. Try it and check the number.</p>}
          {step === 1 && <p>Open the door a quarter turn so it makes a square corner. Then check the angle you made.</p>}
          {step < 2 && <>
            <svg class="angle-diagram angle-interactive" viewBox="0 0 320 160" role="img" aria-label="Door hinge diagram. Use the Door opening slider to move it."
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0) return;
                drag.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
                pointDoor(event, event.currentTarget);
              }}
              onPointerMove={(event) => { if (drag.current === event.pointerId) pointDoor(event, event.currentTarget); }}
              onLostPointerCapture={() => { drag.current = null; }}>
              <g transform="translate(160 136)"><AngleLines degrees={degrees} length={longDoor ? 116 : 76} door /></g>
            </svg>
            <label class="angle-slider">Door opening
              <input type="range" min="0" max="180" step="5" value={degrees}
                aria-valuetext={step === 0 || checked ? `${degrees} degrees` : doorPosition}
                onInput={(event) => turn(Number(event.currentTarget.value))} />
            </label>
            {step === 0 && <div class="actions angle-controls">
              <strong class="angle-reading">{degrees}°</strong>
              <button class="btn" aria-pressed={longDoor} onClick={() => setLongDoor(!longDoor)}>Use a longer door</button>
            </div>}
            {step === 1 && checked && <p class="workbook-margin-note" role="status">{rightAngle ? "90°. That’s a right angle." : `You made ${degrees}°. Try turning the door a little ${degrees < 90 ? "further" : "back"}.`}</p>}
          </>}
          {step === 2 && <>
            <p>Look at the shaded openings. Which angle is larger?</p>
            <div class="angle-comparison">
              <figure>
                <svg class="angle-diagram" viewBox="0 0 150 125" role="img" aria-label="Angle A has short arms pointing at 0 and 55 degrees from the horizontal.">
                  <g transform="translate(16 103)"><AngleLines degrees={55} length={66} /></g>
                </svg>
                <figcaption>Angle A</figcaption>
              </figure>
              <figure>
                <svg class="angle-diagram" viewBox="0 0 150 125" role="img" aria-label="Angle B has longer arms pointing at 15 and 70 degrees from the horizontal.">
                  <g transform="translate(16 111)"><AngleLines degrees={55} length={111} base={15} /></g>
                </svg>
                <figcaption>Angle B</figcaption>
              </figure>
            </div>
            <div class="actions angle-controls" role="group" aria-label="Choose your answer">
              {["Angle A", "Angle B", "They’re equal"].map((choice) => (
                <button key={choice} class="btn" aria-pressed={answer === choice} onClick={() => { setAnswer(choice); setChecked(false); }}>{choice}</button>
              ))}
            </div>
            {checked && <p class="workbook-margin-note" role="status">Look at how far each arm has turned. The length of the arms doesn’t tell you the size of the angle.</p>}
          </>}
          {step === LAST && <p>Both angles are 55°. The arms in B are longer and point in a different direction, but the amount of turn is the same.</p>}
        </section>
      </div>
      <QBar left={step > 0 && step < LAST ? <button class="btn ghost" onClick={() => move(step - 1)}>Back</button> : undefined}
        right={step === LAST ? <button class="btn primary" onClick={exit}>Done</button>
          : step === 2 ? <button class="btn primary" disabled={!answer} onClick={() => answer === "They’re equal" ? move(LAST) : setChecked(true)}>Check my answer</button>
          : step === 1 && !rightAngle ? <button class="btn primary" onClick={() => setChecked(true)}>Check my angle</button>
          : <button class="btn primary" onClick={() => move(step + 1)}>Next</button>} />
    </main>
  );
}

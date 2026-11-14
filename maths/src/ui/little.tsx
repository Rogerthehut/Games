import { LITTLE_ACTIVITIES, littleMax, type LittleActivity } from "../engine/little";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Shell } from "./shell";
import { AddGame, ColourGame, CountGame, ShapesGame, TraceGame } from "./little-games";
import { usePlaying } from "./little-bits";

/** Little ones: touch-and-play activities for ages 2 to 6. No reading needed, no scores, and every touch answers back. */
const ART: Record<LittleActivity, string> = { count: "🔢", trace: "✏️", add: "🦆", shapes: "🔷", colour: "🎨" };

export function LittleHub({ activity }: { activity?: LittleActivity }) {
  const { leave, profile, update } = useApp();
  const [soundOn, toggle] = usePlaying();
  const max = littleMax(profile.early);
  if (activity) {
    const meta = LITTLE_ACTIVITIES.find((a) => a.id === activity)!;
    const done = () => update((p) => ({ ...p, little: { ...(p.little ?? {}), [activity]: (p.little?.[activity] ?? 0) + 1 } }));
    const G = { count: CountGame, trace: TraceGame, add: AddGame, shapes: ShapesGame, colour: ColourGame }[activity];
    return (
      <main class="little-stage" id="main" aria-labelledby="little-h">
        <header class="little-top">
          <button type="button" class="little-round" onClick={() => leave({ name: "little" })} aria-label="Back to Little ones" data-testid="little-back"><Icon name="home" size={30} /></button>
          <h1 id="little-h">{meta.title}</h1>
          <button type="button" class="little-round" onClick={toggle} aria-pressed={soundOn} aria-label={soundOn ? "Sound on. Tap to turn off." : "Sound off. Tap to turn on."}><Icon name={soundOn ? "speaker" : "mute"} size={28} /></button>
        </header>
        <G max={max} onDone={done} />
      </main>
    );
  }
  return <Shell tab="today"><LittleCards /></Shell>;
}

/** The Little ones tiles. Used on their own page, and as Today for Nursery learners. */
export function LittleCards() {
  const { go, profile } = useApp();
  const play = (id: LittleActivity) => go({ name: "little", activity: id });
  return (
    <section class="little-hub" aria-labelledby="little-hub-h">
        <h1 id="little-hub-h">Little ones</h1>
        <p class="muted">Touch, tap and play, {profile.name}.</p>
        <div class="little-cards">
          {LITTLE_ACTIVITIES.map((a) => {
            const plays = profile.little?.[a.id] ?? 0, stars = Math.min(3, plays);
            return (
              <button key={a.id} type="button" class={`little-card lc-${a.id}`} onClick={() => play(a.id)} data-testid={`little-open-${a.id}`}>
                <span class="little-art" aria-hidden="true">{ART[a.id]}</span>
                <strong>{a.title}</strong><small>{a.blurb}</small>
                <span class="little-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((i) => <i key={i} class={i < stars ? "on" : ""}>★</i>)}</span>
              </button>
            );
          })}
        </div>
        <GrownUpNotes />
    </section>
  );
}

/** Short notes for a grown-up: what each activity builds, how to help and a question to ask. Plain text, no gate needed. */
export function GrownUpNotes() {
  return (
    <details class="little-notes" data-testid="little-notes">
      <summary>For grown-ups: what each activity teaches and how to help</summary>
      {LITTLE_ACTIVITIES.map((a) => (
        <section key={a.id} class="little-note">
          <h3>{a.title}</h3>
          <p><strong>What it builds.</strong> {a.builds}</p>
          <p>{a.teach}</p>
          <p><strong>How to help.</strong> {a.help}</p>
          <p><strong>Ask afterwards.</strong> {a.ask}</p>
        </section>
      ))}
      <p class="small muted">These activities have no scores and no wrong answers on screen. Short and often is best: a few minutes, then go and count something real.</p>
    </details>
  );
}

/** Little ones on the Skills page: five rows in the list view and a banner above the path. */
export function LittleSkills({ banner }: { banner?: boolean }) {
  const { go, profile } = useApp();
  if (banner) return (
    <button type="button" class="little-banner little-banner-slim" onClick={() => go({ name: "little" })} data-testid="skills-little-banner">
      <span class="little-banner-art" aria-hidden="true">🎈</span><span><strong>Little ones</strong><small>Counting, tracing, shapes and colours. Start here.</small></span><Icon name="arrow" size={22} />
    </button>
  );
  return (
    <section class="skills-stage little-skills" aria-labelledby="list-little">
      <h2 class="skills-stage-heading" id="list-little" tabIndex={-1}>Little ones</h2>
      <p class="muted">Touch-and-play activities for ages 2 to 6. No reading needed.</p>
      <ul class="skill-list">
        {LITTLE_ACTIVITIES.map((a) => {
          const plays = profile.little?.[a.id] ?? 0;
          return (
            <li class={`skill ${plays ? "growing" : "new"}`} key={a.id} id={`skill-little-${a.id}`}>
              <div class="skill-main"><div class="skill-title"><strong>{a.title}</strong><span class="badge">Little ones</span></div><p class="muted">{a.blurb}</p></div>
              <div class="skill-side"><span class="little-stars" aria-label={`${Math.min(3, plays)} of 3 stars`}>{[0, 1, 2].map((i) => <i key={i} class={i < plays ? "on" : ""}>★</i>)}</span>
                <button class="btn small" onClick={() => go({ name: "little", activity: a.id })} data-testid={`skills-little-${a.id}`}>Play</button></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

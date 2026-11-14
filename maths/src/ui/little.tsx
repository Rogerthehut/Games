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
    </section>
  );
}

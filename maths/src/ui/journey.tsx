import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Skill, Stage } from "../engine/types";
import { SKILLS, STAGE_LABEL } from "../curriculum";
import { SECURE_BOX, isUnlocked, statusOf } from "../engine/progress";
import { useApp } from "./context";
import { Avatar } from "./avatar";
import { STATUS_LABEL } from "./labels";
import { activePathwayStage, canTakePathwayTest } from "../engine/pathway";
import { PathwayFinish } from "./certificate";
import { ChapterFriend } from "./chapter-friend";
import { Clubhouse, TerrainMap, WORLDS } from "./world-scene";

const GLYPH: Record<string, string> = { Number: "+", Ratio: ":", Algebra: "x", Measures: "cm", Geometry: "△", Statistics: "%", Calculus: "∫" };
const STATUS_TEXT = STATUS_LABEL;
const GLYPH_MEANING: [string, string, string][] = [
  ["+", "Number", "counting, adding, multiplying, fractions"], [":", "Ratio", "ratio and proportion"], ["x", "Algebra", "letters for numbers, equations"],
  ["cm", "Measures", "length, time, money, area, volume"], ["△", "Geometry", "shapes and angles"], ["%", "Statistics", "charts, averages, probability"], ["∫", "Calculus", "rates of change and areas under curves"],
];

/** What the symbols on the stops mean. */
function MapKey({ strands }: { strands: Set<string> }) {
  return (
    <section class="journey-key" aria-label="What the symbols mean">
      <h2>What the symbols mean</h2>
      <ul>
        {GLYPH_MEANING.filter(([, strand]) => strands.has(strand)).map(([sym, strand, text]) => (
          <li key={strand}><span class="key-glyph" aria-hidden="true">{sym}</span><span><strong>{strand}</strong><small>{text}</small></span></li>
        ))}
        <li><span class="key-glyph key-tick" aria-hidden="true">✓</span><span><strong>Secure</strong><small>you know this one well</small></span></li>
      </ul>
    </section>
  );
}
const STEP = 118, TOP = 245, W = 360;
const YEAR_GAP = 58, STAGE_GAP = 156;

const WIDE_MAP = "(min-width: 1180px)";
const SKILLS_IN_ORDER = [...SKILLS].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));

function routeLayout(skills: Skill[], wide: boolean, finishStage?: Stage) {
  const width = wide ? 900 : W;
  let y = wide ? 246 : TOP;
  let row = 0;
  let column = 0;
  let rowSize = 0;
  const pos = skills.map((skill, i) => {
    const previous = skills[i - 1];
    const newYear = !previous || previous.year !== skill.year;
    const newStage = !previous || previous.stage !== skill.stage;

    if (newStage && previous?.stage === finishStage && finishStage) y += 220;

    if (!wide) {
      if (previous) y += STEP + (newStage ? STAGE_GAP : newYear ? YEAR_GAP : 0);
      return { x: W / 2 + Math.sin(i * 0.95) * 96, y, newYear, newStage };
    }

    if (newYear || column === rowSize) {
      if (previous) {
        row += 1;
        y += newStage ? 214 : newYear ? 150 : 122;
      }
      column = 0;
      rowSize = skills.slice(i, i + 4).filter((candidate) => candidate.year === skill.year).length;
    }
    const fraction = rowSize === 1 ? .5 : column / (rowSize - 1);
    const x = 120 + (row % 2 === 0 ? fraction : 1 - fraction) * (width - 240);
    column += 1;
    return { x, y, newYear, newStage };
  });
  const finishIndex = skills.reduce((last, skill, i) => skill.stage === finishStage ? i : last, -1);
  const finishTop = finishIndex < 0 ? undefined : pos[finishIndex].y + 104;
  const height = y + (finishIndex === skills.length - 1 ? 340 : 96);
  const worlds = pos.flatMap((point, i) => point.newStage
    ? [{ stage: skills[i].stage, top: point.y - (wide ? 124 : i === 0 ? 128 : (STEP + STAGE_GAP) / 2) }]
    : []);
  const segments = pos.map((point, i) => {
    const previous = pos[i - 1];
    if (!previous) {
      const start = width / 2;
      return `M ${start} 76 C ${start - 42} 118, ${wide ? point.x : point.x + 32} 158, ${point.x} ${point.y}`;
    }
    if (point.y === previous.y) return `L ${point.x} ${point.y}`;
    if (wide && point.x === previous.x) {
      const bend = point.x + (point.x < width / 2 ? -48 : 48);
      return `C ${bend} ${previous.y}, ${bend} ${point.y}, ${point.x} ${point.y}`;
    }
    const middle = (previous.y + point.y) / 2;
    return `C ${previous.x} ${middle}, ${point.x} ${middle}, ${point.x} ${point.y}`;
  });
  return { width, height, pos, worlds, segments, finishTop };
}

/** A winding path through the curriculum, in teaching order. */
export function Journey({ heading, picked, setPicked }: { heading: ComponentChildren; picked?: string; setPicked: (skill?: string) => void }) {
  const { profile, go } = useApp();
  const [wide, setWide] = useState(() => matchMedia(WIDE_MAP).matches);
  useEffect(() => {
    const media = matchMedia(WIDE_MAP);
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const skills = SKILLS_IN_ORDER;
  const stage = activePathwayStage(profile);
  const finishStage = stage && canTakePathwayTest(profile, stage) ? stage : undefined;
  const { width, height, pos, worlds, segments, finishTop } = routeLayout(skills, wide, finishStage);
  const path = segments.join(" ");

  const current = skills.findIndex((s) => s.stage === (stage ?? skills[skills.length - 1].stage) && (profile.skills[s.id]?.box ?? 0) < SECURE_BOX && !profile.skills[s.id]?.assumed && isUnlocked(profile, s));
  const reached = current === -1 ? skills.length - 1 : current;
  const sel = picked ? skills.find((s) => s.id === picked) : undefined;
  const avatarStop = sel ? skills.indexOf(sel) : current;
  const selStatus = sel ? statusOf(profile.skills[sel.id]) : "new";

  const skillSheet = (
    <div class={`sheet ${sel ? "open" : ""}`} role="region" aria-live="polite" aria-label="Selected skill">
      {sel ? (
        <>
          <div><strong>{sel.name}</strong> <span class={`status ${selStatus}`}>{STATUS_TEXT[selStatus]}</span></div>
          <p class="small muted">{sel.blurb}</p>
          <div class="actions">
            {sel.id === "times-tables" && <button class="btn" onClick={() => go({ name: "equal-groups" }, { name: "map", view: "journey", skill: sel.id })}>{profile.groupsLesson && profile.groupsLesson.step < 3 ? "Continue lesson" : "Learn this"}</button>}
            {sel.id === "elapsed-time" && <button class="btn" onClick={() => go({ name: "time-lesson" }, { name: "map", view: "journey", skill: sel.id })}>{profile.timeLesson && profile.timeLesson.step < 3 ? "Continue telling the time" : "Learn to tell the time"}</button>}
            {sel.id === "angles-basic" && <button class="btn" onClick={() => go({ name: "angles-lesson" }, { name: "map", view: "journey", skill: sel.id })}>{profile.anglesLesson && profile.anglesLesson.step < 3 ? "Continue angles lesson" : "Learn about angles"}</button>}
            {sel.id === "frac-equiv" && <button class="btn" onClick={() => go({ name: "fractions-lesson" }, { name: "map", view: "journey", skill: sel.id })}>{profile.fractionsLesson === 1 || profile.fractionsLesson === 2 ? "Continue lesson" : "Learn this"}</button>}
            <button class="btn primary" onClick={() => go({ name: "practice", plan: Array.from({ length: 9 }, () => ({ skillId: sel.id, reason: "continue" as const })) }, { name: "map", view: "journey", skill: sel.id })}>Practise</button>
            <button class="btn" onClick={() => setPicked(undefined)}>Close</button>
          </div>
        </>
      ) : <p class="journey-empty muted">Choose a stop on the map to see the skill and your progress.</p>}
    </div>
  );

  const strandsHere = new Set(skills.map((x) => x.strand));
  return (
    <div class={`journey-wrap ${wide ? "journey-wide" : ""}`}>
      {heading}
      <p class="lede">Tap a stop, then practise it.</p>
      <div class="journey-board">
        <div class="journey" style={{ height: `${height}px` }}>
          <TerrainMap width={width} height={height} wide={wide} regions={worlds} stops={pos.map((point, i) => ({ ...point, stage: skills[i].stage }))} />
          <svg class="journey-path" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={path} class="trail-edge" />
            <path d={path} class="trail" />
            <path d={path} class="trail-stitch" />
            <path d={segments.slice(0, reached + 1).join(" ")} class="trail done" />
          </svg>
          <div class="journey-clubhouse">
            <h2>Your clubhouse</h2>
            <Clubhouse />
            <span>Start here</span>
          </div>
          {skills.map((s, i) => {
            const st = statusOf(profile.skills[s.id]);
            const { newYear, newStage } = pos[i];
            const here = i === current;
            const avatarOnLeft = pos[i].x >= width / 2;
            return (
              <div key={s.id}>
                {newStage && <h2 id={`journey-world-${s.stage}`} tabIndex={-1} class="journey-world-name" style={{ top: `${pos[i].y - 108}px` }}>{WORLDS[s.stage]}</h2>}
                {(newYear || newStage) && <div class={`journey-chapter ${newStage ? "stage-break" : ""}`}
                  style={{ top: `${newStage ? pos[i].y - 61 : wide ? pos[i].y - 52 : (pos[i - 1].y + pos[i].y) / 2 + 8}px` }}>
                  <span class="chapter-sign">{newStage && <span>{STAGE_LABEL[s.stage]} · </span>}Year {s.year}</span>
                  <span class="chapter-prop"><ChapterFriend stage={s.stage} pose={i <= reached ? "wave" : undefined} /></span>
                </div>}
                <button
                  id={`skill-${s.id}`}
                  class={`node ${st} ${here ? "here" : ""} ${picked === s.id ? "picked" : ""}`}
                  style={{ left: `${(pos[i].x / width) * 100}%`, top: `${pos[i].y}px` }}
                  onClick={() => setPicked(s.id)}
                  aria-label={`${s.name}, ${STATUS_TEXT[st]}`}
                  aria-pressed={picked === s.id}
                >
                  <span class="glyph">{GLYPH[s.strand]}</span>
                  {st === "secure" && <span class="tick">✓</span>}
                  <span class="node-label">{s.name}</span>
                </button>
                {i === avatarStop && <div class={`you-are-here ${avatarOnLeft ? "to-left" : ""}`} style={{ left: `${(pos[i].x / width) * 100}%`, top: `${pos[i].y + 3}px` }}><Avatar choice={profile.avatar} pose="wave" size={56} /></div>}
              </div>
            );
          })}
          {finishStage && <PathwayFinish stage={finishStage} className="journey-finish" top={finishTop} />}
        </div>
        {wide ? (
          <aside class="journey-sidebar">
            {skillSheet}
            <nav class="journey-world-nav" aria-label="Jump to a world">
              <h2>Jump to a world</h2>
              {worlds.map(({ stage }) => (
                <button type="button" class={`journey-world-link terrain-${stage.toLowerCase()}`} key={stage}
                  onClick={() => {
                    const heading = document.getElementById(`journey-world-${stage}`);
                    heading?.scrollIntoView({ block: "start" });
                    heading?.focus({ preventScroll: true });
                  }}>
                  <span class="journey-world-swatch" aria-hidden="true" />
                  <span><strong>{WORLDS[stage]}</strong><small>{STAGE_LABEL[stage]}</small></span>
                </button>
              ))}
            </nav>
            <MapKey strands={strandsHere} />
          </aside>
        ) : <>{skillSheet}<details class="journey-key-fold"><summary>What the symbols mean</summary><MapKey strands={strandsHere} /></details></>}
      </div>
    </div>
  );
}

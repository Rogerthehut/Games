import { useState } from "preact/hooks";
import { SKILLS } from "../curriculum";
import { SECURE_BOX, isUnlocked, statusOf, type Status } from "../engine/progress";
import { useApp } from "./context";
import { Pip } from "./pip";

const GLYPH: Record<string, string> = { Number: "+", Ratio: ":", Algebra: "x", Measures: "cm", Geometry: "△", Statistics: "%", Calculus: "∫" };
const STATUS_TEXT: Record<Status, string> = { new: "Not started", assumed: "Assumed known", learning: "Learning", growing: "Growing", secure: "Secure" };
const STEP = 118, TOP = 70, W = 360;

/** The Explorer skin's skills screen: a winding path through the curriculum, in teaching order. */
export function Journey({ onList }: { onList: () => void }) {
  const { profile, go } = useApp();
  const [picked, setPicked] = useState<string | null>(null);
  const skills = [...SKILLS].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
  const pos = skills.map((_, i) => ({ x: W / 2 + Math.sin(i * 0.95) * 112, y: TOP + i * STEP }));
  const H = TOP * 2 + (skills.length - 1) * STEP;
  const path = pos.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${pos[i - 1].x} ${pos[i - 1].y + STEP / 2}, ${p.x} ${p.y - STEP / 2}, ${p.x} ${p.y}`)).join(" ");

  const current = skills.findIndex((s) => (profile.skills[s.id]?.box ?? 0) < SECURE_BOX && !profile.skills[s.id]?.assumed && isUnlocked(profile, s));
  const reached = current === -1 ? skills.length - 1 : current;
  const sel = picked ? skills.find((s) => s.id === picked) : undefined;
  const selStatus = sel ? statusOf(profile.skills[sel.id]) : "new";

  return (
    <div class="journey-wrap">
      <div class="journey-head">
        <h1>Your journey</h1>
        <button class="linkish" onClick={onList}>Show as a list</button>
      </div>
      <p class="lede">Follow the path. Tap a stop to see it, then practise it.</p>
      <div class="journey" style={{ height: `${H}px` }}>
        <svg class="journey-path" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={path} pathLength="100" class="trail" />
          <path d={path} pathLength="100" class="trail done" style={{ strokeDasharray: `${(100 * reached) / Math.max(1, skills.length - 1)} 100` }} />
        </svg>
        {skills.map((s, i) => {
          const st = statusOf(profile.skills[s.id]);
          const prevYear = i > 0 ? skills[i - 1].year : -1;
          const here = i === current;
          return (
            <div key={s.id}>
              {s.year !== prevYear && <div class="year-flag" style={{ top: `${pos[i].y - 14}px`, [pos[i].x < W / 2 ? "right" : "left"]: "4px" }}><span>Year {s.year}</span></div>}
              <button
                class={`node ${st} ${here ? "here" : ""} ${picked === s.id ? "picked" : ""}`}
                style={{ left: `${(pos[i].x / W) * 100}%`, top: `${pos[i].y}px` }}
                onClick={() => setPicked(s.id)}
                aria-label={`${s.name}, ${STATUS_TEXT[st]}`}
                aria-pressed={picked === s.id}
              >
                <span class="glyph">{GLYPH[s.strand]}</span>
                {st === "secure" && <span class="tick">✓</span>}
                <span class="node-label">{s.name}</span>
              </button>
              {here && <div class="you-are-here" style={{ left: `${(pos[i].x / W) * 100}%`, top: `${pos[i].y - 6}px` }}><Pip pose="wave" size={64} /></div>}
            </div>
          );
        })}
      </div>
      <div class={`sheet ${sel ? "open" : ""}`} role="region" aria-live="polite" aria-label="Selected skill">
        {sel && (
          <>
            <div><strong>{sel.name}</strong> <span class={`status ${selStatus}`}>{STATUS_TEXT[selStatus]}</span></div>
            <p class="small muted">{sel.blurb}</p>
            <div class="actions">
              <button class="btn primary" onClick={() => go({ name: "practice", plan: Array.from({ length: 9 }, () => ({ skillId: sel.id, reason: "continue" as const })) })}>Practise this</button>
              <button class="btn" onClick={() => setPicked(null)}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

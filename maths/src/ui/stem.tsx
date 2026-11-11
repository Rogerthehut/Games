import { useMemo, useState } from "preact/hooks";
import { STAGE_LABEL, STEM_SKILLS } from "../curriculum";
import { conceptsForSkill } from "../concepts";
import { statusOf } from "../engine/progress";
import type { Skill, Stage } from "../engine/types";
import { useApp } from "./context";
import { Icon } from "./icons";
import { STATUS_LABEL } from "./labels";
import { MoreBelow } from "./qshell";
import { LABS, Lab, type LabId } from "./stem-labs";

type Theme = "computing" | "data" | "ai" | "quantum";
const THEMES: { id: Theme; label: string; blurb: string }[] = [
  { id: "computing", label: "Computing", blurb: "Instructions, loops, binary and how computers think." },
  { id: "data", label: "Data science", blurb: "Collecting, checking and making sense of data." },
  { id: "ai", label: "AI and machine learning", blurb: "How machines learn from examples." },
  { id: "quantum", label: "Quantum ideas", blurb: "The strange, true rules of the very small." },
];
export const THEME_OF: Record<string, Theme> = {
  "stem-instructions": "computing", "stem-loops": "computing", "stem-input-output": "computing", "stem-sorting": "computing", "stem-debugging": "computing",
  "stem-binary": "computing", "stem-hex": "computing", "stem-trace": "computing", "stem-logic": "computing", "stem-data-types": "computing",
  "stem-binary-search": "computing", "stem-growth": "computing", "stem-storage": "computing", "stem-caesar": "computing", "stem-information": "computing",
  "stem-data-detective": "data", "stem-outliers": "data",
  "stem-ai-features": "ai", "stem-bias": "ai", "stem-nearest": "ai", "stem-neuron": "ai", "stem-accuracy": "ai", "stem-gradient-descent": "ai", "stem-spam": "ai", "stem-network-layer": "ai",
  "stem-quantum-ideas": "quantum", "stem-qubit": "quantum", "stem-qubit-states": "quantum", "stem-quantum-gates": "quantum",
};
const themeOf = (s: Skill): Theme => THEME_OF[s.id] ?? "computing";
const STAGES: Stage[] = ["KS2", "KS3", "KS4", "KS5"];
const yearsOf = (stage: Stage) => (stage === "KS2" ? "Years 3 to 6" : stage === "KS3" ? "Years 7 to 9" : stage === "KS4" ? "Years 10 and 11" : "Years 12 and 13");
const stageOfYear = (y: number): Stage => (y <= 6 ? "KS2" : y <= 9 ? "KS3" : y <= 11 ? "KS4" : "KS5");

/** The STEM lab: computing, data science, AI and machine learning, and quantum ideas, in topics for every age from Year 3. */
export function Stem() {
  const { profile, go, leave } = useApp();
  const mine = stageOfYear(profile.year);
  const [theme, setTheme] = useState<Theme | "all">("all");
  const [lab, setLab] = useState<LabId | null>(null);
  const shown = useMemo(() => STEM_SKILLS.filter((s) => theme === "all" || themeOf(s) === theme), [theme]);
  const order = [mine, ...STAGES.filter((s) => s !== mine)];
  const tried = STEM_SKILLS.filter((s) => (profile.skills[s.id]?.seen ?? 0) > 0).length;
  if (lab) return <main class="tt-screen stem-screen"><div class="tt-wrap"><Lab id={lab} onBack={() => setLab(null)} /></div></main>;
  return (
    <main class="tt-screen stem-screen">
      <div class="tt-wrap">
        <div class="tt-top">
          <button type="button" class="btn" onClick={() => leave({ name: "home" })} data-testid="stem-back"><Icon name="back" size={18} /> Back</button>
        </div>
        <h1>STEM lab</h1>
        <p class="tt-lead">Computing, data, AI and a little quantum physics. Try anything: these topics sit apart from your maths plan. <strong>{tried}</strong> of {STEM_SKILLS.length} tried so far.</p>

        <section class="stem-labs" aria-labelledby="stem-labs-title">
          <h2 id="stem-labs-title">Build it</h2>
          <p class="small muted">Hands-on labs: nothing to answer, just play and see what happens.</p>
          <ul class="stem-lab-list">
            {LABS.map((l) => <li key={l.id}><button type="button" class="stem-lab-card" onClick={() => setLab(l.id)} data-testid={`open-lab-${l.id}`}><strong>{l.title}</strong><span class="small muted">{l.blurb}</span><span class="stem-theme">{l.theme}</span></button></li>)}
          </ul>
        </section>

        <h2>Practise a topic</h2>
        <div class="stem-themes" role="group" aria-label="Choose a theme">
          <button type="button" class={`chip-btn${theme === "all" ? " on" : ""}`} aria-pressed={theme === "all"} onClick={() => setTheme("all")}>Everything</button>
          {THEMES.map((t) => <button key={t.id} type="button" class={`chip-btn${theme === t.id ? " on" : ""}`} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>)}
        </div>
        {theme !== "all" && <p class="small muted">{THEMES.find((t) => t.id === theme)!.blurb}</p>}

        {order.map((stage) => {
          const skills = shown.filter((s) => s.stage === stage);
          if (!skills.length) return null;
          return (
            <details key={stage} class="stem-stage" open={stage === mine || theme !== "all"}>
              <summary><strong>{STAGE_LABEL[stage]}</strong> <span class="muted">· {yearsOf(stage)}</span>{stage === mine && <span class="stem-yours">Your stage</span>}</summary>
              <ul class="rows stem-list">
                {skills.map((s) => {
                  const st = profile.skills[s.id], status = statusOf(st);
                  return (
                    <li key={s.id} id={`stem-${s.id}`} class="stem-row" data-testid={`stem-topic-${s.id}`}>
                      <div class="stem-text">
                        <h3>{s.name}</h3>
                        <p class="small muted">{s.blurb}</p>
                        <p class="stem-meta"><span class={`stem-theme t-${themeOf(s)}`}>{THEMES.find((t) => t.id === themeOf(s))!.label}</span> <span class={`status ${status}`}>{STATUS_LABEL[status]}</span>{conceptsForSkill(s.id).slice(0, 1).map((c) => <button key={c.id} type="button" class="stem-learn" onClick={() => go({ name: "concept", id: c.id }, { name: "stem" })} data-testid={`stem-learn-${c.id}`}><Icon name="book" size={14} /> Learn: {c.title}</button>)}</p>
                      </div>
                      <button class="btn small" onClick={() => go({ name: "practice", plan: Array.from({ length: 6 }, () => ({ skillId: s.id, reason: "continue" as const })) }, { name: "stem" })} data-testid={`stem-practise-${s.id}`}>
                        {status === "new" ? "Try it" : "Practise"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
        <p class="small muted">If a topic feels too easy or too hard, try one from the stage above or below.</p>
      </div>
      <MoreBelow />
    </main>
  );
}

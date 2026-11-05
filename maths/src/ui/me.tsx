import { useState } from "preact/hooks";
import { SKILLS } from "../curriculum";
import { currentStreak, statusOf, type Profile } from "../engine/progress";
import { yearLabel } from "../engine/diagnostic";
import { useApp } from "./context";
import { ParentGate, parentUnlocked } from "./gate";
import { Icon } from "./icons";
import { Avatar } from "./shell";
import { applyTheme, getTheme, resolveSkin, skinForYear, type ThemeChoice } from "./skin";

const SKINS: { id: NonNullable<Profile["skin"]>; label: string }[] = [
  { id: "auto", label: "Auto" }, { id: "explorer", label: "Explorer" }, { id: "navigator", label: "Navigator" }, { id: "scholar", label: "Scholar" },
];
const MODES: { id: ThemeChoice; label: string }[] = [{ id: "auto", label: "Auto" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }];

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} class={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Me() {
  const { profile, profiles, switchTo, go, update } = useApp();
  const [gate, setGate] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(getTheme());
  const last = profile.baselines[profile.baselines.length - 1];
  const secure = SKILLS.filter((s) => statusOf(profile.skills[s.id]) === "secure").length;
  const streak = currentStreak(profile);

  return (
    <div class="me">
      <header class="me-head">
        <Avatar name={profile.name} size={72} />
        <div>
          <h1>{profile.name}</h1>
          <p class="muted">Year {profile.year}{last ? ` · working at ${yearLabel(last.theta)}` : ""}</p>
        </div>
      </header>

      <dl class="stat-row">
        <div><dt><Icon name="flame" size={18} /> Day streak</dt><dd>{streak}</dd></div>
        <div><dt>Points</dt><dd>{profile.points}</dd></div>
        <div><dt>Topics secure</dt><dd>{secure}<small>/{SKILLS.length}</small></dd></div>
      </dl>

      <ul class="rows">
        <li><button class="row" onClick={() => go(last ? { name: "report" } : { name: "checkup" })}><Icon name="target" /><span>{last ? "Your check-up" : "Take the check-up"}</span><Icon name="chevron" size={18} /></button></li>
        <li><button class="row" onClick={() => go({ name: "plan" })}><Icon name="flag" /><span>Your plan</span><Icon name="chevron" size={18} /></button></li>
      </ul>

      <section aria-labelledby="who-h">
        <h2 id="who-h">Who's learning</h2>
        <ul class="rows">
          {profiles.map((p) => (
            <li key={p.id}>
              <button class={`row ${p.id === profile.id ? "current" : ""}`} onClick={() => p.id !== profile.id && switchTo(p.id)} aria-current={p.id === profile.id ? "true" : undefined}>
                <Avatar name={p.name} size={32} /><span>{p.name} <small class="muted">Year {p.year}</small></span>
                {p.id === profile.id ? <Icon name="check" size={18} /> : <Icon name="chevron" size={18} />}
              </button>
            </li>
          ))}
          <li><button class="row add" onClick={() => go({ name: "onboard" })}><Icon name="plus" /><span>Add someone, or change year</span></button></li>
        </ul>
      </section>

      <section aria-labelledby="look-h">
        <h2 id="look-h">Look and feel</h2>
        <p class="field-label">Style</p>
        <Segmented label="Style" value={profile.skin ?? "auto"} options={SKINS} onChange={(v) => update((p) => ({ ...p, skin: v }))} />
        {(profile.skin ?? "auto") === "auto" && <p class="small muted">Chosen to suit Year {profile.year} ({skinForYear(profile.year)}).</p>}
        <p class="field-label">Colours</p>
        <Segmented label="Colours" value={theme} options={MODES} onChange={(v) => { setTheme(v); applyTheme(v); }} />
        <p class="sr">Now showing the {resolveSkin(profile)} style.</p>
      </section>

      <ul class="rows">
        <li><button class="row" onClick={() => (parentUnlocked() ? go({ name: "parent" }) : setGate(true))} data-testid="open-parents"><Icon name="lock" /><span>Parents' area</span><Icon name="chevron" size={18} /></button></li>
      </ul>

      {gate && <ParentGate onCancel={() => setGate(false)} onPass={() => { setGate(false); go({ name: "parent" }); }} />}
    </div>
  );
}

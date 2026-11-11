import { useEffect, useState } from "preact/hooks";
import { AVATAR_ROLES, GLASSES, clayAvatar, type AvatarRole } from "../engine/avatar";
import { SKILLS, STAGE_LABEL } from "../curriculum";
import { currentStreak, statusOf, type Profile } from "../engine/progress";
import { yearLabel } from "../engine/diagnostic";
import { useApp } from "./context";
import { SyncChip } from "./account-section";
import { ParentGate, parentUnlocked } from "./gate";
import { Icon } from "./icons";
import { Avatar, avatarVariants } from "./avatar";
import { readPracticeQuestion, stopPracticeNarration, type NarrationStatus, type NarrationVoice } from "./practice-audio";
import { applyTheme, getTheme, resolveSkin, skinForYear, type ThemeChoice } from "./skin";

const SKINS: { id: NonNullable<Profile["skin"]>; label: string }[] = [
  { id: "auto", label: "Auto" }, { id: "explorer", label: "Explorer" }, { id: "navigator", label: "Navigator" }, { id: "scholar", label: "Scholar" },
];
const MODES: { id: ThemeChoice; label: string }[] = [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "auto", label: "Auto (follow my device)" }];
const VOICES: { id: NarrationVoice; label: string }[] = [{ id: "female", label: "Female" }, { id: "male", label: "Male" }];
const STYLE_DETAILS = {
  explorer: "Larger illustrations, softer shapes and warm accents.",
  navigator: "Soft colour accents and simpler illustrations.",
  scholar: "A quiet workbook layout with a simple list of activities.",
};

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
  const currentAvatar = clayAvatar(profile.avatar);
  const [browseRole, setBrowseRole] = useState<AvatarRole | null>(null);
  const role = browseRole ?? currentAvatar.role;
  const roleLabel = AVATAR_ROLES.find(({ id }) => id === role)?.label ?? "Explorer";
  const [preview, setPreview] = useState<NarrationStatus>("idle");
  const voice = profile.narrationVoice ?? "female";
  const canPreview = Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined";
  useEffect(() => {
    setPreview("idle");
    setBrowseRole(null);
    return stopPracticeNarration;
  }, [profile.id]);
  const [gate, setGate] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>(getTheme());
  const last = profile.baselines[profile.baselines.length - 1];
  const secure = SKILLS.filter((s) => statusOf(profile.skills[s.id]) === "secure").length;
  const streak = currentStreak(profile);

  return (
    <div class="me">
      <header class="me-head">
        <Avatar choice={profile.avatar} size={72} />
        <div>
          <h1>{profile.name}</h1>
          <p class="muted">Year {profile.year}{last ? ` · working at ${yearLabel(last.theta)}` : ""}</p>
          <SyncChip />
        </div>
      </header>

      <dl class="stat-row">
        <div><dt><Icon name="star" size={18} /> Day streak</dt><dd>{streak}</dd></div>
        <div><dt>Points</dt><dd>{profile.points}</dd></div>
        <div><dt>Topics secure</dt><dd>{secure}<small>/{SKILLS.length}</small></dd></div>
      </dl>

      <ul class="rows">
        <li><button class="row" onClick={() => go(last ? { name: "report" } : { name: "checkup" })}><Icon name="target" /><span>{last ? "Your check-up" : "Take the check-up"}</span><Icon name="chevron" size={18} /></button></li>
        <li><button class="row" onClick={() => go({ name: "plan" })}><Icon name="flag" /><span>Your plan</span><Icon name="chevron" size={18} /></button></li>
      </ul>

      {!!profile.certificates?.length && (
        <section aria-labelledby="certificates-h">
          <h2 id="certificates-h">Your certificates</h2>
          <ul class="rows">
            {profile.certificates.map(({ stage }) => (
              <li key={stage}><button class="row" onClick={() => go({ name: "certificate", stage })}>
                <Icon name="star" /><span>{STAGE_LABEL[stage]} certificate</span><Icon name="chevron" size={18} />
              </button></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="who-h">
        <h2 id="who-h">Who's learning</h2>
        <ul class="rows">
          {profiles.map((p) => (
            <li key={p.id}>
              <button class={`row ${p.id === profile.id ? "current" : ""}`} onClick={() => p.id !== profile.id && switchTo(p.id)} aria-current={p.id === profile.id ? "true" : undefined}>
                <Avatar choice={p.avatar} size={32} /><span>{p.name} <small class="muted">Year {p.year}</small></span>
                {p.id === profile.id ? <Icon name="check" size={18} /> : <Icon name="chevron" size={18} />}
              </button>
            </li>
          ))}
          <li><button class="row add" onClick={() => go({ name: "onboard" })}><Icon name="plus" /><span>Add someone, or change year</span></button></li>
        </ul>
      </section>

      <section aria-labelledby="avatar-h">
        <h2 id="avatar-h">Choose your avatar</h2>
        <p class="small muted">Pick a character, then choose the portrait you like best.</p>
        <div class="avatar-roles" role="group" aria-label="Character">
          {AVATAR_ROLES.map(({ id, label }) => (
            <button key={id} type="button" class="btn small" aria-pressed={role === id} onClick={() => setBrowseRole(id)}>{label}</button>
          ))}
        </div>
        <div class="avatar-choices" role="group" aria-label={`${roleLabel} portraits`}>
          {avatarVariants(role).map((variant) => (
            <button key={variant} type="button" class="btn" aria-label={variant ? `${roleLabel}, look ${variant}` : `${roleLabel}, original`}
              aria-pressed={currentAvatar.role === role && currentAvatar.variant === variant}
              onClick={() => update((p) => ({ ...p, avatar: { role, variant, glasses: currentAvatar.glasses } }))}>
              <Avatar choice={{ role, variant, glasses: currentAvatar.role === role && currentAvatar.variant === variant ? currentAvatar.glasses : undefined }} size={80} showProp />
            </button>
          ))}
        </div>
        <p class="field-label">Glasses</p>
        <Segmented label="Avatar glasses" value={currentAvatar.glasses ?? "none"} options={[...GLASSES]}
          onChange={(glasses) => update((p) => ({ ...p, avatar: { ...clayAvatar(p.avatar), glasses } }))} />
      </section>

      <section class="appearance-panel paper-edge" aria-labelledby="look-h">
        <h2 id="look-h"><Icon name="sliders" size={18} /> Look and feel</h2>
        <p class="field-label">Style</p>
        <Segmented label="Style" value={profile.skin ?? "auto"} options={SKINS} onChange={(v) => update((p) => ({ ...p, skin: v }))} />
        <p class="small muted settings-help" aria-live="polite">
          {(profile.skin ?? "auto") === "auto" && `Year ${profile.year} uses ${SKINS.find(({ id }) => id === skinForYear(profile.year))?.label}. `}
          {STYLE_DETAILS[resolveSkin(profile)]}
        </p>
        <p class="field-label">Colours</p>
        <Segmented label="Colours" value={theme} options={MODES} onChange={(v) => { setTheme(v); applyTheme(v); }} />
        <p class="sr">Now showing the {resolveSkin(profile)} style.</p>
      </section>

      <section class="appearance-panel paper-edge" aria-labelledby="sound-h">
        <h2 id="sound-h"><Icon name="speaker" size={18} /> Sound</h2>
        <p class="field-label">Read aloud voice</p>
        <Segmented label="Read aloud voice" value={voice} options={VOICES} onChange={(choice) => {
          stopPracticeNarration();
          setPreview("idle");
          update((p) => ({ ...p, narrationVoice: choice }));
        }} />
        <button type="button" class="btn voice-preview" disabled={!canPreview} onClick={() =>
          readPracticeQuestion("Ready to give it a go? What is eight plus five?", voice, setPreview)}>
          <Icon name="speaker" size={19} />Preview voice
        </button>
        <p class="small muted settings-help" role="status">
          {!canPreview ? "Voice playback is unavailable in this browser." :
            preview === "loading" ? "Starting the voice…" : preview === "playing" ? "Playing a sample…" :
            preview === "fallback" ? "This device is using an available English voice." :
            preview === "error" ? "The voice couldn’t play. Check your device’s speech settings." :
            "Your choice is saved for this learner."}
        </p>
      </section>

      <ul class="rows">
        <li><button class="row" onClick={() => go({ name: "tour" })} data-testid="replay-tour"><Icon name="star" /><span>Show me around<small>A quick tour of quarter</small></span><Icon name="chevron" size={18} /></button></li>
        <li><button class="row" onClick={() => (parentUnlocked() ? go({ name: "parent" }) : setGate(true))} data-testid="open-parents"><Icon name="lock" /><span>Parents' area</span><Icon name="chevron" size={18} /></button></li>
      </ul>

      {gate && <ParentGate onCancel={() => setGate(false)} onPass={() => { setGate(false); go({ name: "parent" }); }} />}
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import { MAX_CHILDREN } from "../account/limits";
import { AVATAR_ROLES, avatarBand, type AvatarChoice, type AvatarRole } from "../engine/avatar";
import { newProfile, type Profile } from "../engine/progress";
import { useApp, type Route } from "./context";
import { Avatar, avatarVariants } from "./avatar";
import { Icon } from "./icons";
import { applySkin, skinForYear } from "./skin";

import { CubeMark, Wordmark } from "./wordmark";
import { BrowserStorageNotice, LegalFooter } from "./legal";

const YEARS: { y: number; age: string; stage: string }[] = [
  { y: 3, age: "7–8", stage: "KS2" }, { y: 4, age: "8–9", stage: "KS2" }, { y: 5, age: "9–10", stage: "KS2" }, { y: 6, age: "10–11", stage: "KS2" },
  { y: 7, age: "11–12", stage: "KS3" }, { y: 8, age: "12–13", stage: "KS3" }, { y: 9, age: "13–14", stage: "KS3" },
  { y: 10, age: "14–15", stage: "GCSE" }, { y: 11, age: "15–16", stage: "GCSE" }, { y: 12, age: "16–17", stage: "A-level" }, { y: 13, age: "17–18", stage: "A-level" },
];


/** Pick a character and a portrait for one child. Optional: the child can choose later in Me. */
function AvatarStep({ year, name, value, onPick }: { year: number; name: string; value?: AvatarChoice; onPick: (a: AvatarChoice) => void }) {
  const [role, setRole] = useState<AvatarRole>(typeof value === "object" && value && "role" in value ? value.role : "explorer");
  const band = avatarBand(year);
  return (
    <>
      <div class="avatar-roles" role="group" aria-label="Character">
        {AVATAR_ROLES.map(({ id, label }) => <button key={id} type="button" class="btn small" aria-pressed={role === id} onClick={() => setRole(id)}>{label}</button>)}
      </div>
      <div class="avatar-choices" role="group" aria-label={`Portraits for ${name}`}>
        {avatarVariants(role, band).map((variant) => {
          const choice: AvatarChoice = { role, variant, band };
          const on = typeof value === "object" && !!value && "role" in value && value.role === role && value.variant === variant;
          return <button key={variant} type="button" class="btn" aria-pressed={on} aria-label={`${role}, look ${variant}`} onClick={() => onPick(choice)} data-testid={`ob-avatar-${variant}`}><Avatar choice={choice} year={year} size={72} showProp /></button>;
        })}
      </div>
    </>
  );
}

export function Onboarding({ first, destination = { name: "home" }, account = false }: { first: boolean; destination?: Route; account?: boolean }) {
  const { addProfile, go, profiles } = useApp();
  const [step, setStep] = useState<"name" | "year" | "avatar" | "more">("name");
  const [kids, setKids] = useState<Profile[]>([]);
  const [avatar, setAvatar] = useState<AvatarChoice | undefined>(undefined);
  const room = MAX_CHILDREN - profiles.length - kids.length; // places left on this account
  const [name, setName] = useState("");
  const [year, setYear] = useState<number | null>(null);

  // Picking a year previews the look that goes with it.
  useEffect(() => { if (year) applySkin(skinForYear(year)); }, [year]);

  const continueToYear = () => { if (name.trim()) setStep("year"); };

  /** Save everyone added here. The first child added is the one who is open when the setup ends. */
  const save = (list: Profile[]) => { list.forEach((p, i) => addProfile(p, i === 0)); go(destination); };
  const child = () => { const p = newProfile(name.trim(), year as number); if (avatar) p.avatar = avatar; return p; };
  const finish = () => {
    if (!name.trim() || !year) return;
    if (!account) { addProfile(newProfile(name.trim(), year)); go(destination); return; }
    setStep("avatar");
  };
  const afterAvatar = () => {
    const next = [...kids, child()];
    if (next.length < MAX_CHILDREN - profiles.length) { setKids(next); setStep("more"); return; }
    save(next);
  };
  const another = () => { setName(""); setYear(null); setAvatar(undefined); setStep("name"); };

  return (
    <main class="onboard">
      <div class="onboard-in">
        {step === "name" ? (
          <>
            <div class="welcome-mark"><CubeMark /></div>
            <h1>{account ? (kids.length ? "Add another child" : "Who's learning?") : first ? <>Hi, welcome to <Wordmark /></> : "Who's joining?"}</h1>
            <p class="onboard-sub">{account ? <>Enter <strong>your child's</strong> nickname. A nickname is best: please don't use a full name. {room > 1 ? `You can add up to ${MAX_CHILDREN} children to this account, here or later from the Me page.` : "You can add more children later from the Me page."}</> : first ? "Let's get you set up. What should I call you? A nickname is fine." : "What should I call them?"}</p>
            <div>
              <input id="name" class="big-input" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.isComposing) continueToYear(); }} autoComplete="off" autoFocus placeholder="First name" maxLength={24} aria-label="First name" />
              <button class="btn primary big" type="button" onClick={continueToYear} disabled={!name.trim()} data-testid="name-next">Next <Icon name="arrow" size={20} /></button>
            </div>
            <div class="onboard-links">
              {!first && <button class="linkish" onClick={() => go({ name: "me" })}>Cancel</button>}
            </div>
          </>
        ) : step === "avatar" ? (
          <>
            <button class="back" onClick={() => setStep("year")} aria-label="Back"><Icon name="back" size={22} /></button>
            <h1>Choose a look for {name.trim()}</h1>
            <p class="onboard-sub">Pick a character and portrait. You can change it any time from the Me page, or skip this for now.</p>
            <AvatarStep year={year as number} name={name.trim()} value={avatar} onPick={setAvatar} />
            <button class="btn primary big" onClick={afterAvatar} data-testid="avatar-next">{avatar ? "Next" : "Skip for now"} <Icon name="arrow" size={20} /></button>
          </>
        ) : step === "more" ? (
          <>
            <h1>{kids.length === 1 ? `${kids[0].name} is ready` : "Everyone so far"}</h1>
            <ul class="list" style="list-style:none;padding:0;margin:12px 0" aria-label="Children on this account">
              {kids.map((k) => <li key={k.id}><div class="row"><Avatar choice={k.avatar} year={k.year} size={36} /><span>{k.name} <small class="muted">Year {k.year}</small></span></div></li>)}
            </ul>
            <p class="onboard-sub">{room > 0 ? `Do you have another child to add? An account can have up to ${MAX_CHILDREN}. You can also add more later from the Me page.` : "That's the most one account can have."}</p>
            {room > 0 && <button class="btn big" type="button" onClick={another} data-testid="add-another">Add another child <Icon name="plus" size={20} /></button>}
            <button class="btn primary big" type="button" onClick={() => save(kids)} data-testid="setup-done">Start learning <Icon name="arrow" size={20} /></button>
          </>
        ) : (
          <>
            <button class="back" onClick={() => setStep("name")} aria-label="Back"><Icon name="back" size={22} /></button>
            <h1>Which year are you in, {name.trim()}?</h1>
            <p class="onboard-sub">The year you're in at school right now.</p>
            <div class="years" role="radiogroup" aria-label="School year">
              {YEARS.map((o) => (
                <button key={o.y} role="radio" aria-checked={year === o.y} class={`year ${year === o.y ? "on" : ""}`} onClick={() => setYear(o.y)} data-stage={o.stage} data-testid={`year-${o.y}`}>
                  <strong>Year {o.y}</strong><small>{o.age} · {o.stage}</small>
                </button>
              ))}
            </div>
            <button class="btn primary big" onClick={finish} disabled={!year} data-testid="year-go">{account ? "Next" : "Let's go"} <Icon name="arrow" size={20} /></button>
          </>
        )}
      </div>
      <LegalFooter />
      <BrowserStorageNotice />
    </main>
  );
}

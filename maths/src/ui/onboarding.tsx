import { useEffect, useState } from "preact/hooks";
import { newProfile } from "../engine/progress";
import { useApp, type Route } from "./context";
import { Icon } from "./icons";
import { applySkin, skinForYear } from "./skin";

import { CubeMark, Wordmark } from "./wordmark";
import { BrowserStorageNotice, LegalFooter } from "./legal";

const YEARS: { y: number; age: string; stage: string }[] = [
  { y: 3, age: "7–8", stage: "KS2" }, { y: 4, age: "8–9", stage: "KS2" }, { y: 5, age: "9–10", stage: "KS2" }, { y: 6, age: "10–11", stage: "KS2" },
  { y: 7, age: "11–12", stage: "KS3" }, { y: 8, age: "12–13", stage: "KS3" }, { y: 9, age: "13–14", stage: "KS3" },
  { y: 10, age: "14–15", stage: "GCSE" }, { y: 11, age: "15–16", stage: "GCSE" }, { y: 12, age: "16–17", stage: "A-level" }, { y: 13, age: "17–18", stage: "A-level" },
];

export function Onboarding({ first, destination = { name: "home" }, account = false }: { first: boolean; destination?: Route; account?: boolean }) {
  const { addProfile, go } = useApp();
  const [step, setStep] = useState<"name" | "year">("name");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number | null>(null);

  // Picking a year previews the look that goes with it.
  useEffect(() => { if (year) applySkin(skinForYear(year)); }, [year]);

  const continueToYear = () => { if (name.trim()) setStep("year"); };

  const finish = () => {
    if (!name.trim() || !year) return;
    addProfile(newProfile(name.trim(), year));
    go(destination);
  };

  return (
    <main class="onboard">
      <div class="onboard-in">
        {step === "name" ? (
          <>
            <div class="welcome-mark"><CubeMark /></div>
            <h1>{account ? "Who's learning?" : first ? <>Hi, welcome to <Wordmark /></> : "Who's joining?"}</h1>
            <p class="onboard-sub">{account ? "What should we call them? A nickname is best: please don't use a full name." : first ? "Let's get you set up. What should I call you? A nickname is fine." : "What should I call them?"}</p>
            <div>
              <input id="name" class="big-input" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.isComposing) continueToYear(); }} autoComplete="off" autoFocus placeholder="First name" maxLength={24} aria-label="First name" />
              <button class="btn primary big" type="button" onClick={continueToYear} disabled={!name.trim()} data-testid="name-next">Next <Icon name="arrow" size={20} /></button>
            </div>
            <div class="onboard-links">
              {!first && <button class="linkish" onClick={() => go({ name: "me" })}>Cancel</button>}
            </div>
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
            <button class="btn primary big" onClick={finish} disabled={!year} data-testid="year-go">Let's go <Icon name="arrow" size={20} /></button>
          </>
        )}
        <LegalFooter />
      </div>
      <BrowserStorageNotice />
    </main>
  );
}

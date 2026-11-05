import { useEffect, useState } from "preact/hooks";
import { newProfile } from "../engine/progress";
import { importProfile } from "../engine/storage";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Pip } from "./pip";
import { applySkin, skinForYear } from "./skin";

const YEARS: { y: number; age: string; stage: string }[] = [
  { y: 3, age: "7–8", stage: "KS2" }, { y: 4, age: "8–9", stage: "KS2" }, { y: 5, age: "9–10", stage: "KS2" }, { y: 6, age: "10–11", stage: "KS2" },
  { y: 7, age: "11–12", stage: "KS3" }, { y: 8, age: "12–13", stage: "KS3" }, { y: 9, age: "13–14", stage: "KS3" },
  { y: 10, age: "14–15", stage: "GCSE" }, { y: 11, age: "15–16", stage: "GCSE" }, { y: 12, age: "16–17", stage: "A-level" }, { y: 13, age: "17–18", stage: "A-level" },
];

export function Onboarding({ first }: { first: boolean }) {
  const { addProfile, replaceProfile, go } = useApp();
  const [step, setStep] = useState<"name" | "year">("name");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [pasted, setPasted] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState("");

  // Picking a year previews the look that goes with it.
  useEffect(() => { if (year) applySkin(skinForYear(year)); }, [year]);

  const finish = () => {
    if (!name.trim() || !year) return;
    addProfile(newProfile(name.trim(), year));
    go({ name: "checkup" });
  };
  const load = () => {
    try { replaceProfile(importProfile(pasted.trim())); go({ name: "home" }); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <main class="onboard">
      <div class="onboard-in">
        {step === "name" ? (
          <>
            <div class="pip-slot"><Pip pose="wave" size={120} /></div>
            <span class="logo-tile" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 18 L9 9 L13 14 L21 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="21" cy="5" r="2.2" fill="var(--effort)" /></svg></span>
            <h1>{first ? "Hi, I'm MathPath." : "Who's joining?"}</h1>
            <p class="onboard-sub">{first ? "Let's get you set up. What should I call you?" : "What should I call them?"}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep("year"); }}>
              <input id="name" class="big-input" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} autoComplete="off" autoFocus placeholder="First name" maxLength={24} aria-label="First name" />
              <button class="btn primary big" type="submit" disabled={!name.trim()} data-testid="name-next">Next <Icon name="arrow" size={20} /></button>
            </form>
            <div class="onboard-links">
              <button class="linkish" onClick={() => setShowImport(!showImport)}>I have a saved profile</button>
              {!first && <button class="linkish" onClick={() => go({ name: "me" })}>Cancel</button>}
            </div>
            {showImport && (
              <div class="import">
                <textarea rows={5} value={pasted} onInput={(e) => setPasted((e.target as HTMLTextAreaElement).value)} placeholder="Paste your saved text here" aria-label="Saved profile text" />
                {error && <p class="error" role="alert">{error}</p>}
                <button class="btn" onClick={load} disabled={!pasted.trim()}>Load it</button>
              </div>
            )}
          </>
        ) : (
          <>
            <button class="back" onClick={() => setStep("name")} aria-label="Back"><Icon name="back" size={22} /></button>
            <h1>Which year are you in, {name.trim()}?</h1>
            <p class="onboard-sub">The year you're in at school right now.</p>
            <div class="years" role="radiogroup" aria-label="School year">
              {YEARS.map((o) => (
                <button key={o.y} role="radio" aria-checked={year === o.y} class={`year ${year === o.y ? "on" : ""}`} onClick={() => setYear(o.y)} data-testid={`year-${o.y}`}>
                  <strong>Year {o.y}</strong><small>{o.age} · {o.stage}</small>
                </button>
              ))}
            </div>
            <button class="btn primary big" onClick={finish} disabled={!year} data-testid="year-go">Let's go <Icon name="arrow" size={20} /></button>
          </>
        )}
      </div>
    </main>
  );
}

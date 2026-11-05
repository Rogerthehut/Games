import { useState } from "preact/hooks";
import { newProfile } from "../engine/progress";
import { importProfile } from "../engine/storage";
import { useApp } from "./context";

const YEARS = [
  { y: 3, label: "Year 3 (age 7-8)", stage: "Key Stage 2" },
  { y: 4, label: "Year 4 (age 8-9)", stage: "Key Stage 2" },
  { y: 5, label: "Year 5 (age 9-10)", stage: "Key Stage 2" },
  { y: 6, label: "Year 6 (age 10-11)", stage: "Key Stage 2" },
  { y: 7, label: "Year 7 (age 11-12)", stage: "Key Stage 3" },
  { y: 8, label: "Year 8 (age 12-13)", stage: "Key Stage 3" },
  { y: 9, label: "Year 9 (age 13-14)", stage: "Key Stage 3" },
  { y: 10, label: "Year 10 (age 14-15)", stage: "GCSE" },
  { y: 11, label: "Year 11 (age 15-16)", stage: "GCSE" },
  { y: 12, label: "Year 12 (age 16-17)", stage: "A-level" },
  { y: 13, label: "Year 13 (age 17-18)", stage: "A-level" },
];

export function Onboarding({ first }: { first: boolean }) {
  const { addProfile, replaceProfile, go } = useApp();
  const [name, setName] = useState("");
  const [year, setYear] = useState(6);
  const [pasted, setPasted] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState("");

  const start = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile(newProfile(name.trim(), year));
    go({ name: "checkup" });
  };
  const load = () => {
    try { replaceProfile(importProfile(pasted.trim())); go({ name: "home" }); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <main class="page narrow">
      <div class="welcome">
        <h1>{first ? "Welcome to MathPath" : "Add a learner"}</h1>
        <p class="lede">Maths for ages 7 to 18, following the UK National Curriculum, with a check-up to find the right starting point and a plan for 11+ preparation. Short sessions, kind feedback, and nothing timed in practice.</p>
      </div>
      <form class="card form" onSubmit={start}>
        <label>
          <span class="field-label">First name</span>
          <input id="name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} autoComplete="off" required />
        </label>
        <label>
          <span class="field-label">School year</span>
          <select id="year" value={year} onChange={(e) => setYear(+(e.target as HTMLSelectElement).value)}>
            {YEARS.map((y) => <option value={y.y}>{y.label} · {y.stage}</option>)}
          </select>
        </label>
        <p class="note">Next you can take a short check-up to find the real starting point. Until then, earlier topics are treated as known and quietly re-checked.</p>
        <button class="btn primary" type="submit">Start</button>
      </form>
      <div class="center">
        <button class="linkish" onClick={() => setShowImport(!showImport)}>I already have a saved progress file</button>
        {!first && <button class="linkish" onClick={() => go({ name: "home" })}>Cancel</button>}
      </div>
      {showImport && (
        <div class="card form">
          <label>
            <span class="field-label">Paste your saved text</span>
            <textarea rows={6} value={pasted} onInput={(e) => setPasted((e.target as HTMLTextAreaElement).value)} />
          </label>
          {error && <p class="error" role="alert">{error}</p>}
          <button class="btn" onClick={load} disabled={!pasted.trim()}>Load progress</button>
        </div>
      )}
    </main>
  );
}

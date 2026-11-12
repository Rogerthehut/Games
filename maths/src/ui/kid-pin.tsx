import { useState } from "preact/hooks";
import { Portal } from "./portal";
import { Avatar } from "./avatar";
import { useApp } from "./context";
import { ParentGate, PinPad, parentUnlocked } from "./gate";
import { checkPin, clearPin, hasPin, kidKey, kidPinProblem, setPin } from "./pin";
import type { Profile } from "../engine/progress";

/** Children from this year can change their own PIN, once a grown-up has allowed it. */
export const SELF_PIN_YEAR = 7;
export const canChangeOwnPin = (p: Profile) => !!p.pinSelf && p.year >= SELF_PIN_YEAR && hasPin(kidKey(p.id));
/** Switching to a child with a PIN asks for it, unless a grown-up has already unlocked the Parents' area. */
export const needsKidPin = (id: string) => hasPin(kidKey(id)) && !parentUnlocked();

const wait = (s: number) => (s > 90 ? `${Math.ceil(s / 60)} minutes` : `${s} seconds`);

/** Asked for before switching to a child who has a PIN. A grown-up can get in without it, or clear it, if it's forgotten. */
export function KidPinGate({ learner, onPass, onCancel }: { learner: Profile; onPass: () => void; onCancel: () => void }) {
  const [pin, setPinText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"pin" | "forgot" | "grownup" | "choose">("pin");
  const go = async () => {
    setBusy(true); setNote("");
    try {
      const r = await checkPin(kidKey(learner.id), pin);
      if (r.ok) { onPass(); return; }
      setPinText("");
      setNote(r.waitSeconds > 0 ? `Too many tries. Please wait ${wait(r.waitSeconds)}.` : `That PIN isn't right. ${r.triesLeft} ${r.triesLeft === 1 ? "try" : "tries"} left before a short wait.`);
    } finally { setBusy(false); }
  };
  if (step === "grownup") return <ParentGate onCancel={() => setStep("forgot")} onPass={() => setStep("choose")} />;
  return (
    <Portal><div class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="kidpin-h" data-testid="kid-pin-gate">
      <div class="gate">
        <div class="kidpin-who"><Avatar choice={learner.avatar} year={learner.year} size={44} /><h2 id="kidpin-h">{learner.name}'s PIN</h2></div>
        {step === "pin" ? (
          <>
            <p>Type {learner.name}'s PIN to open their profile.</p>
            <PinPad value={pin} onChange={setPinText} label={`${learner.name}'s PIN`} testId="kid-pin-input" onEnter={() => { if (!busy && pin.length >= 4) void go(); }} />
            {note && <p class="small gate-note" role="alert" data-testid="kid-pin-note">{note}</p>}
            <div class="actions">
              <button class="btn" onClick={onCancel}>Cancel</button>
              <button class="btn primary" disabled={busy || pin.length < 4} onClick={() => void go()} data-testid="kid-pin-go">Open</button>
            </div>
            <p class="small"><button class="linkish" onClick={() => setStep("forgot")} data-testid="kid-pin-forgot">Forgot it?</button></p>
          </>
        ) : step === "forgot" ? (
          <>
            <p>Ask a grown-up. They can open {learner.name}'s profile, or clear the PIN so you can make a new one.</p>
            <div class="actions">
              <button class="btn" onClick={() => setStep("pin")}>Back</button>
              <button class="btn primary" onClick={() => setStep("grownup")} data-testid="kid-pin-grownup">I'm a grown-up</button>
            </div>
          </>
        ) : (
          <>
            <p>What would you like to do?</p>
            <div class="actions stack">
              <button class="btn primary" onClick={onPass} data-testid="kid-pin-open-anyway">Open {learner.name}'s profile, keep the PIN</button>
              <button class="btn" onClick={() => { clearPin(kidKey(learner.id)); onPass(); }} data-testid="kid-pin-clear">Clear the PIN and open</button>
              <button class="btn ghost" onClick={onCancel}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div></Portal>
  );
}

/** In the Parents' area: turn a PIN on for the learner, change it, turn it off, and let an older child change their own. */
export function KidPinSettings() {
  const { profile, update } = useApp();
  const key = kidKey(profile.id);
  const [step, setStep] = useState<"idle" | "new" | "confirm">("idle");
  const [pin, setPinText] = useState("");
  const [fresh, setFresh] = useState("");
  const [note, setNote] = useState("");
  const [, bump] = useState(0);
  const on = hasPin(key);
  const reset = () => { setStep("idle"); setPinText(""); setFresh(""); setNote(""); };
  const next = async () => {
    if (step === "new") { const why = kidPinProblem(pin); if (why) { setNote(why); return; } setFresh(pin); setPinText(""); setStep("confirm"); setNote(""); return; }
    if (pin !== fresh) { setNote("Those didn't match. Let's try again."); setPinText(""); setFresh(""); setStep("new"); return; }
    if (await setPin(key, pin, kidPinProblem)) { reset(); bump((n) => n + 1); } else setNote("This browser can't save a PIN.");
  };
  return (
    <section class="card" data-testid="kid-pin-settings" aria-labelledby="kidpin-title">
      <h2 id="kidpin-title">{profile.name}'s PIN</h2>
      <p class="small muted">Optional. With a PIN, anyone switching to {profile.name} on this device has to type it first, so brothers and sisters can't open each other's progress. It's a household lock, not a vault. It's kept on this device only, and you can clear it here at any time.</p>
      {step === "idle" ? (
        <div class="actions">
          <button class="btn" onClick={() => setStep("new")} data-testid="kid-pin-make">{on ? "Change PIN" : "Make a PIN"}</button>
          {on && <button class="btn" onClick={() => { clearPin(key); update((p) => ({ ...p, pinSelf: false })); bump((n) => n + 1); }} data-testid="kid-pin-off">Turn off</button>}
        </div>
      ) : (
        <div class="pin-change">
          <p>{step === "new" ? "Choose a PIN of 4 to 6 digits." : "Type it once more."}</p>
          <PinPad value={pin} onChange={setPinText} label="PIN" testId="kid-pin-new" onEnter={() => { if (pin.length >= 4) void next(); }} />
          {note && <p class="small gate-note" role="alert">{note}</p>}
          <div class="actions">
            <button class="btn" onClick={reset}>Cancel</button>
            <button class="btn primary" disabled={pin.length < 4} onClick={() => void next()} data-testid="kid-pin-save">{step === "confirm" ? "Save" : "Next"}</button>
          </div>
        </div>
      )}
      {on && profile.year >= SELF_PIN_YEAR && (
        <label class="check"><input type="checkbox" checked={!!profile.pinSelf} onChange={(e) => update((p) => ({ ...p, pinSelf: (e.target as HTMLInputElement).checked }))} data-testid="kid-pin-self" /> Let {profile.name} change their own PIN (from Year {SELF_PIN_YEAR})</label>
      )}
    </section>
  );
}

/** On the Me page: an older child, allowed by a grown-up, changes their own PIN. They need the current one first. */
export function MyPin() {
  const { profile } = useApp();
  const key = kidKey(profile.id);
  const [step, setStep] = useState<"idle" | "current" | "new" | "confirm" | "done">("idle");
  const [pin, setPinText] = useState("");
  const [fresh, setFresh] = useState("");
  const [note, setNote] = useState("");
  if (!canChangeOwnPin(profile)) return null;
  const reset = (to: "idle" | "done" = "idle") => { setStep(to); setPinText(""); setFresh(""); setNote(""); };
  const next = async () => {
    if (step === "current") {
      const r = await checkPin(key, pin);
      if (r.ok) { setPinText(""); setStep("new"); setNote(""); } else { setPinText(""); setNote(r.waitSeconds > 0 ? `Too many tries. Please wait ${wait(r.waitSeconds)}.` : `That isn't right. ${r.triesLeft} left before a short wait.`); }
    } else if (step === "new") {
      const why = kidPinProblem(pin); if (why) { setNote(why); return; } setFresh(pin); setPinText(""); setStep("confirm"); setNote("");
    } else if (step === "confirm") {
      if (pin !== fresh) { setNote("Those didn't match. Let's try again."); setPinText(""); setFresh(""); setStep("new"); return; }
      if (await setPin(key, pin, kidPinProblem)) reset("done"); else setNote("This browser can't save a PIN.");
    }
  };
  return (
    <section aria-labelledby="mypin-h" data-testid="my-pin">
      <h2 id="mypin-h">My PIN</h2>
      {step === "done" && <p role="status" data-testid="my-pin-done">Your PIN is changed.</p>}
      {step === "idle" || step === "done" ? (
        <><p class="small muted">Your PIN keeps your profile private from others on this device. If you forget it, ask a grown-up.</p><button class="btn" onClick={() => setStep("current")} data-testid="my-pin-change">Change my PIN</button></>
      ) : (
        <div class="pin-change">
          <p>{step === "current" ? "Type your PIN now." : step === "new" ? "Choose a new PIN of 4 to 6 digits." : "Type it once more."}</p>
          <PinPad value={pin} onChange={setPinText} label="PIN" testId="my-pin-input" onEnter={() => { if (pin.length >= 4) void next(); }} />
          {note && <p class="small gate-note" role="alert">{note}</p>}
          <div class="actions">
            <button class="btn" onClick={() => reset()}>Cancel</button>
            <button class="btn primary" disabled={pin.length < 4} onClick={() => void next()} data-testid="my-pin-go">{step === "confirm" ? "Save" : "Next"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

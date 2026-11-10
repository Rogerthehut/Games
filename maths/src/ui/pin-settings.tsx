import { useState } from "preact/hooks";
import { useAccount } from "./account-context";
import { PinPad } from "./gate";
import { checkPin, hasPin, pinProblem, setPin } from "./pin";

/** Change the Parents' area PIN: the current one first, then the new one twice. */
export function PinSettings() {
  const account = useAccount();
  const key = account?.userId || "local";
  const [step, setStep] = useState<"idle" | "current" | "new" | "confirm">("idle");
  const [pin, setPinText] = useState("");
  const [fresh, setFresh] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep("idle"); setPinText(""); setFresh(""); setNote(""); };
  const next = async () => {
    setBusy(true); setNote("");
    try {
      if (step === "current") {
        const r = await checkPin(key, pin);
        if (r.ok) { setPinText(""); setStep("new"); }
        else { setPinText(""); setNote(r.waitSeconds > 0 ? `Too many tries. Please wait ${r.waitSeconds} seconds.` : `That PIN isn't right. ${r.triesLeft} left before a short wait.`); }
      } else if (step === "new") {
        const why = pinProblem(pin);
        if (why) { setNote(why); return; }
        setFresh(pin); setPinText(""); setStep("confirm");
      } else if (step === "confirm") {
        if (pin !== fresh) { setNote("Those didn't match. Let's try again."); setPinText(""); setFresh(""); setStep("new"); return; }
        if (await setPin(key, pin)) { reset(); setDone(true); } else setNote("This browser can't save a PIN.");
      }
    } finally { setBusy(false); }
  };

  return (
    <section class="card" data-testid="pin-settings">
      <h2>Parents' area PIN</h2>
      <p class="small muted">A 6 or 8 digit PIN, asked for after the sum each time the Parents' area opens on this device. If it's forgotten, sign out and back in to make a new one.</p>
      {done && <p role="status" data-testid="pin-changed">PIN changed.</p>}
      {step === "idle" ? (
        <button class="btn" onClick={() => { setDone(false); setStep(hasPin(key) ? "current" : "new"); }} data-testid="change-pin">{hasPin(key) ? "Change PIN" : "Make a PIN"}</button>
      ) : (
        <div class="pin-change">
          <p>{step === "current" ? "Enter your current PIN." : step === "new" ? "Choose a new PIN of 6 or 8 digits." : "Type the new PIN once more."}</p>
          <PinPad value={pin} onChange={setPinText} label="PIN" testId="pin-change-input" />
          {note && <p class="small gate-note" role="alert">{note}</p>}
          <div class="actions">
            <button class="btn" onClick={reset}>Cancel</button>
            <button class="btn primary" disabled={busy || pin.length < 6} onClick={() => void next()} data-testid="pin-change-go">{step === "confirm" ? "Save" : "Next"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

import { useMemo, useState } from "preact/hooks";
import { useAccount } from "./account-context";
import { applyKey, Keypad, useDigitKeys } from "./answer-input";
import { checkPin, hasPin, pinProblem, setPin } from "./pin";

let unlockedUntil = 0;
/** Unlocked for ten minutes after the sum and PIN. Held in memory only. */
export const parentUnlocked = () => Date.now() < unlockedUntil;
const unlock = () => { unlockedUntil = Date.now() + 10 * 60_000; };
const digitsOnly = (t: string) => t.replace(/[^\d]/g, "");

/** A PIN field with the on-screen keypad. Shows dots, never the digits. */
export function PinPad({ value, onChange, label, testId, onEnter }: { value: string; onChange: (v: string) => void; label: string; testId: string; onEnter?: () => void }) {
  // a physical keyboard works too: digits, Backspace, and Enter to go on
  useDigitKeys((k) => onChange(digitsOnly(applyKey(value, k, value.length, value.length).text).slice(0, 8)), { onEnter });
  return (
    <>
      <input class="gate-input gate-pin" value={"●".repeat(value.length)} inputMode="none" readOnly aria-label={label} data-testid={testId} />
      <Keypad mode="digits" onKey={(k) => onChange(digitsOnly(applyKey(value, k, value.length, value.length).text).slice(0, 8))} />
    </>
  );
}

/**
 * A grown-up check in front of the parents' area: a sum a young child can't do quickly, then the parent's own 6 or 8 digit PIN.
 * The first time, the parent makes the PIN. Signing out and back in clears it, which is how a forgotten PIN is reset.
 */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const account = useAccount();
  const key = account?.userId || "local";
  const [step, setStep] = useState<"sum" | "pin">("sum");
  const [round, setRound] = useState(0);
  const sum = useMemo(() => { const a = 13 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4); return { a, b }; }, [round]);
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState(false);
  const [pin, setPinText] = useState("");
  const [first, setFirst] = useState("");   // the PIN typed the first time while making one
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const making = !hasPin(key);

  const shake = () => { setWrong(true); setTimeout(() => setWrong(false), 500); };
  const submitSum = () => {
    if (Number(text) === sum.a * sum.b) { setText(""); setStep("pin"); }
    else { shake(); setText(""); setRound(round + 1); }
  };
  const submitPin = async () => {
    setBusy(true); setNote("");
    try {
      if (making) {
        if (!first) { const why = pinProblem(pin); if (why) { setNote(why); shake(); } else { setFirst(pin); setPinText(""); } return; }
        if (pin !== first) { setNote("Those didn't match. Let's try again."); setFirst(""); setPinText(""); shake(); return; }
        if (await setPin(key, pin)) { unlock(); onPass(); } else setNote("This browser can't save a PIN. Please try another browser.");
        return;
      }
      const r = await checkPin(key, pin);
      if (r.ok) { unlock(); onPass(); return; }
      setPinText(""); shake();
      setNote(r.waitSeconds > 0 ? `Too many tries. Please wait ${r.waitSeconds > 90 ? `${Math.ceil(r.waitSeconds / 60)} minutes` : `${r.waitSeconds} seconds`}.` : `That PIN isn't right. ${r.triesLeft} ${r.triesLeft === 1 ? "try" : "tries"} left before a short wait.`);
    } finally { setBusy(false); }
  };

  // physical keyboard on the sum step: digits, Backspace, Enter to go on, Escape to close
  useDigitKeys((k) => setText((t) => digitsOnly(applyKey(t, k, t.length, t.length).text)), { enabled: step === "sum", onEnter: () => { if (text) submitSum(); }, onEscape: onCancel });
  useDigitKeys(() => {}, { enabled: step === "pin", onEscape: onCancel });

  return (
    <div class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-h">
      <div class="gate">
        <h2 id="gate-h">Parents' area</h2>
        {step === "sum" ? (
          <>
            <p>Ask a grown-up to answer this.</p>
            <p class="gate-sum">{sum.a} × {sum.b} =</p>
            <input class={`gate-input ${wrong ? "shake" : ""}`} value={text} inputMode="none" readOnly aria-label="Answer" data-testid="gate-input"
              onKeyDown={(e) => { if (e.key === "Enter") submitSum(); }} />
            <Keypad mode="digits" onKey={(k) => setText(digitsOnly(applyKey(text, k, text.length, text.length).text))} />
            <div class="actions">
              <button class="btn" onClick={onCancel}>Cancel</button>
              <button class="btn primary" onClick={submitSum} disabled={!text} data-testid="gate-go">Next</button>
            </div>
          </>
        ) : forgot ? (
          <>
            <p>{account ? "To make a new PIN, sign out and sign back in. Signing in proves it's you, and you'll be asked to make a new PIN." : "A PIN can't be reset without an account on this device."}</p>
            <div class="actions">
              <button class="btn" onClick={() => setForgot(false)}>Back</button>
              {account && <button class="btn primary" onClick={() => void account.signOut()} data-testid="gate-signout">Sign out</button>}
            </div>
          </>
        ) : (
          <>
            <p data-testid="pin-prompt">{making ? (first ? "Type it once more to confirm." : "Make a PIN of 6 or 8 digits. You'll use it each time you open this area on this device.") : "Enter your PIN."}</p>
            <div class={wrong ? "shake" : ""}><PinPad value={pin} onChange={setPinText} label="PIN" testId="pin-input" onEnter={() => { if (pin.length >= 6 && !busy) void submitPin(); }} /></div>
            {note && <p class="small gate-note" role="alert" data-testid="pin-note">{note}</p>}
            <div class="actions">
              <button class="btn" onClick={onCancel}>Cancel</button>
              <button class="btn primary" onClick={() => void submitPin()} disabled={busy || pin.length < 6} data-testid="pin-go">{making && !first ? "Next" : "Open"}</button>
            </div>
            {!making && <p class="small"><button class="linkish" onClick={() => setForgot(true)} data-testid="pin-forgot">Forgot your PIN?</button></p>}
          </>
        )}
      </div>
    </div>
  );
}

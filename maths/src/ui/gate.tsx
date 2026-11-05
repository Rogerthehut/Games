import { useMemo, useState } from "preact/hooks";
import { applyKey, Keypad } from "./answer-input";

let unlockedUntil = 0;
/** Unlocked for ten minutes after a correct answer. Held in memory only. */
export const parentUnlocked = () => Date.now() < unlockedUntil;
const unlock = () => { unlockedUntil = Date.now() + 10 * 60_000; };

/** A grown-up check in front of the parents' area: a sum a young child can't do quickly. */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [round, setRound] = useState(0);
  const sum = useMemo(() => { const a = 13 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4); return { a, b }; }, [round]);
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (Number(text) === sum.a * sum.b) { unlock(); onPass(); }
    else { setWrong(true); setText(""); setRound(round + 1); setTimeout(() => setWrong(false), 500); }
  };

  return (
    <div class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-h">
      <div class="gate">
        <h2 id="gate-h">Parents' area</h2>
        <p>Ask a grown-up to answer this.</p>
        <p class="gate-sum">{sum.a} × {sum.b} =</p>
        <input class={`gate-input ${wrong ? "shake" : ""}`} value={text} inputMode="none" readOnly aria-label="Answer" data-testid="gate-input"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <Keypad mode="digits" onKey={(k) => setText(applyKey(text, k, text.length, text.length).text.replace(/[^\d]/g, ""))} />
        <div class="actions">
          <button class="btn" onClick={onCancel}>Cancel</button>
          <button class="btn primary" onClick={submit} disabled={!text} data-testid="gate-go">Open</button>
        </div>
      </div>
    </div>
  );
}

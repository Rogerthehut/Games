import { useEffect, useRef, useState } from "preact/hooks";
import { ASSISTANT_LIMITS, type AssistantTurn } from "../assistant/types";
import { useAccount } from "./account-context";
import { useApp } from "./context";
import { Maths } from "./maths";

const STARTERS = [
  "How do I explain equivalent fractions?",
  "What is the bus stop method?",
  "How can I help with times tables?",
  "My child hates maths. Where do I start?",
];

/** A short chat for grown-ups: how to explain a topic, what a method means, how to help at home. Needs an account. */
export function ParentAssistant() {
  const account = useAccount();
  const { profile } = useApp();
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [turns, busy]);
  if (!account) return null;

  const send = async (message: string) => {
    const m = message.trim().slice(0, ASSISTANT_LIMITS.message);
    if (!m || busy) return;
    setText(""); setError(""); setBusy(true);
    const history = turns.slice(-ASSISTANT_LIMITS.history);
    setTurns([...turns, { role: "parent", text: m }]);
    try {
      const res = await account.ask(m, history, profile.year);
      setTurns((t) => [...t, { role: "assistant", text: res.reply }]);
      if (res.remainingToday !== undefined) setLeft(res.remainingToday);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === "subscription-required" ? "A subscription is needed to use the assistant." : "The assistant can't be reached right now. The topic notes under Progress are there in the meantime.");
    } finally { setBusy(false); }
  };

  return (
    <section class="card assistant" aria-labelledby="asst" data-testid="assistant">
      <h2 id="asst">AI assistant</h2>
      <p>Ask how to explain a topic, what a method means, or how to help at home. Answers are short and follow the way quarter teaches it.</p>
      <div class="tutor-log" role="log" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} class={`turn ${t.role === "parent" ? "child-turn" : "tutor-turn"}`}><p><Maths text={t.text} /></p></div>
        ))}
        {busy && <div class="turn tutor-turn"><p class="typing" aria-label="The assistant is thinking"><i /><i /><i /></p></div>}
        <div ref={end} />
      </div>
      {turns.length === 0 && <div class="starters">{STARTERS.map((s) => <button key={s} class="chip-btn" onClick={() => send(s)}>{s}</button>)}</div>}
      {error && <div class="banner wrong" role="alert">{error}</div>}
      <form class="tutor-form" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <input value={text} maxLength={ASSISTANT_LIMITS.message} placeholder="Ask a question about maths" autoComplete="off" disabled={busy}
          onInput={(e) => setText((e.target as HTMLInputElement).value)} aria-label="Question for the AI assistant" data-testid="assistant-input" />
        <button class="btn primary" type="submit" disabled={busy || !text.trim()} data-testid="assistant-send">Ask</button>
      </form>
      <p class="small muted">An AI assistant. It can make mistakes, so check important things with your child's teacher. It can't give medical or special-needs advice. Please don't include names or personal details. Questions aren't saved to your account.{left !== null ? ` ${left} left today.` : ""}</p>
    </section>
  );
}

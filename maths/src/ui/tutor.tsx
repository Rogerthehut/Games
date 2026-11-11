import { useEffect, useRef, useState } from "preact/hooks";
import { pruneTutorLog } from "../engine/progress";
import { askTutor, tutorAvailable } from "../tutor/client";
import type { TutorContext, TutorTurn } from "../tutor/types";
import { useApp } from "./context";
import { Maths } from "./maths";
import { Pip } from "./pip";

let probe: Promise<boolean> | null = null;
/** Checked once per visit. Null while checking. */
export function useTutorAvailable(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { (probe ??= tutorAvailable()).then(setOk); }, []);
  return ok;
}

const STARTERS = ["I don't know where to start", "Can you explain it another way?", "Why do we do that step?"];

/** A short chat about the current question. The service decides what the tutor may say; this just shows it. */
export function TutorPanel({ ctx, onClose }: { ctx: TutorContext; onClose: () => void }) {
  const { profile, update } = useApp();
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const reveal = profile.tutor?.reveal ?? "guide";

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [turns, busy]);

  const send = async (message: string) => {
    const m = message.trim().slice(0, 400);
    if (!m || busy) return;
    setText(""); setError(""); setBusy(true);
    const history = turns;
    setTurns([...history, { role: "child", text: m }]);
    try {
      const res = await askTutor({ context: ctx, history, message: m, revealPolicy: reveal });
      setTurns((t) => [...t, { role: "tutor", text: res.reply }]);
      if (res.remainingToday !== undefined) setLeft(res.remainingToday);
      update((p) => ({ ...p, tutorLog: pruneTutorLog([...(p.tutorLog ?? []), { at: Date.now(), skillId: ctx.skillId, question: ctx.question, child: m, tutor: res.reply, flag: res.flag }]) }));
    } catch {
      setError("The tutor can't be reached right now. The Hint button still works, or ask a grown-up.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="tutor" aria-label="AI maths tutor">
      <div class="tutor-head">
        <strong>AI tutor</strong>
        <button class="linkish" onClick={onClose}>Close</button>
      </div>
      <div class="tutor-log" role="log" aria-live="polite">
        {turns.length === 0 && (
          <div class="turn tutor-turn"><span class="avatar"><Pip pose="wave" size={34} /><i class="avatar-plain">T</i></span><p>Hi! What's tricky about this one? I'll help you work it out, but I won't just give you the answer.</p></div>
        )}
        {turns.map((t, i) => (
          <div key={i} class={`turn ${t.role === "child" ? "child-turn" : "tutor-turn"}`}>
            {t.role === "tutor" && <span class="avatar"><Pip pose="think" size={34} /><i class="avatar-plain">T</i></span>}
            <p><Maths text={t.text} /></p>
          </div>
        ))}
        {busy && <div class="turn tutor-turn"><span class="avatar"><i class="avatar-plain">T</i></span><p class="typing" aria-label="The tutor is thinking"><i /><i /><i /></p></div>}
        <div ref={end} />
      </div>
      {turns.length === 0 && (
        <div class="starters">{STARTERS.map((s) => <button key={s} class="chip-btn" onClick={() => send(s)}>{s}</button>)}</div>
      )}
      {error && <div class="banner wrong" role="alert">{error}</div>}
      <form class="tutor-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input id="tutor-input" value={text} maxLength={400} placeholder="Type your question" autoComplete="off" disabled={busy}
          onInput={(e) => setText((e.target as HTMLInputElement).value)} aria-label="Message to the tutor" />
        <button class="btn primary" type="submit" disabled={busy || !text.trim()}>Send</button>
      </form>
      <p class="small muted">I'm an AI tutor and I can make mistakes, so check with a grown-up if something seems wrong. Don't share personal details.{left !== null ? ` ${left} questions left today.` : ""}</p>
    </section>
  );
}

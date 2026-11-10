import { useState } from "preact/hooks";
import { useAccount } from "./account-context";
import { useApp } from "./context";

const REVIEWS_URL = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REVIEWS_URL ?? "").trim();
const CATEGORIES: [string, string][] = [["idea", "An idea"], ["bug", "Something's not working"], ["question", "A question"], ["other", "Something else"]];
const MAX = 2000;

/** Feedback to the quarter team, and, once the family has used it a bit, a link to review quarter on an independent site. */
export function FeedbackSection() {
  const account = useAccount();
  const { profile } = useApp();
  const [category, setCategory] = useState("idea");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [mayReply, setMayReply] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState("");
  if (!account) return null;

  const answered = Object.values(profile.skills ?? {}).reduce((n, s) => n + (s?.seen ?? 0), 0);
  const submit = async (e: Event) => {
    e.preventDefault();
    if (!message.trim() || state === "sending") return;
    setState("sending"); setProblem("");
    try {
      await account.sendFeedback({ category, rating, message: message.trim(), mayReply, context: `${window.innerWidth}x${window.innerHeight}` });
      setState("sent"); setMessage(""); setRating(null);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setProblem(code === "slow-down" ? "Thanks, we have plenty from you today. Please try again tomorrow." : "That didn't send. Please try again in a moment.");
      setState("error");
    }
  };

  return (
    <>
      <section class="card" aria-labelledby="fb" data-testid="feedback">
        <h2 id="fb">Feedback</h2>
        <p>quarter is in public beta, so what you tell us shapes what we build next. We read everything.</p>
        {state === "sent" ? (
          <div class="banner" role="status">Thank you, that's reached us.{" "}
            <button type="button" class="linkish" onClick={() => setState("idle")}>Send another</button></div>
        ) : (
          <form class="feedback-form" onSubmit={submit}>
            <label for="fb-cat">What is it about?</label>
            <select id="fb-cat" value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label for="fb-msg">Your message</label>
            <textarea id="fb-msg" rows={5} maxLength={MAX} value={message} required data-testid="feedback-message"
              onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)} />
            <p class="small muted">Please don't include your child's full name or other personal details. {message.length}/{MAX}</p>
            <fieldset class="fb-rating">
              <legend>How are we doing? (optional, only we see this)</legend>
              <div class="fb-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} class={`fb-star${rating !== null && n <= rating ? " on" : ""}`} aria-pressed={rating === n} aria-label={`${n} out of 5`}
                    onClick={() => setRating(rating === n ? null : n)}>★</button>
                ))}
              </div>
            </fieldset>
            <label class="check-row"><input type="checkbox" checked={mayReply} onChange={(e) => setMayReply((e.target as HTMLInputElement).checked)} /> You may reply to me by email</label>
            {problem && <div class="banner wrong" role="alert">{problem}</div>}
            <button class="btn primary" type="submit" disabled={!message.trim() || state === "sending"} data-testid="feedback-send">{state === "sending" ? "Sending…" : "Send feedback"}</button>
          </form>
        )}
      </section>
      {REVIEWS_URL && answered >= 20 && (
        <section class="card" aria-labelledby="rv">
          <h2 id="rv">Enjoying quarter?</h2>
          <p>If quarter has been useful, an honest review helps other parents find it. Good or bad, we'd value it. It opens on an independent site, and anything you write there is public.</p>
          <a class="btn" href={REVIEWS_URL} target="_blank" rel="noopener noreferrer">Write a review</a>
        </section>
      )}
    </>
  );
}

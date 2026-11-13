import { useState } from "preact/hooks";
import { humanHeaders } from "../humans/turnstile";
import { BackLink, SiteFooter, legalHref } from "./legal";
import { CubeMark, Wordmark } from "./wordmark";

const TOPICS: [string, string][] = [["question", "A question"], ["account", "My account"], ["billing", "Billing"], ["bug", "Something isn't working"], ["other", "Something else"]];
const MAX = 2000;
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/** The "Message us" page: a short form for parents, answered by the team from the ops page. Reached from the footer (`?info=contact`). */
export function ContactScreen() {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [topic, setTopic] = useState("question"), [message, setMessage] = useState(""), [trap, setTrap] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const send = async (e: Event) => {
    e.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json", ...(await humanHeaders()) }, body: JSON.stringify({ name, email, topic, message, website: trap }) });
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) { setState({ kind: "sent" }); return; }
      setState({ kind: "error", message: j.message ?? (res.status === 429 ? "You've sent a few messages already. Please try again later." : "That didn't send. Please try again.") });
    } catch { setState({ kind: "error", message: "No connection. Please check your internet and try again." }); }
  };
  return (
    <div class="site-shell">
      <main class="page legal-page contact-page">
        <a class="legal-home" href="./" aria-label="Back to quarter"><CubeMark /><Wordmark /></a>
        <BackLink />
        <h1>Message us</h1>
        {state.kind === "sent" ? (
          <section class="contact-done" role="status" data-testid="contact-sent">
            <h2>Thanks, we've got your message</h2>
            <p>We'll reply to the email address you gave, usually within a couple of working days.</p>
            <a class="btn" href="./">Back to quarter</a>
          </section>
        ) : (
          <form class="contact-form" onSubmit={send} data-testid="contact-form">
            <p class="muted">Questions, problems or ideas? Send us a message and we'll reply by email.</p>
            <label class="field-label" for="ct-name">Your name <span class="muted">(optional)</span></label>
            <input id="ct-name" type="text" autocomplete="name" maxLength={80} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
            <label class="field-label" for="ct-email">Your email address</label>
            <input id="ct-email" type="email" autocomplete="email" inputMode="email" required maxLength={254} value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} data-testid="contact-email" />
            <label class="field-label" for="ct-topic">What's it about?</label>
            <select id="ct-topic" value={topic} onChange={(e) => setTopic((e.target as HTMLSelectElement).value)}>{TOPICS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <label class="field-label" for="ct-msg">Your message</label>
            <textarea id="ct-msg" class="contact-text" rows={6} required minLength={10} maxLength={MAX} value={message} onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)} data-testid="contact-message" />
            <p class="small muted">{message.length} / {MAX}</p>
            <div class="contact-trap" aria-hidden="true"><label>Leave this empty<input type="text" tabIndex={-1} autocomplete="off" value={trap} onInput={(e) => setTrap((e.target as HTMLInputElement).value)} /></label></div>
            <p class="small muted">We use your email only to reply, and delete messages after 180 days. Please don't include personal details about a child. See the <a class="legal-link" href={legalHref("privacy")}>privacy notice</a>.</p>
            {state.kind === "error" && <p role="alert" class="contact-error" data-testid="contact-error">{state.message}</p>}
            <button class="btn primary" type="submit" disabled={state.kind === "sending"} data-testid="contact-send">{state.kind === "sending" ? "Sending…" : "Send message"}</button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

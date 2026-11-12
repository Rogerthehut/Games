/**
 * Sending email. `Mailer` is the one thing the rest of the server knows about; Resend does the real sending, and a fake one records
 * what would have been sent, for tests and for running without a key.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** A link that unsubscribes in one step. Added as the standard List-Unsubscribe headers. */
  unsubscribeUrl?: string;
}
export interface Mailer {
  /** True if it really sends. */
  readonly live: boolean;
  send(email: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }>;
}

export class ResendMailer implements Mailer {
  readonly live = true;
  constructor(private apiKey: string, private from: string, private replyTo?: string, private fetcher: typeof fetch = fetch) {}
  async send(e: OutgoingEmail) {
    try {
      const res = await this.fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from, to: [e.to], subject: e.subject, text: e.text, html: e.html, ...(this.replyTo ? { reply_to: this.replyTo } : {}),
          ...(e.unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${e.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true as const };
      // the body can echo the address, so it is not logged, but its short error name (for example "validation_error") is safe and says what to fix
      const name = await res.json().then((b: { name?: unknown }) => (typeof b?.name === "string" ? b.name.replace(/[^a-z_]/gi, "").slice(0, 40) : ""), () => "");
      return { ok: false as const, error: `Resend answered ${res.status}${name ? ` (${name})` : ""}` };
    } catch (err) {
      return { ok: false as const, error: (err as Error).name === "TimeoutError" ? "Resend timed out" : "Resend could not be reached" };
    }
  }
}

/** Keeps what it was asked to send. Never sends anything. */
export class FakeMailer implements Mailer {
  readonly live = false;
  sent: OutgoingEmail[] = [];
  failNext = false;
  async send(e: OutgoingEmail) {
    if (this.failNext) { this.failNext = false; return { ok: false as const, error: "fake failure" }; }
    this.sent.push(e);
    return { ok: true as const };
  }
}

/** Resend if RESEND_API_KEY is set; otherwise a fake that sends nothing, so the app runs without email. */
export function mailerFromEnv(env: Record<string, string | undefined> = process.env): Mailer {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return new FakeMailer();
  return new ResendMailer(key, env.MAIL_FROM?.trim() || "quarter <hello@yourquarter.co.uk>", env.MAIL_REPLY_TO?.trim() || "hello@yourquarter.co.uk");
}

import sanitizeHtml from "sanitize-html";
import type { Counters } from "./counters";
import { BODY_MAX, EMAIL, recordInbound } from "./contact";
import type { Db } from "./db";
import { verifySvix } from "./svix";

/**
 * Email sent to hello@yourquarter.co.uk, received by Resend and passed to /api/inbound/resend. Treated as hostile input:
 *  1. the request must carry a valid Svix signature for the raw body (and a fresh timestamp) before anything in it is read;
 *  2. the webhook only says an email arrived, so the content is fetched from Resend's API using our own key, by an id that has to look like an id;
 *  3. only plain text is kept (HTML is stripped to text, never stored or shown as HTML), capped in length, with quoted history cut off;
 *  4. automatic mail (bounces, out-of-office, lists), mail from our own domain, and floods from one sender or in total are dropped, and
 *     nothing is ever sent back automatically, so there are no mail loops and no backscatter;
 *  5. whether the sender really owns the address (SPF, DKIM, DMARC, as computed by the receiving server) is stored and shown, so spoofing is visible.
 * See docs/OPS.md and docs/SECURITY.md.
 */
export const INBOUND_MAX_BODY = 65_536;      // the webhook itself is small metadata
const FETCH_MAX = 4_000_000;                 // the fetched email, text and headers (images are left as references)
const PER_SENDER_DAY = 20, GLOBAL_DAY = 500;
const OWN_DOMAIN = /@(?:[a-z0-9-]+\.)*yourquarter\.co\.uk$/i;
const ROBOT_NAME = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce[s]?|notifications?|alerts?)([+._-].*)?$/i;

export interface InboundDeps { db: Db; counters: Counters; apiKey: string; secret: string; fetcher?: typeof fetch; now?: () => number; log?: (e: Record<string, unknown>) => void }
export interface InboundResult { status: number; body: unknown }
const ok = (body: Record<string, unknown> = {}): InboundResult => ({ status: 200, body: { ok: true, ...body } });

/** Anything a person didn't write: bounces, auto-replies, mailing lists. */
export function isAutomated(headers: Record<string, unknown>, from: string): boolean {
  const h = (k: string) => String(headers[k] ?? "").trim().toLowerCase();
  if (h("auto-submitted") && h("auto-submitted") !== "no") return true;
  if (/^(bulk|junk|list|auto_reply)$/.test(h("precedence"))) return true;
  if (headers["x-auto-response-suppress"] !== undefined || headers["list-id"] !== undefined || headers["list-unsubscribe"] !== undefined) return true;
  if (h("return-path") === "<>") return true;
  return ROBOT_NAME.test(from.split("@")[0]);
}

/** True on the line where quoted history starts: a ">" quote, "On <date>, <name> wrote:", Outlook's "From: / Sent:" block, a forwarded-message rule. */
function startsQuote(lines: string[], i: number): boolean {
  const line = lines[i].trim();
  if (line.startsWith(">")) return true;
  if (/^-{2,}\s*(original message|forwarded message)\s*-{2,}$/i.test(line)) return true;
  if (/^_{10,}$/.test(line)) return true;
  if (/^On /i.test(line) && /^On [^]{3,300}?wrote:/i.test(lines.slice(i, i + 3).join(" ")) && /[\d@<]/.test(line)) return true; // the "wrote:" can wrap onto the next lines
  if (/^(From|Sent):\s.{3,}$/i.test(line) && /(^|\n)\s*(Sent|To|Subject|Date):/i.test(lines.slice(i + 1, i + 4).join("\n"))) return true;
  return false;
}
/** The new part of a reply: everything before the quoted history. Falls back to the whole text if cutting would leave nothing. */
export function newPartOf(text: string): string {
  const t = text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const lines = t.split("\n"), kept: string[] = [];
  for (let i = 0; i < lines.length && !startsQuote(lines, i); i++) kept.push(lines[i]);
  const cut = kept.join("\n").trim();
  return (cut || t.trim()).slice(0, BODY_MAX);
}
const htmlToText = (html: string) => sanitizeHtml(html.replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])[^>]*>/gi, "\n"), { allowedTags: [], allowedAttributes: {} })
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n");

const oneLine = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const verdict = (v: unknown) => (["pass", "fail", "gray", "unknown", "processing_failed"].includes(String(v)) ? String(v) : "unknown");

export async function handleInbound(raw: string, headers: { id?: string; timestamp?: string; signature?: string }, d: InboundDeps): Promise<InboundResult> {
  const now = d.now ?? Date.now;
  if (raw.length > INBOUND_MAX_BODY || !verifySvix(d.secret, headers, raw, now())) return { status: 400, body: { error: "invalid" } };
  let event: { type?: unknown; data?: Record<string, unknown> };
  try { event = JSON.parse(raw); } catch { return { status: 400, body: { error: "invalid" } }; }
  if (event.type !== "email.received" || !event.data || typeof event.data !== "object") return ok({ ignored: "type" });
  const emailId = String(event.data.email_id ?? "");
  const from = String(event.data.from ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(emailId) || from.length > 254 || !EMAIL.test(from)) return ok({ ignored: "shape" });
  if (OWN_DOMAIN.test(from)) return ok({ ignored: "own-domain" });
  if ((await d.counters.hit("in:day", 86_400_000, now())) > GLOBAL_DAY || (await d.counters.hit(`ins:${from}`, 86_400_000, now())) > PER_SENDER_DAY) return ok({ ignored: "limit" });

  // the content comes from Resend, by id, with our key. Never from the webhook body.
  let email: Record<string, unknown>;
  try {
    const res = await (d.fetcher ?? fetch)(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, { headers: { Authorization: `Bearer ${d.apiKey}` }, signal: AbortSignal.timeout(15_000) });
    if (res.status === 404) return ok({ ignored: "gone" });
    if (!res.ok) return { status: 502, body: { error: "fetch-failed" } }; // Resend retries
    const text = await res.text();
    if (text.length > FETCH_MAX) return ok({ ignored: "too-large" });
    email = JSON.parse(text);
  } catch { return { status: 502, body: { error: "fetch-failed" } }; }

  const hdrs = Object.fromEntries(Object.entries((email.headers ?? {}) as Record<string, unknown>).map(([k, v]) => [k.toLowerCase(), v]));
  if (isAutomated(hdrs, from)) return ok({ ignored: "automatic" });
  const plain = typeof email.text === "string" && email.text.trim() ? email.text : typeof email.html === "string" ? htmlToText(email.html) : "";
  const body = newPartOf(plain);
  if (!body) return ok({ ignored: "empty" });
  const a = (email.authentication ?? {}) as Record<string, unknown>;
  const auth = `spf=${verdict(a.spf)} dkim=${verdict(a.dkim)} dmarc=${verdict(a.dmarc)}`;
  const messageId = /^<[^<>\s\r\n]{3,300}>$/.test(String(email.message_id ?? "")) ? String(email.message_id) : null;
  const display = /^\s*"?([^"<]{1,80}?)"?\s*<[^>]+>\s*$/.exec(String(hdrs.from ?? ""));
  const saved = await recordInbound(d.db, { emailId, from, name: display ? oneLine(display[1], 80) || null : null, subject: oneLine(email.subject ?? event.data.subject, 200) || null, text: body, messageId, auth }, new Date(now()));
  d.log?.({ inbound: saved ? "saved" : "duplicate" }); // never the address or the text
  return ok({ saved });
}

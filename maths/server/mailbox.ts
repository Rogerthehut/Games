import { and, asc, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import { addContactReply, startConversation, EMAIL } from "./contact";
import type { Mailer } from "./mail";
import { nextTicket, refOf, withRef } from "./ticket";

/**
 * The ops mailbox, as folders over what is already stored:
 *   Inbox     email sent to hello@ (and replies to emails we started)       Messages  the Message us form
 *   Feedback  feedback from signed-in parents                               Sent      every email we have sent
 *   Drafts    unsent writing, saved                                         Outbox    emails that couldn't be sent yet, retried for a while
 * A conversation stays one thread whichever folder lists it. See docs/OPS.md.
 */
export type Folder = "inbox" | "messages" | "feedback" | "drafts" | "sent" | "outbox";
export const FOLDERS: Folder[] = ["inbox", "messages", "feedback", "drafts", "sent", "outbox"];
export interface MailItem {
  kind: "contact" | "feedback" | "draft" | "outbox"; id: string; ref: string | null; who: string; subject: string; preview: string; at: string; unread: boolean;
  direction: "in" | "out" | null; draftKind?: string; conversationId?: string | null; status?: string; error?: string | null; attempts?: number;
}
const snip = (t: string, n = 140) => t.replace(/\s+/g, " ").trim().slice(0, n);
const TOPICS: Record<string, string> = { question: "A question", account: "My account", billing: "Billing", bug: "Something isn't working", other: "Message" };

async function contactItems(db: Db): Promise<{ inbox: MailItem[]; messages: MailItem[]; sent: MailItem[] }> {
  const rows = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.updatedAt)).limit(400);
  const ids = rows.map((r) => r.id);
  const replies = ids.length ? await db.select().from(schema.contactReplies).where(inArray(schema.contactReplies.contactId, ids)).orderBy(asc(schema.contactReplies.at)) : [];
  const inbox: MailItem[] = [], messages: MailItem[] = [], sent: MailItem[] = [];
  for (const r of rows) {
    const thread = replies.filter((x) => x.contactId === r.id), last = thread[thread.length - 1];
    const lastText = last ? last.message : r.message, lastIn = last ? last.direction === "in" : r.source !== "sent";
    const item: MailItem = { kind: "contact", id: r.id, ref: refOf("contact", r.ticket), who: r.name || r.email, subject: r.subject || TOPICS[r.topic] || "Message", preview: snip(lastText), at: r.updatedAt.toISOString(), unread: r.unread, direction: lastIn ? "in" : "out" };
    if (r.source === "form") messages.push(item);
    else if (r.source === "email" || thread.some((x) => x.direction === "in")) inbox.push(item);
    // everything we have sent: our first email, and each of our replies
    if (r.source === "sent") sent.push({ ...item, who: `To ${r.email}`, preview: snip(r.message), at: r.createdAt.toISOString(), unread: false, direction: "out" });
    for (const x of thread) if (x.direction === "out") sent.push({ kind: "contact", id: r.id, ref: refOf("contact", r.ticket), who: `To ${r.email}`, subject: r.subject || TOPICS[r.topic] || "Message", preview: snip(x.message), at: x.at.toISOString(), unread: false, direction: "out" });
  }
  return { inbox, messages, sent };
}

async function feedbackItems(db: Db): Promise<{ items: MailItem[]; sent: MailItem[] }> {
  const rows = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt)).limit(300);
  const ids = rows.map((r) => r.id);
  const replies = ids.length ? await db.select().from(schema.feedbackReplies).where(inArray(schema.feedbackReplies.feedbackId, ids)).orderBy(asc(schema.feedbackReplies.at)) : [];
  const items = rows.map((r): MailItem => ({ kind: "feedback", id: r.id, ref: refOf("feedback", r.ticket), who: `Signed-in parent${r.mayReply ? " (may reply)" : ""}`, subject: `${r.category}${r.rating ? ` · ${r.rating}/5` : ""}${r.context ? ` · ${r.context}` : ""}`, preview: snip(r.message), at: r.createdAt.toISOString(), unread: r.unread, direction: "in" }));
  const sent = replies.map((x): MailItem => { const f = rows.find((r) => r.id === x.feedbackId)!; return { kind: "feedback", id: x.feedbackId, ref: refOf("feedback", f?.ticket), who: "To a signed-in parent", subject: `Re: your feedback on quarter`, preview: snip(x.message), at: x.at.toISOString(), unread: false, direction: "out" }; });
  return { items, sent };
}

export async function listDrafts(db: Db): Promise<MailItem[]> {
  const rows = await db.select({ d: schema.opsDrafts, c: schema.contactMessages.email, t: schema.contactMessages.ticket }).from(schema.opsDrafts).leftJoin(schema.contactMessages, eq(schema.contactMessages.id, schema.opsDrafts.conversationId)).orderBy(desc(schema.opsDrafts.updatedAt)).limit(100);
  return rows.map(({ d, c, t }): MailItem => ({ kind: "draft", id: d.id, ref: refOf("contact", t), who: d.kind === "reply" ? `Reply to ${c ?? "a conversation"}` : d.toEmail ? `To ${d.toEmail}` : "New email", subject: d.subject || "(no subject)", preview: snip(d.body), at: d.updatedAt.toISOString(), unread: false, direction: null, draftKind: d.kind, conversationId: d.conversationId }));
}
export async function listOutbox(db: Db): Promise<MailItem[]> {
  const rows = await db.select().from(schema.opsOutbox).orderBy(desc(schema.opsOutbox.createdAt)).limit(100);
  return rows.map((r): MailItem => ({ kind: "outbox", id: r.id, ref: refOf("contact", r.ticket), who: `To ${r.toEmail}`, subject: r.subject, preview: snip(r.body), at: r.createdAt.toISOString(), unread: false, direction: "out", status: r.status, error: r.lastError, attempts: r.attempts, conversationId: r.conversationId }));
}

export async function listFolder(db: Db, folder: Folder, o: { unread?: boolean } = {}): Promise<MailItem[]> {
  let items: MailItem[];
  if (folder === "inbox") items = (await contactItems(db)).inbox;
  else if (folder === "messages") items = (await contactItems(db)).messages;
  else if (folder === "feedback") items = (await feedbackItems(db)).items;
  else if (folder === "drafts") items = await listDrafts(db);
  else if (folder === "outbox") items = await listOutbox(db);
  else items = [...(await contactItems(db)).sent, ...(await feedbackItems(db)).sent].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200);
  return o.unread ? items.filter((i) => i.unread) : items;
}

export type Counts = Record<Folder, { total: number; unread: number }>;
export async function folderCounts(db: Db): Promise<Counts> {
  const c = await contactItems(db), f = await feedbackItems(db), drafts = await listDrafts(db), outbox = await listOutbox(db);
  const n = (a: MailItem[]) => ({ total: a.length, unread: a.filter((i) => i.unread).length });
  return { inbox: n(c.inbox), messages: n(c.messages), feedback: n(f.items), drafts: n(drafts), sent: { total: c.sent.length + f.sent.length, unread: 0 }, outbox: { total: outbox.length, unread: outbox.filter((o) => o.status === "failed").length } };
}

/** Opening a conversation (or a piece of feedback) marks it read. */
export async function markRead(db: Db, kind: "contact" | "feedback", id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  if (kind === "contact") await db.update(schema.contactMessages).set({ unread: false }).where(eq(schema.contactMessages.id, id));
  else await db.update(schema.feedback).set({ unread: false }).where(eq(schema.feedback.id, id));
}
export async function markUnread(db: Db, kind: "contact" | "feedback", id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  if (kind === "contact") await db.update(schema.contactMessages).set({ unread: true }).where(eq(schema.contactMessages.id, id));
  else await db.update(schema.feedback).set({ unread: true }).where(eq(schema.feedback.id, id));
}

// ---------------------------------------------------------------------------------------------- drafts
const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
export type DraftOutcome = { ok: true; id: string } | { ok: false; error: string };
export async function saveDraft(db: Db, actor: string, i: { id?: unknown; kind?: unknown; conversationId?: unknown; to?: unknown; subject?: unknown; message?: unknown; signatureId?: unknown }): Promise<DraftOutcome> {
  const kind = i.kind === "reply" ? "reply" : i.kind === "new" ? "new" : null;
  if (!kind) return { ok: false, error: "Not a draft of a reply or a new email." };
  const body = typeof i.message === "string" ? i.message.slice(0, 6000) : "";
  const subject = typeof i.subject === "string" ? i.subject.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 150) : "";
  const to = typeof i.to === "string" ? i.to.trim().toLowerCase().slice(0, 254) : "";
  if (to && !EMAIL.test(to)) return { ok: false, error: "That doesn't look like one email address." };
  if (kind === "reply" && !isId(i.conversationId)) return { ok: false, error: "A reply draft needs its conversation." };
  if (!body.trim() && !subject && !to) return { ok: false, error: "There's nothing to save yet." };
  const values = { kind, conversationId: kind === "reply" ? (i.conversationId as string) : null, toEmail: to || null, subject: subject || null, body, signatureId: isId(i.signatureId) ? i.signatureId : null, updatedAt: new Date(), actor: actor.slice(0, 80) };
  if (i.id !== undefined && i.id !== null) {
    if (!isId(i.id)) return { ok: false, error: "No such draft." };
    const out = await db.update(schema.opsDrafts).set(values).where(eq(schema.opsDrafts.id, i.id)).returning({ id: schema.opsDrafts.id });
    return out.length ? { ok: true, id: out[0].id } : { ok: false, error: "No such draft." };
  }
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.opsDrafts);
  if (n.n >= 50) return { ok: false, error: "You have 50 drafts. Delete some first." };
  try { const [row] = await db.insert(schema.opsDrafts).values(values).returning({ id: schema.opsDrafts.id }); return { ok: true, id: row.id }; } catch { return { ok: false, error: "That conversation no longer exists." }; }
}
export async function getDraft(db: Db, id: unknown) {
  if (!isId(id)) return null;
  const [d] = await db.select().from(schema.opsDrafts).where(eq(schema.opsDrafts.id, id));
  return d ? { id: d.id, kind: d.kind, conversationId: d.conversationId, to: d.toEmail ?? "", subject: d.subject ?? "", message: d.body, signatureId: d.signatureId } : null;
}
export async function deleteDraft(db: Db, id: unknown): Promise<boolean> {
  if (!isId(id)) return false;
  return (await db.delete(schema.opsDrafts).where(eq(schema.opsDrafts.id, id)).returning({ id: schema.opsDrafts.id })).length > 0;
}

// ---------------------------------------------------------------------------------------------- sending, with an outbox
export interface ToSend { kind: "reply" | "new"; conversationId: string | null; to: string; subject: string; body: string; html: string; text: string; inReplyTo: string | null; ticket: number | null; actor: string }
export type SendOutcome = { ok: true; conversationId: string } | { ok: false; queued: true; id: string; error: string };
const RETRY_MINUTES = [5, 15, 60, 240], MAX_ATTEMPTS = 5;
const nextDelay = (attempts: number) => RETRY_MINUTES[Math.min(attempts - 1, RETRY_MINUTES.length - 1)] * 60_000;

/** One go at sending an outbox row. Claims it first (so a retry timer and a person clicking Retry can't both send), and on success records the email in its conversation. */
async function attempt(db: Db, mailer: Mailer, id: string, now = new Date()): Promise<SendOutcome | null> {
  const [claimed] = await db.update(schema.opsOutbox).set({ status: "sending", nextAttempt: new Date(now.getTime() + 120_000) })
    .where(and(eq(schema.opsOutbox.id, id), or(eq(schema.opsOutbox.status, "queued"), eq(schema.opsOutbox.status, "failed"), and(eq(schema.opsOutbox.status, "sending"), lte(schema.opsOutbox.nextAttempt, now))))).returning();
  if (!claimed) return null;
  const sent = await mailer.send({ to: claimed.toEmail, subject: claimed.subject, text: claimed.textVersion, html: claimed.html, ...(claimed.inReplyTo ? { headers: { "In-Reply-To": claimed.inReplyTo, References: claimed.inReplyTo } } : {}) });
  if (!sent.ok) {
    const attempts = claimed.attempts + 1;
    await db.update(schema.opsOutbox).set({ status: "failed", attempts, lastError: sent.error.slice(0, 200), nextAttempt: new Date(now.getTime() + nextDelay(attempts)) }).where(eq(schema.opsOutbox.id, id));
    return { ok: false, queued: true, id, error: sent.error };
  }
  let conversationId = claimed.conversationId;
  if (claimed.kind === "new") conversationId = await startConversation(db, { to: claimed.toEmail, subject: claimed.subject.replace(/ \[Q-\d+\]$/, ""), text: claimed.body, ticket: claimed.ticket ?? undefined });
  else if (conversationId) await addContactReply(db, conversationId, claimed.actor, claimed.body);
  await db.delete(schema.opsOutbox).where(eq(schema.opsOutbox.id, id));
  return { ok: true, conversationId: conversationId! };
}

/** Sends now if it can; otherwise the email waits in the Outbox and is retried. The subject gets the conversation's reference ([Q-1042]) on the end. */
export async function sendOrQueue(db: Db, mailer: Mailer, m: ToSend): Promise<SendOutcome> {
  const ticket = m.ticket ?? (m.kind === "new" ? await nextTicket(db, "contact") : null);
  const subject = withRef(m.subject, refOf("contact", ticket));
  const [row] = await db.insert(schema.opsOutbox).values({ kind: m.kind, conversationId: m.conversationId, toEmail: m.to, subject, body: m.body, html: m.html, textVersion: m.text, inReplyTo: m.inReplyTo, ticket, actor: m.actor.slice(0, 80) }).returning({ id: schema.opsOutbox.id });
  return (await attempt(db, mailer, row.id)) ?? { ok: false, queued: true, id: row.id, error: "busy" };
}
/** A person pressing Retry: tries again now, however many times it has already failed. */
export async function retryOne(db: Db, mailer: Mailer, id: string): Promise<SendOutcome | null> {
  if (!isId(id)) return null;
  await db.update(schema.opsOutbox).set({ attempts: 0 }).where(and(eq(schema.opsOutbox.id, id), eq(schema.opsOutbox.status, "failed")));
  return attempt(db, mailer, id);
}
export async function discardOutbox(db: Db, id: unknown): Promise<boolean> {
  if (!isId(id)) return false;
  return (await db.delete(schema.opsOutbox).where(and(eq(schema.opsOutbox.id, id), or(eq(schema.opsOutbox.status, "failed"), eq(schema.opsOutbox.status, "queued")))).returning({ id: schema.opsOutbox.id })).length > 0;
}
/** The timer: emails whose next try is due, up to five failed attempts each. */
export async function retryDue(db: Db, mailer: Mailer, now = new Date()): Promise<number> {
  const due = await db.select({ id: schema.opsOutbox.id }).from(schema.opsOutbox)
    .where(and(lte(schema.opsOutbox.nextAttempt, now), lte(schema.opsOutbox.attempts, MAX_ATTEMPTS - 1), or(eq(schema.opsOutbox.status, "queued"), eq(schema.opsOutbox.status, "failed"), eq(schema.opsOutbox.status, "sending")))).limit(10);
  let done = 0;
  for (const { id } of due) { const out = await attempt(db, mailer, id, now); if (out?.ok) done++; }
  return done;
}

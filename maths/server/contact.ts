import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import type { Counters } from "./counters";
import { nextTicket, ticketInSubject } from "./ticket";

/**
 * Messages from parents: the public "Message us" form, and email sent to hello@ (which arrives through Resend, see inbound.ts). Anyone can send
 * one (no account), so it is built to be hard to abuse: a human check, a hidden field only bots fill in, limits per address and per email address,
 * short lengths, and nothing is ever emailed to the address typed in until a person on the team chooses to reply from the ops page.
 * A conversation is one `contact_messages` row (the first message) plus `contact_replies` rows, each from the team ('out') or the sender ('in').
 * Everything is deleted 180 days after the last activity. See docs/OPS.md and docs/SECURITY.md.
 */
export const CONTACT_TOPICS = ["question", "account", "billing", "bug", "other"] as const;
export const CONTACT_MIN = 10, CONTACT_MAX = 2000, KEEP_DAYS = 180, BODY_MAX = 6000;
export const EMAIL = /^[^\s@<>"',;:()[\]\\]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export interface CleanContact { name: string | null; email: string; topic: string; message: string }
export type ContactCheck = { ok: true; value: CleanContact } | { ok: false; error: "invalid" | "bot"; message: string };

/** Checks what the browser sent. `website` is a field people never see: if it has anything in it, a script filled it in. */
export function cleanContact(b: unknown): ContactCheck {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  if (typeof o.website === "string" && o.website.trim()) return { ok: false, error: "bot", message: "Thanks." }; // looks like success to a bot
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: "invalid", message: "Please enter an email address we can reply to." };
  const message = typeof o.message === "string" ? o.message.replace(/\r\n/g, "\n").trim() : "";
  if (message.length < CONTACT_MIN) return { ok: false, error: "invalid", message: "Please write a little more so we can help." };
  if (message.length > CONTACT_MAX) return { ok: false, error: "invalid", message: `Please keep it under ${CONTACT_MAX} characters.` };
  const topic = typeof o.topic === "string" && (CONTACT_TOPICS as readonly string[]).includes(o.topic) ? o.topic : "other";
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().replace(/\s+/g, " ").slice(0, 80) : null;
  return { ok: true, value: { name, email, topic, message } };
}

/** Whether this address and this email may send another message now. Counts live in the shared counters, keyed by a hash so nothing is stored in the clear. */
export async function contactAllowed(counters: Counters, ip: string, email: string, now = Date.now()): Promise<boolean> {
  if ((await counters.hit(`c:${ip}`, 3_600_000, now)) > 5) return false;
  if ((await counters.hit(`cd:${ip}`, 86_400_000, now)) > 15) return false;
  return (await counters.hit(`ce:${email}`, 86_400_000, now)) <= 3;
}

export async function saveContact(db: Db, c: CleanContact): Promise<string> {
  const [row] = await db.insert(schema.contactMessages).values({ ...c, source: "form", ticket: await nextTicket(db, "contact"), unread: true }).returning({ id: schema.contactMessages.id });
  return row.id;
}

/** Deletes conversations (and their replies) with no activity for KEEP_DAYS, and the old "already handled" markers. */
export async function purgeContact(db: Db, now = new Date()): Promise<void> {
  await db.delete(schema.contactMessages).where(lt(schema.contactMessages.updatedAt, new Date(now.getTime() - KEEP_DAYS * 86_400_000)));
  await db.delete(schema.inboundSeen).where(lt(schema.inboundSeen.at, new Date(now.getTime() - 30 * 86_400_000)));
}

export interface ContactEntry { at: string; actor: string; direction: "in" | "out"; message: string; auth: string | null; /** who wrote it, when it came by email */ fromEmail: string | null }
export interface ContactRow {
  id: string; at: string; name: string | null; email: string; topic: string; source: string; subject: string | null; auth: string | null;
  ticket: number | null; unread: boolean;
  message: string; replies: ContactEntry[];
  /** True when nobody on the team has answered yet, or the sender has written again since the last answer. */
  waiting: boolean;
}
const entry = (r: typeof schema.contactReplies.$inferSelect): ContactEntry => ({ at: r.at.toISOString(), actor: r.actor, direction: r.direction === "in" ? "in" : "out", message: r.message, auth: r.auth, fromEmail: r.fromEmail });

export async function contactList(db: Db, o: { waiting?: boolean; limit?: number } = {}): Promise<ContactRow[]> {
  const rows = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.updatedAt)).limit(Math.min(o.limit ?? 100, 300));
  const ids = rows.map((r) => r.id);
  const replies = ids.length ? await db.select().from(schema.contactReplies).where(inArray(schema.contactReplies.contactId, ids)).orderBy(schema.contactReplies.at) : [];
  const out = rows.map((r): ContactRow => {
    const thread = replies.filter((x) => x.contactId === r.id).map(entry);
    return { id: r.id, at: r.createdAt.toISOString(), name: r.name, email: r.email, topic: r.topic, source: r.source, subject: r.subject, auth: r.auth, ticket: r.ticket, unread: r.unread, message: r.message, replies: thread, waiting: thread.length ? thread[thread.length - 1].direction === "in" : r.source !== "sent" };
  });
  return o.waiting ? out.filter((r) => r.waiting) : out;
}

/** What a reply needs to know about a conversation: who to write to, what to call it, and the sender's last message (to quote and thread under). */
export interface ContactForReply { id: string; ticket: number | null; email: string; subject: string | null; lastMessage: string; lastMessageId: string | null }
export async function contactForReply(db: Db, id: string): Promise<ContactForReply | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id));
  if (!r) return null;
  const inbound = await db.select().from(schema.contactReplies).where(and(eq(schema.contactReplies.contactId, id), eq(schema.contactReplies.direction, "in"))).orderBy(desc(schema.contactReplies.at)).limit(1);
  const last = inbound[0];
  return { id: r.id, ticket: r.ticket, email: r.email, subject: r.subject, lastMessage: last ? last.message : r.message, lastMessageId: last ? last.messageId : r.messageId };
}

/**
 * An email the team writes first, from the ops page, to someone who hasn't been in touch. It is kept as a conversation like any other (source "sent"),
 * so if they reply, their reply joins it. Counts as answered until they write back.
 */
export async function startConversation(db: Db, m: { to: string; subject: string; text: string; ticket?: number }): Promise<string> {
  const [row] = await db.insert(schema.contactMessages).values({ name: null, email: m.to, topic: "other", message: m.text, source: "sent", subject: m.subject, ticket: m.ticket ?? (await nextTicket(db, "contact")), unread: false }).returning({ id: schema.contactMessages.id });
  return row.id;
}

export async function addContactReply(db: Db, contactId: string, actor: string, message: string): Promise<void> {
  await db.insert(schema.contactReplies).values({ contactId, actor: actor.slice(0, 80), message, direction: "out" });
  await db.update(schema.contactMessages).set({ updatedAt: new Date() }).where(eq(schema.contactMessages.id, contactId));
}
export async function deleteContact(db: Db, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  return (await db.delete(schema.contactMessages).where(eq(schema.contactMessages.id, id)).returning({ id: schema.contactMessages.id })).length > 0;
}

/**
 * An email that arrived at hello@. It joins the most recent conversation with the same sender (so a reply to one of ours lands under it) or starts a
 * new one. `emailId` is Resend's id for the email: if it has been seen already (a webhook delivered twice) nothing happens and false is returned.
 * Done in one transaction so two deliveries at once can't both be saved.
 */
export interface InboundEmail { emailId: string; from: string; name: string | null; subject: string | null; text: string; messageId: string | null; auth: string | null }
export async function recordInbound(db: Db, m: InboundEmail, now = new Date()): Promise<boolean> {
  return db.transaction(async (tx) => {
    const seen = await tx.insert(schema.inboundSeen).values({ emailId: m.emailId }).onConflictDoNothing().returning({ id: schema.inboundSeen.emailId });
    if (!seen.length) return false;
    const since = new Date(now.getTime() - KEEP_DAYS * 86_400_000);
    // a reply to one of ours carries its reference in the subject, which finds the conversation even if it was sent from another address; failing that, the same sender
    const ref = ticketInSubject(m.subject);
    let thread: { id: string } | undefined;
    if (ref) [thread] = await tx.select({ id: schema.contactMessages.id }).from(schema.contactMessages).where(and(eq(schema.contactMessages.ticket, ref), sql`${schema.contactMessages.updatedAt} > ${since}`)).limit(1);
    if (!thread) [thread] = await tx.select({ id: schema.contactMessages.id }).from(schema.contactMessages)
      .where(and(eq(schema.contactMessages.email, m.from), sql`${schema.contactMessages.updatedAt} > ${since}`)).orderBy(desc(schema.contactMessages.updatedAt)).limit(1);
    if (thread) {
      await tx.insert(schema.contactReplies).values({ contactId: thread.id, actor: "sender", message: m.text, direction: "in", messageId: m.messageId, auth: m.auth, fromEmail: m.from });
      await tx.update(schema.contactMessages).set({ updatedAt: now, unread: true }).where(eq(schema.contactMessages.id, thread.id));
    } else {
      await tx.insert(schema.contactMessages).values({ name: m.name, email: m.from, topic: "other", message: m.text, source: "email", subject: m.subject, messageId: m.messageId, auth: m.auth, ticket: await nextTicket(tx, "contact"), unread: true });
    }
    return true;
  });
}

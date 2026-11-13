import { desc, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";
import type { Counters } from "./counters";

/**
 * The public "Message us" form. Anyone can send one (no account), so it is built to be hard to abuse: a human check, a hidden field only bots
 * fill in, limits per address and per email address, short lengths, and nothing is ever emailed to the address typed in until a person on the
 * team chooses to reply from the ops page. Messages are deleted after 180 days. See docs/OPS.md and docs/SECURITY.md.
 */
export const CONTACT_TOPICS = ["question", "account", "billing", "bug", "other"] as const;
export const CONTACT_MIN = 10, CONTACT_MAX = 2000, KEEP_DAYS = 180;
const EMAIL = /^[^\s@<>"',;:()[\]\\]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

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
  const [row] = await db.insert(schema.contactMessages).values(c).returning({ id: schema.contactMessages.id });
  return row.id;
}

/** Deletes messages (and their replies) older than KEEP_DAYS. */
export async function purgeContact(db: Db, now = new Date()): Promise<void> {
  await db.delete(schema.contactMessages).where(lt(schema.contactMessages.createdAt, new Date(now.getTime() - KEEP_DAYS * 86_400_000)));
}

export interface ContactRow { id: string; at: string; name: string | null; email: string; topic: string; message: string; replies: { at: string; actor: string; message: string }[] }
export async function contactList(db: Db, o: { unreplied?: boolean; limit?: number } = {}): Promise<ContactRow[]> {
  const rows = await db.select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(Math.min(o.limit ?? 100, 300));
  const ids = rows.map((r) => r.id);
  const replies = ids.length ? await db.select().from(schema.contactReplies).where(inArray(schema.contactReplies.contactId, ids)).orderBy(schema.contactReplies.at) : [];
  const out = rows.map((r) => ({ id: r.id, at: r.createdAt.toISOString(), name: r.name, email: r.email, topic: r.topic, message: r.message, replies: replies.filter((x) => x.contactId === r.id).map((x) => ({ at: x.at.toISOString(), actor: x.actor, message: x.message })) }));
  return o.unreplied ? out.filter((r) => !r.replies.length) : out;
}
export async function contactById(db: Db, id: string): Promise<ContactRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select().from(schema.contactMessages).where(eq(schema.contactMessages.id, id));
  return r ? { id: r.id, at: r.createdAt.toISOString(), name: r.name, email: r.email, topic: r.topic, message: r.message, replies: [] } : null;
}
export async function addContactReply(db: Db, contactId: string, actor: string, message: string): Promise<void> {
  await db.insert(schema.contactReplies).values({ contactId, actor: actor.slice(0, 80), message });
}
export async function deleteContact(db: Db, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  return (await db.delete(schema.contactMessages).where(eq(schema.contactMessages.id, id)).returning({ id: schema.contactMessages.id })).length > 0;
}

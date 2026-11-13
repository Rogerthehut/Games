import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { schema, type Db } from "./db";

/**
 * Reference numbers for the ops mailbox: Q-1001, Q-1002... for conversations (the Message us form, email to hello@, and emails we start) and
 * F-1001... for app feedback. Handed out by the app in one atomic statement, so two at once can't get the same number. They go in the subject of
 * our replies ("Re: your message [Q-1042]"), so a reply from a different address can still find its conversation.
 */
type Kind = "contact" | "feedback";
export async function nextTicket(db: Pick<Db, "insert">, kind: Kind): Promise<number> {
  const [row] = await db.insert(schema.ticketCounter)
    .values({ name: kind, n: 1001 })
    .onConflictDoUpdate({ target: schema.ticketCounter.name, set: { n: sql`${schema.ticketCounter.n} + 1` } })
    .returning({ n: schema.ticketCounter.n });
  return row.n as number;
}
export const refOf = (kind: Kind, ticket: number | null | undefined) => (ticket ? `${kind === "contact" ? "Q" : "F"}-${ticket}` : null);
/**
 * The tag in the subject of our emails, "[Q-1042-3fa9c1d2]": the number plus eight characters that only we can make (a keyed hash of the number,
 * using the ops secret). A reply carries it back, which finds the conversation even from another address. Because the number alone is easy to
 * guess, a tag that doesn't verify is ignored, so nobody can write into a conversation by guessing its number.
 */
let key: Buffer = Buffer.alloc(0);
/** The tags are signed with a key derived from the ops secret for this one purpose, so the secret that signs ops sessions is never used for anything else. */
export const configureTickets = (secret: string) => { key = createHmac("sha256", secret).update("quarter ticket tags v1").digest(); };
const sign = (n: number) => createHmac("sha256", key).update(`quarter-ticket:${n}`).digest("hex").slice(0, 8);
export const ticketTag = (ticket: number) => `[Q-${ticket}-${sign(ticket)}]`;
/** The conversation number from a genuine tag in a subject line (the first one that verifies), or null. */
export const ticketInSubject = (subject: string | null | undefined): number | null => {
  for (const m of String(subject ?? "").matchAll(/\[Q-(\d{4,9})-([0-9a-f]{8})\]/g)) {
    const want = Buffer.from(sign(Number(m[1]))), given = Buffer.from(m[2]);
    if (want.length === given.length && timingSafeEqual(want, given)) return Number(m[1]);
  }
  return null;
};
/** A subject with anything that looks like a tag taken out (what people write in is never trusted as one). */
export const stripTags = (subject: string) => subject.replace(/\s*\[Q-[^\]]{0,40}\]/g, "").replace(/\s+/g, " ").trim();
/** A subject with its genuine tag on the end, once. */
export const withRef = (subject: string, ticket: number | null) => (ticket ? `${stripTags(subject)} ${ticketTag(ticket)}` : subject);

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
/** The conversation number written in a subject line, like "[Q-1042]". */
export const ticketInSubject = (subject: string | null | undefined): number | null => {
  const m = /\[Q-(\d{4,9})\]/.exec(subject ?? "");
  return m ? Number(m[1]) : null;
};
/** A subject with its reference on the end, once. */
export const withRef = (subject: string, ref: string | null) => (ref && !subject.includes(`[${ref}]`) ? `${subject} [${ref}]` : subject);

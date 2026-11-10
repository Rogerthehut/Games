/**
 * Prints the feedback parents have sent, newest first.
 *   DATABASE_URL=... npx tsx scripts/read-feedback.ts
 * Add CLERK_SECRET_KEY to also look up the email address of anyone who ticked "you may reply" (the app does not store emails).
 */
import { desc, eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { connect, schema } from "../server/db";

const db = await connect();
const rows = await db.select({ f: schema.feedback, clerk: schema.parents.clerkUserId }).from(schema.feedback)
  .innerJoin(schema.parents, eq(schema.parents.id, schema.feedback.parentId)).orderBy(desc(schema.feedback.createdAt)).limit(200);
const key = process.env.CLERK_SECRET_KEY;
const clerk = key ? createClerkClient({ secretKey: key }) : null;
if (!rows.length) console.log("No feedback yet.");
for (const { f, clerk: uid } of rows) {
  let reply = f.mayReply ? "may reply" : "do not reply";
  if (f.mayReply && clerk) { try { reply = `may reply: ${(await clerk.users.getUser(uid)).primaryEmailAddress?.emailAddress ?? "no email"}`; } catch { reply = "may reply (email lookup failed)"; } }
  console.log(`\n${f.createdAt.toISOString()} | ${f.category} | ${f.rating ? `${f.rating}/5` : "no rating"} | ${f.context ?? ""} | ${reply}\n${f.message}`);
}
process.exit(0);

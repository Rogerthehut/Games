/**
 * Read-only tools for the team. Run against the real database:
 *   DATABASE_URL=... npm run ops -- stats
 *   DATABASE_URL=... CLERK_SECRET_KEY=... npm run ops -- account parent@example.com
 *   DATABASE_URL=... CLERK_SECRET_KEY=... npm run ops -- feedback --days 14 --replyable
 *   DATABASE_URL=... npm run ops -- audit
 * Looking up an account or an email address is written to the audit log (who looked, what for, which internal id). Set OPS_ACTOR to your name.
 * Nothing here shows a child's answers, progress or tutor chats, and nothing changes an account. See docs/OPS.md.
 */
import { userInfo } from "node:os";
import { createClerkClient } from "@clerk/backend";
import { connect } from "../server/db";
import { accountByClerkId, audit, auditLog, feedbackList, formatAccount, formatStats, stats } from "../server/ops";

const [command, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i === -1 ? undefined : rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[i + 1] : "true"; };
const actor = process.env.OPS_ACTOR || userInfo().username;
const clerk = () => { const key = process.env.CLERK_SECRET_KEY; if (!key) throw new Error("CLERK_SECRET_KEY is needed to look up email addresses."); return createClerkClient({ secretKey: key }); };
const usage = `Usage: npm run ops -- <command>
  stats                          how many parents, subscriptions, learners and feedback items there are
  account <email> | --id <user>  support facts about one parent (logged)
  feedback [--days N] [--category X] [--replyable] [--limit N]   what parents have sent (with --replyable and a Clerk key, shows their email, logged)
  audit [--limit N]              who has looked at what`;

if (!command || command === "help") { console.log(usage); process.exit(0); }
const db = await connect();

try {
  if (command === "stats") console.log(formatStats(await stats(db)));
  else if (command === "account") {
    let id = flag("id"), email: string | undefined;
    if (!id) {
      email = rest.find((a) => a.includes("@"));
      if (!email) { console.log("Give an email address, or --id <sign-in id>."); process.exit(1); }
      const found = (await clerk().users.getUserList({ emailAddress: [email], limit: 2 })).data;
      if (!found.length) { console.log(`No sign-in account for ${email}.`); process.exit(0); }
      id = found[0].id;
    }
    const account = await accountByClerkId(db, id);
    if (!account) console.log("This person has signed in but has no quarter account yet (they haven't opened the app).");
    else { await audit(db, actor, "account", account.parentId); console.log(formatAccount(account, email)); console.log(`\n(Logged as ${actor}.)`); }
  } else if (command === "feedback") {
    const rows = await feedbackList(db, { days: flag("days") ? Number(flag("days")) : undefined, category: flag("category"), replyable: flag("replyable") === "true", limit: flag("limit") ? Number(flag("limit")) : 100 });
    if (!rows.length) console.log("No feedback found.");
    const c = process.env.CLERK_SECRET_KEY ? clerk() : null;
    for (const r of rows) {
      let reply = r.mayReply ? "may reply" : "do not reply";
      if (r.mayReply && c) {
        try { const u = await c.users.getUser(r.clerkUserId); reply = `may reply: ${u.primaryEmailAddress?.emailAddress ?? "no email"}`; await audit(db, actor, "feedback-email", `clerk:${r.clerkUserId.slice(-8)}`); } catch { reply = "may reply (email lookup failed)"; }
      }
      console.log(`\n${r.at} | ${r.category} | ${r.rating ? `${r.rating}/5` : "no rating"} | ${r.context ?? ""} | ${reply}\n${r.message}`);
    }
  } else if (command === "audit") {
    const rows = await auditLog(db, flag("limit") ? Number(flag("limit")) : 50);
    console.log(rows.length ? rows.map((r) => `${r.at.slice(0, 19).replace("T", " ")}  ${r.actor.padEnd(16)} ${r.action.padEnd(15)} ${r.target}`).join("\n") : "Nothing logged yet.");
  } else { console.log(usage); process.exit(1); }
} finally { process.exit(process.exitCode ?? 0); }

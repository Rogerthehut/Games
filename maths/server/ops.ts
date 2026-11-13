import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "./db";
import { schema } from "./db";

/**
 * Read-only questions for the team about how quarter is doing and who needs help. Nothing here shows a child's answers, progress or tutor
 * chats, and nothing changes an account. Looking up an account is written to the audit log. See docs/OPS.md.
 */
const DAY = 86_400_000;
const num = (v: unknown) => Number(v ?? 0);

export interface Stats {
  at: string;
  parents: { total: number; agreedToTerms: number; newLast7: number; newLast30: number };
  subscriptions: { byStatus: Record<string, number>; everSubscribed: number; trialsEndingIn7Days: number; cancellingAtPeriodEnd: number };
  learners: { total: number; byYear: Record<string, number>; activeLast7: number; activeLast30: number };
  feedback: { last7: number; byCategory: Record<string, number> };
}

export async function stats(db: Db, now = new Date()): Promise<Stats> {
  const ago = (d: number) => new Date(now.getTime() - d * DAY), ahead = (d: number) => new Date(now.getTime() + d * DAY);
  const count = async (q: PromiseLike<{ n: unknown }[]>) => num((await q)[0]?.n);
  const n = sql<number>`count(*)::int`;
  const { parents, learners, learnerProgress, subscriptions, feedback } = schema;
  const grouped = async (rows: PromiseLike<{ k: string | number | null; n: unknown }[]>) => Object.fromEntries((await rows).map((r) => [String(r.k ?? "none"), num(r.n)]));
  return {
    at: now.toISOString(),
    parents: {
      total: await count(db.select({ n }).from(parents)),
      agreedToTerms: await count(db.select({ n }).from(parents).where(sql`${parents.consentedAt} is not null`)),
      newLast7: await count(db.select({ n }).from(parents).where(gte(parents.createdAt, ago(7)))),
      newLast30: await count(db.select({ n }).from(parents).where(gte(parents.createdAt, ago(30)))),
    },
    subscriptions: {
      byStatus: await grouped(db.select({ k: subscriptions.status, n }).from(subscriptions).groupBy(subscriptions.status)),
      everSubscribed: await count(db.select({ n }).from(subscriptions).where(eq(subscriptions.everSubscribed, true))),
      trialsEndingIn7Days: await count(db.select({ n }).from(subscriptions).where(and(eq(subscriptions.status, "trialing"), gte(subscriptions.trialEnd, now), sql`${subscriptions.trialEnd} <= ${ahead(7)}`))),
      cancellingAtPeriodEnd: await count(db.select({ n }).from(subscriptions).where(eq(subscriptions.cancelAtPeriodEnd, true))),
    },
    learners: {
      total: await count(db.select({ n }).from(learners)),
      byYear: await grouped(db.select({ k: learners.year, n }).from(learners).groupBy(learners.year).orderBy(learners.year)),
      activeLast7: await count(db.select({ n }).from(learnerProgress).where(gte(learnerProgress.updatedAt, ago(7)))),
      activeLast30: await count(db.select({ n }).from(learnerProgress).where(gte(learnerProgress.updatedAt, ago(30)))),
    },
    feedback: {
      last7: await count(db.select({ n }).from(feedback).where(gte(feedback.createdAt, ago(7)))),
      byCategory: await grouped(db.select({ k: feedback.category, n }).from(feedback).where(gte(feedback.createdAt, ago(30))).groupBy(feedback.category)),
    },
  };
}

export interface AccountSummary {
  parentId: string; createdAt: string; consent: { version: string | null; at: string | null };
  subscription: { status: string; plan: string | null; trialEnd: string | null; periodEnd: string | null; cancelAtPeriodEnd: boolean; everSubscribed: boolean; stripeCustomerId: string } | null;
  learners: { count: number; years: number[]; lastActive: string | null };
  feedbackCount: number;
}

/** Support facts about one parent, found by their sign-in id. Deliberately leaves out learner names, progress and chats. */
export async function accountByClerkId(db: Db, clerkUserId: string): Promise<AccountSummary | null> {
  const { parents, learners, learnerProgress, subscriptions, feedback } = schema;
  const [parent] = await db.select().from(parents).where(eq(parents.clerkUserId, clerkUserId));
  if (!parent) return null;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.parentId, parent.id));
  const kids = await db.select({ year: learners.year, active: learnerProgress.updatedAt }).from(learners).leftJoin(learnerProgress, eq(learnerProgress.learnerId, learners.id)).where(eq(learners.parentId, parent.id));
  const [fb] = await db.select({ n: sql<number>`count(*)::int` }).from(feedback).where(eq(feedback.parentId, parent.id));
  const last = kids.map((k) => k.active).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    parentId: parent.id, createdAt: parent.createdAt.toISOString(), consent: { version: parent.consentVersion, at: parent.consentedAt?.toISOString() ?? null },
    subscription: sub ? { status: sub.status, plan: sub.plan, trialEnd: sub.trialEnd?.toISOString() ?? null, periodEnd: sub.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, everSubscribed: sub.everSubscribed, stripeCustomerId: sub.stripeCustomerId } : null,
    learners: { count: kids.length, years: kids.map((k) => k.year).sort((a, b) => a - b), lastActive: last?.toISOString() ?? null },
    feedbackCount: num(fb?.n),
  };
}

export interface FeedbackRow { ticket: number | null; unread: boolean; deletedAt: string | null; id: string; at: string; replies: { at: string; actor: string; message: string }[]; category: string; rating: number | null; context: string | null; message: string; mayReply: boolean; clerkUserId: string }
export async function feedbackList(db: Db, o: { days?: number; category?: string; replyable?: boolean; limit?: number; now?: Date } = {}): Promise<FeedbackRow[]> {
  const { feedback, parents } = schema, now = o.now ?? new Date();
  const where = [o.days ? gte(feedback.createdAt, new Date(now.getTime() - o.days * DAY)) : undefined, o.category ? eq(feedback.category, o.category) : undefined, o.replyable ? eq(feedback.mayReply, true) : undefined].filter((w) => w !== undefined);
  const rows = await db.select({ f: feedback, clerk: parents.clerkUserId }).from(feedback).innerJoin(parents, eq(parents.id, feedback.parentId)).where(where.length ? and(...where) : undefined).orderBy(desc(feedback.createdAt)).limit(Math.min(o.limit ?? 100, 500));
  const ids = rows.map((r) => r.f.id);
  const replies = ids.length ? await db.select().from(schema.feedbackReplies).where(inArray(schema.feedbackReplies.feedbackId, ids)).orderBy(schema.feedbackReplies.at) : [];
  return rows.map(({ f, clerk }) => ({ ticket: f.ticket, unread: f.unread, deletedAt: f.deletedAt?.toISOString() ?? null, id: f.id, replies: replies.filter((r) => r.feedbackId === f.id).map((r) => ({ at: r.at.toISOString(), actor: r.actor, message: r.message })), at: f.createdAt.toISOString(), category: f.category, rating: f.rating, context: f.context, message: f.message, mayReply: f.mayReply, clerkUserId: clerk }));
}

/** Writes down that someone looked at an account. The target is the internal id, never an email address. */
export async function audit(db: Db, actor: string, action: string, target: string): Promise<void> {
  await db.insert(schema.opsAudit).values({ actor: actor.slice(0, 80), action: action.slice(0, 40), target: target.slice(0, 80) });
}
export async function auditLog(db: Db, limit = 50) {
  return (await db.select().from(schema.opsAudit).orderBy(desc(schema.opsAudit.at)).limit(Math.min(limit, 500))).map((r) => ({ at: r.at.toISOString(), actor: r.actor, action: r.action, target: r.target }));
}

// ---- how the results read in a terminal
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const table = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `    ${pad(k, 18)}${v}`).join("\n") || "    none";
export function formatStats(s: Stats): string {
  return [
    `quarter, ${s.at.slice(0, 16).replace("T", " ")} UTC`,
    "", "Parents", `    total ${s.parents.total} · agreed to the terms ${s.parents.agreedToTerms} · new in 7 days ${s.parents.newLast7} · new in 30 days ${s.parents.newLast30}`,
    "", "Subscriptions (by status)", table(s.subscriptions.byStatus), `    ever subscribed ${s.subscriptions.everSubscribed} · trials ending in 7 days ${s.subscriptions.trialsEndingIn7Days} · cancelling at period end ${s.subscriptions.cancellingAtPeriodEnd}`,
    "", "Learners", `    total ${s.learners.total} · active in 7 days ${s.learners.activeLast7} · active in 30 days ${s.learners.activeLast30}`, "    by school year", table(s.learners.byYear),
    "", "Feedback", `    in the last 7 days ${s.feedback.last7}`, "    in the last 30 days, by category", table(s.feedback.byCategory),
  ].join("\n");
}
export function formatAccount(a: AccountSummary, email?: string): string {
  const sub = a.subscription;
  const d = (v: string | null) => (v ? v.slice(0, 10) : "none");
  return [
    email ? `Account for ${email}` : "Account", `    id ${a.parentId} · created ${d(a.createdAt)}`,
    `    terms ${a.consent.version ? `agreed (${a.consent.version}) on ${d(a.consent.at)}` : "not agreed yet"}`,
    sub ? `    subscription ${sub.status}${sub.plan ? `, ${sub.plan}` : ""} · trial ends ${d(sub.trialEnd)} · period ends ${d(sub.periodEnd)}${sub.cancelAtPeriodEnd ? " · cancelling" : ""} · ever subscribed ${sub.everSubscribed ? "yes" : "no"}\n    Stripe: https://dashboard.stripe.com/customers/${sub.stripeCustomerId}` : "    no subscription record",
    `    learners ${a.learners.count}${a.learners.years.length ? ` (years ${a.learners.years.join(", ")})` : ""} · last active ${d(a.learners.lastActive)}`,
    `    feedback sent ${a.feedbackCount}`,
  ].join("\n");
}

/** One piece of feedback with the parent's sign-in id, for sending a reply. Null if it doesn't exist. */
export async function feedbackById(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select({ f: schema.feedback, clerk: schema.parents.clerkUserId }).from(schema.feedback).innerJoin(schema.parents, eq(schema.parents.id, schema.feedback.parentId)).where(eq(schema.feedback.id, id));
  return row ? { id: row.f.id, message: row.f.message, category: row.f.category, mayReply: row.f.mayReply, clerkUserId: row.clerk } : null;
}
export async function addReply(db: Db, feedbackId: string, actor: string, message: string): Promise<void> {
  await db.insert(schema.feedbackReplies).values({ feedbackId, actor: actor.slice(0, 80), message });
}

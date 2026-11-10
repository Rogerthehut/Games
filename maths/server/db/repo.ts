import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "./index";
import { learnerProgress, learners, parents, stripeEvents, subscriptions, type Parent, type Subscription } from "./schema";
import { MAX_LEARNERS, cleanProfile } from "./profile-check";

export interface StoredLearner { id: string; version: number; data: Record<string, unknown> }
export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; reason: "conflict"; current: StoredLearner }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "invalid"; error: string };
export type CreateResult = { ok: true; id: string; version: number } | { ok: false; reason: "limit" | "invalid"; error: string };

/**
 * Everything the API needs from the database. Every learner query carries the parent's id, so one family can never read,
 * change or delete another's data, whatever id they send.
 */
export function makeRepo(db: Db) {
  const owned = (parentId: string, learnerId: string) => and(eq(learners.id, learnerId), eq(learners.parentId, parentId));

  async function getLearner(parentId: string, learnerId: string): Promise<StoredLearner | null> {
    if (!UUID.test(learnerId)) return null;
    const [row] = await db.select({ id: learners.id, version: learnerProgress.version, data: learnerProgress.data })
      .from(learners).innerJoin(learnerProgress, eq(learnerProgress.learnerId, learners.id)).where(owned(parentId, learnerId));
    return row ? { id: row.id, version: row.version, data: { ...row.data, id: row.id } } : null;
  }

  return {
    async upsertParent(clerkUserId: string): Promise<Parent> {
      await db.insert(parents).values({ clerkUserId }).onConflictDoNothing({ target: parents.clerkUserId });
      const [p] = await db.select().from(parents).where(eq(parents.clerkUserId, clerkUserId));
      return p;
    },

    async recordConsent(parentId: string, version: string) {
      await db.update(parents).set({ consentVersion: version, consentedAt: new Date() }).where(eq(parents.id, parentId));
    },

    /** Every learner with their progress, oldest first. Used when someone signs in. */
    async loadLearners(parentId: string): Promise<StoredLearner[]> {
      const rows = await db.select({ id: learners.id, version: learnerProgress.version, data: learnerProgress.data })
        .from(learners).innerJoin(learnerProgress, eq(learnerProgress.learnerId, learners.id)).where(eq(learners.parentId, parentId)).orderBy(asc(learners.createdAt), asc(learners.id));
      return rows.map((r) => ({ id: r.id, version: r.version, data: { ...r.data, id: r.id } }));
    },

    getLearner,

    async createLearner(parentId: string, profile: unknown): Promise<CreateResult> {
      const c = cleanProfile(profile);
      if (!c.ok) return { ok: false, reason: "invalid", error: c.error };
      return db.transaction(async (tx) => {
        // lock the parent row so two requests cannot both slip under the limit
        await tx.execute(sql`SELECT id FROM parents WHERE id = ${parentId} FOR UPDATE`);
        const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(learners).where(eq(learners.parentId, parentId));
        if (n >= MAX_LEARNERS) return { ok: false as const, reason: "limit" as const, error: `An account can have up to ${MAX_LEARNERS} learners.` };
        const [row] = await tx.insert(learners).values({ parentId, nickname: c.nickname, year: c.year }).returning({ id: learners.id });
        await tx.insert(learnerProgress).values({ learnerId: row.id, data: { ...c.data, id: row.id } });
        return { ok: true as const, id: row.id, version: 1 };
      });
    },

    /** Save progress if nobody else has saved since `baseVersion`. Otherwise say so and hand back what is stored. */
    async saveProgress(parentId: string, learnerId: string, profile: unknown, baseVersion: number): Promise<SaveResult> {
      if (!UUID.test(learnerId)) return { ok: false, reason: "not-found" };
      const c = cleanProfile(profile);
      if (!c.ok) return { ok: false, reason: "invalid", error: c.error };
      return db.transaction(async (tx) => {
        const updated = await tx.update(learnerProgress)
          .set({ data: { ...c.data, id: learnerId }, version: sql`${learnerProgress.version} + 1`, updatedAt: new Date() })
          .where(and(eq(learnerProgress.learnerId, learnerId), eq(learnerProgress.version, baseVersion),
            sql`exists (select 1 from learners l where l.id = ${learnerId} and l.parent_id = ${parentId})`))
          .returning({ version: learnerProgress.version });
        if (updated.length) {
          await tx.update(learners).set({ nickname: c.nickname, year: c.year, updatedAt: new Date() }).where(owned(parentId, learnerId));
          return { ok: true as const, version: updated[0].version };
        }
        const [row] = await tx.select({ id: learners.id, version: learnerProgress.version, data: learnerProgress.data })
          .from(learners).innerJoin(learnerProgress, eq(learnerProgress.learnerId, learners.id)).where(owned(parentId, learnerId));
        if (!row) return { ok: false as const, reason: "not-found" as const };
        return { ok: false as const, reason: "conflict" as const, current: { id: row.id, version: row.version, data: { ...row.data, id: row.id } } };
      });
    },

    async deleteLearner(parentId: string, learnerId: string): Promise<boolean> {
      if (!UUID.test(learnerId)) return false;
      const gone = await db.delete(learners).where(owned(parentId, learnerId)).returning({ id: learners.id });
      return gone.length > 0;
    },

    /** Deletes the account and everything under it. */
    async deleteParent(parentId: string): Promise<void> {
      await db.delete(parents).where(eq(parents.id, parentId));
    },

    async getSubscription(parentId: string): Promise<Subscription | null> {
      const [row] = await db.select().from(subscriptions).where(eq(subscriptions.parentId, parentId));
      return row ?? null;
    },

    /** Remember which Stripe customer belongs to this parent (made before the first checkout). */
    async setCustomer(parentId: string, customerId: string): Promise<Subscription> {
      await db.insert(subscriptions).values({ parentId, stripeCustomerId: customerId }).onConflictDoNothing({ target: subscriptions.parentId });
      return (await this.getSubscription(parentId))!;
    },

    /** Apply what Stripe says about a customer's subscription. Returns false if we do not know the customer. */
    async applySubscription(customerId: string, s: { id: string | null; status: string; plan: string | null; trialEnd: Date | null; periodEnd: Date | null; cancelAtPeriodEnd: boolean }): Promise<boolean> {
      const done = await db.update(subscriptions).set({
        stripeSubscriptionId: s.id, status: s.status, plan: s.plan, trialEnd: s.trialEnd, currentPeriodEnd: s.periodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        everSubscribed: sql`${subscriptions.everSubscribed} or ${s.id !== null}`, updatedAt: new Date(),
      }).where(eq(subscriptions.stripeCustomerId, customerId)).returning({ id: subscriptions.parentId });
      return done.length > 0;
    },

    /** True the first time an event id is seen, so a repeated webhook does nothing twice. */
    async firstSight(eventId: string): Promise<boolean> {
      const ins = await db.insert(stripeEvents).values({ id: eventId }).onConflictDoNothing({ target: stripeEvents.id }).returning({ id: stripeEvents.id });
      return ins.length > 0;
    },

    /** Everything held about a family, for them to download. */
    async exportParent(parentId: string) {
      const [parent] = await db.select().from(parents).where(eq(parents.id, parentId));
      const sub = await this.getSubscription(parentId);
      return { parent: parent ? { consentVersion: parent.consentVersion, consentedAt: parent.consentedAt, createdAt: parent.createdAt } : null,
        subscription: sub ? { status: sub.status, plan: sub.plan, trialEnd: sub.trialEnd, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null, learners: await this.loadLearners(parentId) };
    },
  };
}
export type Repo = ReturnType<typeof makeRepo>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

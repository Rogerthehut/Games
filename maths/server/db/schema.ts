import { bigint, boolean, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** The tables, mirrored from migrations/. The SQL files are the source of truth; this is for typed queries. */
export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  consentVersion: text("consent_version"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learners = pgTable("learners", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  year: smallint("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learnerProgress = pgTable("learner_progress", {
  learnerId: uuid("learner_id").primaryKey().references(() => learners.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().$type<Record<string, unknown>>(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  parentId: uuid("parent_id").primaryKey().references(() => parents.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("none"),
  plan: text("plan"),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  everSubscribed: boolean("ever_subscribed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailPrefs = pgTable("email_prefs", {
  parentId: uuid("parent_id").primaryKey().references(() => parents.id, { onDelete: "cascade" }),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  unsubToken: text("unsub_token").notNull().unique(),
  optedInAt: timestamp("opted_in_at", { withTimezone: true }),
  lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  rating: smallint("rating"),
  message: text("message").notNull(),
  mayReply: boolean("may_reply").notNull().default(false),
  context: text("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackReplies = pgTable("feedback_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedbackId: uuid("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
  message: text("message").notNull(),
});

export const opsAudit = pgTable("ops_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
});

export const rateCounters = pgTable("rate_counters", {
  key: text("key").notNull(),
  slot: bigint("slot", { mode: "number" }).notNull(),
  n: integer("n").notNull().default(0),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.key, t.slot] }) }));

export type Subscription = typeof subscriptions.$inferSelect;
export type Parent = typeof parents.$inferSelect;

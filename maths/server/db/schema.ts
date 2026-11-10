import { boolean, integer, jsonb, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export type Subscription = typeof subscriptions.$inferSelect;
export type Parent = typeof parents.$inferSelect;

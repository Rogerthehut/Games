import { bigint, boolean, date, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  ticket: integer("ticket"),
  unread: boolean("unread").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  pinned: boolean("pinned").notNull().default(false),
  flagged: boolean("flagged").notNull().default(false),
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

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name"),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default("form"),
  ticket: integer("ticket"),
  unread: boolean("unread").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  pinned: boolean("pinned").notNull().default(false),
  flagged: boolean("flagged").notNull().default(false),
  subject: text("subject"),
  messageId: text("message_id"),
  auth: text("auth"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactReplies = pgTable("contact_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contactMessages.id, { onDelete: "cascade" }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
  message: text("message").notNull(),

  direction: text("direction").notNull().default("out"),
  messageId: text("message_id"),
  fromEmail: text("from_email"),
  auth: text("auth"),
});

export const inboundSeen = pgTable("inbound_seen", {
  emailId: text("email_id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const opsSignatures = pgTable("ops_signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  html: text("html").notNull(),
  textVersion: text("text_version").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
});

export const ticketCounter = pgTable("ticket_counter", {
  name: text("name").primaryKey(),
  n: integer("n").notNull(),
});

export const opsDrafts = pgTable("ops_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  conversationId: uuid("conversation_id").references(() => contactMessages.id, { onDelete: "cascade" }),
  toEmail: text("to_email"),
  subject: text("subject"),
  body: text("body").notNull().default(""),
  signatureId: uuid("signature_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
});

export const opsOutbox = pgTable("ops_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  kind: text("kind").notNull(),
  conversationId: uuid("conversation_id").references(() => contactMessages.id, { onDelete: "cascade" }),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  html: text("html").notNull(),
  textVersion: text("text_version").notNull(),
  inReplyTo: text("in_reply_to"),
  ticket: integer("ticket"),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttempt: timestamp("next_attempt", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
});

/** Anonymous counts of how questions went, by week, topic, level and age band. No identifiers of any kind. See server/question-stats.ts. */
export const questionStats = pgTable("question_stats", {
  week: date("week", { mode: "string" }).notNull(),
  skill: text("skill").notNull(),
  level: smallint("level").notNull(),
  band: text("band").notNull(),
  attempts: integer("attempts").notNull().default(0),
  rightN: integer("right_n").notNull().default(0),
  helped: integer("helped").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  secs: bigint("secs", { mode: "number" }).notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.week, t.skill, t.level, t.band] }) }));

export const misconceptionStats = pgTable("misconception_stats", {
  week: date("week", { mode: "string" }).notNull(),
  skill: text("skill").notNull(),
  tag: text("tag").notNull(),
  band: text("band").notNull(),
  n: integer("n").notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.week, t.skill, t.tag, t.band] }) }));

/** Access bought in the App Store, as reported by RevenueCat (server/revenuecat.ts). */
export const appEntitlements = pgTable("app_entitlements", {
  parentId: uuid("parent_id").primaryKey().references(() => parents.id, { onDelete: "cascade" }),
  product: text("product"),
  store: text("store"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  willRenew: boolean("will_renew").notNull().default(true),
  inTrial: boolean("in_trial").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const revenuecatEvents = pgTable("revenuecat_events", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

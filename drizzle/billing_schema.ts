import { mysqlTable, varchar, text, boolean, timestamp, int, decimal } from "drizzle-orm/mysql-core";

/**
 * Workspace Subscriptions
 * Tracks Stripe subscription status for each workspace
 */
export const workspaceSubscriptions = mysqlTable("workspaceSubscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  tier: varchar("tier", { length: 50 }).notNull().default("free"), // free, pro, enterprise
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, canceled, past_due
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type WorkspaceSubscription = typeof workspaceSubscriptions.$inferSelect;
export type InsertWorkspaceSubscription = typeof workspaceSubscriptions.$inferInsert;

/**
 * Usage Tracking for Billing
 * Tracks resource usage per workspace for billing purposes
 */
export const workspaceUsage = mysqlTable("workspaceUsage", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // Format: YYYY-MM
  promptsCreated: int("promptsCreated").default(0).notNull(),
  evaluationsRun: int("evaluationsRun").default(0).notNull(),
  apiCallsMade: int("apiCallsMade").default(0).notNull(),
  storageUsedMB: int("storageUsedMB").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type WorkspaceUsage = typeof workspaceUsage.$inferSelect;
export type InsertWorkspaceUsage = typeof workspaceUsage.$inferInsert;

/**
 * Subscription Plans
 * Defines available subscription tiers and their limits
 */
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  tier: varchar("tier", { length: 50 }).notNull(), // free, pro, enterprise
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  interval: varchar("interval", { length: 20 }).notNull(), // month, year
  maxPrompts: int("maxPrompts").default(-1), // -1 = unlimited
  maxEvaluations: int("maxEvaluations").default(-1),
  maxApiCalls: int("maxApiCalls").default(-1),
  maxMembers: int("maxMembers").default(-1),
  features: text("features"), // JSON array of feature names
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

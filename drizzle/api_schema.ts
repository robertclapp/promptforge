import { mysqlTable, varchar, text, boolean, timestamp, int, json } from "drizzle-orm/mysql-core";

/**
 * API Keys for external API access
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Friendly name for the key
  keyHash: text("keyHash").notNull(), // Hashed API key (never store plain text)
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(), // First few chars for display (e.g., "pk_live_abc...")
  isActive: boolean("isActive").default(true).notNull(),
  rateLimit: int("rateLimit").default(1000).notNull(), // Requests per hour
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  expiresAt: timestamp("expiresAt"), // Optional expiration
});

export type APIKey = typeof apiKeys.$inferSelect;
export type InsertAPIKey = typeof apiKeys.$inferInsert;

/**
 * API Usage tracking for rate limiting and analytics
 */
export const apiUsage = mysqlTable("apiUsage", {
  id: varchar("id", { length: 64 }).primaryKey(),
  apiKeyId: varchar("apiKeyId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(), // e.g., "/api/v1/prompts"
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, etc.
  statusCode: int("statusCode").notNull(),
  responseTime: int("responseTime"), // milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
});

export type APIUsage = typeof apiUsage.$inferSelect;
export type InsertAPIUsage = typeof apiUsage.$inferInsert;

/**
 * Webhooks for event notifications
 */
export const webhooks = mysqlTable("webhooks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  events: json("events").$type<string[]>().notNull(), // e.g., ["evaluation.completed", "budget.threshold_reached"]
  secret: text("secret").notNull(), // For signature verification
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Webhook delivery logs for debugging
 */
export const webhookDeliveries = mysqlTable("webhookDeliveries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  webhookId: varchar("webhookId", { length: 64 }).notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  payload: json("payload").notNull(),
  statusCode: int("statusCode"),
  response: text("response"),
  attempts: int("attempts").default(1).notNull(),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;


/**
 * Rate limit hits tracking for monitoring
 */
export const rateLimitHits = mysqlTable("rateLimitHits", {
  id: varchar("id", { length: 64 }).primaryKey(),
  apiKeyId: varchar("apiKeyId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  endpoint: varchar("endpoint", { length: 255 }),
  hitCount: int("hitCount").default(1).notNull(),
  windowStart: timestamp("windowStart").notNull(),
  windowEnd: timestamp("windowEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type RateLimitHit = typeof rateLimitHits.$inferSelect;
export type InsertRateLimitHit = typeof rateLimitHits.$inferInsert;

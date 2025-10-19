import {
  boolean,
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "enterprise"]).default("free").notNull(),
  apiCallsUsed: int("apiCallsUsed").default(0).notNull(),
  apiCallsLimit: int("apiCallsLimit").default(1000).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations for team collaboration
 */
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  ownerId: varchar("ownerId", { length: 64 }).notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "enterprise"]).default("free").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization memberships for team access control
 */
export const organizationMemberships = mysqlTable("organizationMemberships", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member", "viewer"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = typeof organizationMemberships.$inferInsert;

/**
 * AI Providers configuration - stores encrypted API keys
 */
export const aiProviders = mysqlTable("aiProviders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  provider: mysqlEnum("provider", ["openai", "anthropic", "google", "mistral", "custom"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  apiKeyEncrypted: text("apiKeyEncrypted").notNull(), // Encrypted API key
  baseUrl: varchar("baseUrl", { length: 500 }), // For custom providers
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  lastUsedAt: timestamp("lastUsedAt"),
});

export type AIProvider = typeof aiProviders.$inferSelect;
export type InsertAIProvider = typeof aiProviders.$inferInsert;

/**
 * Prompts - core entity for storing prompt templates
 */
export const prompts = mysqlTable("prompts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  variables: json("variables").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  folderPath: varchar("folderPath", { length: 500 }).default("/").notNull(),
  isTemplate: boolean("isTemplate").default(false).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = typeof prompts.$inferInsert;

/**
 * Prompt versions for version control
 */
export const promptVersions = mysqlTable("promptVersions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(),
  version: int("version").notNull(),
  content: text("content").notNull(),
  variables: json("variables").$type<string[]>(),
  changeMessage: text("changeMessage"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = typeof promptVersions.$inferInsert;

/**
 * Context packages for managing prompt context
 */
export const contextPackages = mysqlTable("contextPackages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  fileUrls: json("fileUrls").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  isActive: boolean("isActive").default(true).notNull(),
});

export type ContextPackage = typeof contextPackages.$inferSelect;
export type InsertContextPackage = typeof contextPackages.$inferInsert;

/**
 * Evaluations - stores evaluation runs and results
 */
export const evaluations = mysqlTable("evaluations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  promptId: varchar("promptId", { length: 64 }).notNull(),
  testCases: json("testCases").$type<Array<{ input: Record<string, string>; expectedOutput?: string }>>().notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

/**
 * Evaluation results - detailed results for each test case
 */
export const evaluationResults = mysqlTable("evaluationResults", {
  id: varchar("id", { length: 64 }).primaryKey(),
  evaluationId: varchar("evaluationId", { length: 64 }).notNull(),
  providerId: varchar("providerId", { length: 64 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  testCaseIndex: int("testCaseIndex").notNull(),
  input: json("input").$type<Record<string, string>>().notNull(),
  output: text("output").notNull(),
  tokensUsed: int("tokensUsed").notNull(),
  latencyMs: int("latencyMs").notNull(),
  cost: int("cost").notNull(), // Store as cents to avoid decimal issues
  quality: int("quality"), // 0-100 score
  createdAt: timestamp("createdAt").defaultNow(),
});

export type EvaluationResult = typeof evaluationResults.$inferSelect;
export type InsertEvaluationResult = typeof evaluationResults.$inferInsert;

/**
 * Analytics events for tracking usage
 */
export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  eventData: json("eventData").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;


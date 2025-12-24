/**
 * Shared Prompts Schema
 * Stores public sharing links for prompts
 */

import { mysqlTable, varchar, text, timestamp, boolean, int, mysqlEnum, index } from "drizzle-orm/mysql-core";

// Shared prompt links
export const sharedPrompts = mysqlTable("sharedPrompts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(), // Owner who shared
  shareCode: varchar("shareCode", { length: 32 }).notNull().unique(), // Short unique code for URL
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  accessLevel: mysqlEnum("accessLevel", ["view", "fork"]).default("view").notNull(),
  password: varchar("password", { length: 255 }), // Optional password protection
  expiresAt: timestamp("expiresAt"), // Optional expiration
  viewCount: int("viewCount").default(0).notNull(),
  forkCount: int("forkCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  promptIdIdx: index("shared_promptId_idx").on(table.promptId),
  userIdIdx: index("shared_userId_idx").on(table.userId),
  shareCodeIdx: index("shared_shareCode_idx").on(table.shareCode),
}));

export type SharedPrompt = typeof sharedPrompts.$inferSelect;
export type InsertSharedPrompt = typeof sharedPrompts.$inferInsert;

// Shared prompt forks tracking
export const sharedPromptForks = mysqlTable("sharedPromptForks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sharedPromptId: varchar("sharedPromptId", { length: 64 }).notNull(),
  forkedPromptId: varchar("forkedPromptId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  sharedPromptIdIdx: index("fork_sharedPromptId_idx").on(table.sharedPromptId),
  userIdIdx: index("fork_userId_idx").on(table.userId),
}));

export type SharedPromptFork = typeof sharedPromptForks.$inferSelect;
export type InsertSharedPromptFork = typeof sharedPromptForks.$inferInsert;

// Shared prompt views tracking
export const sharedPromptViews = mysqlTable("sharedPromptViews", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sharedPromptId: varchar("sharedPromptId", { length: 64 }).notNull(),
  viewerIp: varchar("viewerIp", { length: 45 }), // For anonymous tracking
  userId: varchar("userId", { length: 64 }), // If logged in
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  sharedPromptIdIdx: index("view_sharedPromptId_idx").on(table.sharedPromptId),
}));

export type SharedPromptView = typeof sharedPromptViews.$inferSelect;
export type InsertSharedPromptView = typeof sharedPromptViews.$inferInsert;

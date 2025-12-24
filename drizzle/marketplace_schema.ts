import { mysqlTable, varchar, text, int, timestamp, boolean, decimal, index } from "drizzle-orm/mysql-core";

/**
 * Template ratings and reviews
 */
export const templateRatings = mysqlTable("templateRatings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(), // The template being rated (can be built-in template ID or prompt ID)
  templateType: varchar("templateType", { length: 20 }).default("builtin").notNull(), // 'builtin' or 'user'
  userId: varchar("userId", { length: 64 }).notNull(), // User who rated
  userName: varchar("userName", { length: 255 }), // Display name for review
  rating: int("rating").notNull(), // 1-5 stars
  review: text("review"), // Optional review text
  helpful: int("helpful").default(0).notNull(), // Number of helpful votes
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  promptIdIdx: index("promptId_idx").on(table.promptId),
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type TemplateRating = typeof templateRatings.$inferSelect;
export type InsertTemplateRating = typeof templateRatings.$inferInsert;

/**
 * Helpful votes for reviews
 */
export const reviewHelpfulVotes = mysqlTable("reviewHelpfulVotes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  ratingId: varchar("ratingId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  ratingIdIdx: index("ratingId_idx").on(table.ratingId),
}));

export type ReviewHelpfulVote = typeof reviewHelpfulVotes.$inferSelect;
export type InsertReviewHelpfulVote = typeof reviewHelpfulVotes.$inferInsert;

/**
 * Template usage tracking (how many times a template was used)
 */
export const templateUsage = mysqlTable("templateUsage", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(), // The template
  userId: varchar("userId", { length: 64 }).notNull(), // User who used it
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  promptIdIdx: index("promptId_idx").on(table.promptId),
}));

export type TemplateUsage = typeof templateUsage.$inferSelect;
export type InsertTemplateUsage = typeof templateUsage.$inferInsert;

/**
 * Template categories for organization
 */
export const templateCategories = mysqlTable("templateCategories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  createdAt: timestamp("createdAt").defaultNow(),
});

export type TemplateCategory = typeof templateCategories.$inferSelect;
export type InsertTemplateCategory = typeof templateCategories.$inferInsert;

/**
 * Mapping between templates and categories (many-to-many)
 */
export const templateCategoryMappings = mysqlTable("templateCategoryMappings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(),
  categoryId: varchar("categoryId", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  promptIdIdx: index("promptId_idx").on(table.promptId),
  categoryIdIdx: index("categoryId_idx").on(table.categoryId),
}));

export type TemplateCategoryMapping = typeof templateCategoryMappings.$inferSelect;
export type InsertTemplateCategoryMapping = typeof templateCategoryMappings.$inferInsert;

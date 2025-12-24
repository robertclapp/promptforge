import { mysqlTable, varchar, text, timestamp, index, boolean, int } from "drizzle-orm/mysql-core";

/**
 * Comments on prompts for collaboration - Enhanced with threading
 */
export const comments = mysqlTable("comments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: varchar("promptId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  userName: varchar("userName", { length: 255 }),
  userAvatar: varchar("userAvatar", { length: 500 }),
  content: text("content").notNull(),
  
  // Threading support
  parentId: varchar("parentId", { length: 64 }), // null for root comments
  rootId: varchar("rootId", { length: 64 }), // ID of the top-level comment in thread
  depth: int("depth").default(0), // 0 for root, 1 for reply, etc.
  
  // Mentions (stored as JSON string)
  mentions: text("mentions"), // JSON array: ["userId1", "userId2"]
  
  // Status
  isEdited: boolean("isEdited").default(false),
  isDeleted: boolean("isDeleted").default(false),
  
  // Reactions (stored as JSON string)
  reactions: text("reactions"), // JSON: {"👍": ["userId1"], "❤️": ["userId2"]}
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  promptIdIdx: index("promptId_idx").on(table.promptId),
  userIdIdx: index("userId_idx").on(table.userId),
  parentIdIdx: index("parentId_idx").on(table.parentId),
  rootIdIdx: index("rootId_idx").on(table.rootId),
}));

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Comment notifications for @mentions and replies
 */
export const commentNotifications = mysqlTable("commentNotifications", {
  id: varchar("id", { length: 64 }).primaryKey(),
  commentId: varchar("commentId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(), // User being notified
  promptId: varchar("promptId", { length: 64 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'mention', 'reply', 'reaction'
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("commentNotifications_userId_idx").on(table.userId),
  isReadIdx: index("commentNotifications_isRead_idx").on(table.isRead),
}));

export type CommentNotification = typeof commentNotifications.$inferSelect;
export type InsertCommentNotification = typeof commentNotifications.$inferInsert;

/**
 * Activity feed for tracking user actions
 */
export const activityFeed = mysqlTable("activityFeed", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "created_prompt", "ran_evaluation", "published_template"
  resourceType: varchar("resourceType", { length: 50 }).notNull(), // e.g., "prompt", "evaluation", "template"
  resourceId: varchar("resourceId", { length: 64 }).notNull(),
  resourceName: varchar("resourceName", { length: 255 }), // For display
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  userIdIdx: index("activityFeed_userId_idx").on(table.userId),
  createdAtIdx: index("activityFeed_createdAt_idx").on(table.createdAt),
}));

export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type InsertActivityFeedItem = typeof activityFeed.$inferInsert;

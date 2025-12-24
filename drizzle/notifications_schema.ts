import { mysqlTable, varchar, text, datetime, boolean, int } from "drizzle-orm/mysql-core";

/**
 * Notifications table - stores user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // comment, mention, evaluation_complete, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  resourceType: varchar("resourceType", { length: 50 }), // prompt, evaluation, etc.
  resourceId: varchar("resourceId", { length: 255 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: datetime("createdAt").notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

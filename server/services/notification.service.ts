import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../db";
import { notifications, type InsertNotification } from "../../drizzle/schema";
import { emitToUser } from "../_core/socket";

export type NotificationType =
  | "comment"
  | "mention"
  | "evaluation_complete"
  | "budget_alert"
  | "test_run_complete"
  | "optimization_ready";

/**
 * Create a notification and emit it via Socket.io
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  resourceType?: string,
  resourceId?: string
) {
  const db = await getDb();
  if (!db) return null;

  const id = nanoid();
  const notification: InsertNotification = {
    id,
    userId,
    type,
    title,
    message,
    resourceType: resourceType || null,
    resourceId: resourceId || null,
    isRead: false,
    createdAt: new Date(),
  };

  await db.insert(notifications).values(notification);

  // Emit real-time notification
  emitToUser(userId, "notification", {
    id,
    type,
    title,
    message,
    resourceType,
    resourceId,
    createdAt: notification.createdAt,
  });

  return notification;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result.length;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

  return true;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));

  return true;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

  return true;
}

/**
 * Helper: Notify user when someone comments on their prompt
 */
export async function notifyNewComment(
  promptOwnerId: string,
  commenterName: string,
  promptName: string,
  promptId: string
) {
  return await createNotification(
    promptOwnerId,
    "comment",
    "New Comment",
    `${commenterName} commented on your prompt "${promptName}"`,
    "prompt",
    promptId
  );
}

/**
 * Helper: Notify user when they are mentioned
 */
export async function notifyMention(
  mentionedUserId: string,
  mentionerName: string,
  promptName: string,
  promptId: string
) {
  return await createNotification(
    mentionedUserId,
    "mention",
    "You were mentioned",
    `${mentionerName} mentioned you in a comment on "${promptName}"`,
    "prompt",
    promptId
  );
}

/**
 * Helper: Notify user when evaluation completes
 */
export async function notifyEvaluationComplete(
  userId: string,
  evaluationName: string,
  evaluationId: string,
  status: "passed" | "failed"
) {
  return await createNotification(
    userId,
    "evaluation_complete",
    "Evaluation Complete",
    `Your evaluation "${evaluationName}" has ${status}`,
    "evaluation",
    evaluationId
  );
}

/**
 * Helper: Notify user when test run completes
 */
export async function notifyTestRunComplete(
  userId: string,
  suiteName: string,
  suiteId: string,
  passed: boolean
) {
  return await createNotification(
    userId,
    "test_run_complete",
    "Test Run Complete",
    `Test suite "${suiteName}" ${passed ? "passed" : "failed"}`,
    "test_suite",
    suiteId
  );
}

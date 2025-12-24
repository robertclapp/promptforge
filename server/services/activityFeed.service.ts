import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { activityFeed, users, type InsertActivityFeedItem } from "../../drizzle/schema";

export type ActivityAction =
  | "created_prompt"
  | "updated_prompt"
  | "deleted_prompt"
  | "ran_evaluation"
  | "published_template"
  | "used_template"
  | "rated_template"
  | "created_budget"
  | "created_test_suite"
  | "ran_test_suite"
  | "optimized_prompt";

export type ResourceType =
  | "prompt"
  | "evaluation"
  | "template"
  | "budget"
  | "test_suite"
  | "optimization";

/**
 * Track a user action in the activity feed
 */
export async function trackActivity(
  userId: string,
  action: ActivityAction,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string,
  metadata?: Record<string, any>
) {
  const db = await getDb();
  if (!db) return;

  const id = nanoid();
  await db.insert(activityFeed).values({
    id,
    userId,
    action,
    resourceType,
    resourceId,
    resourceName: resourceName || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(userId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      action: activityFeed.action,
      resourceType: activityFeed.resourceType,
      resourceId: activityFeed.resourceId,
      resourceName: activityFeed.resourceName,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(activityFeed)
    .leftJoin(users, eq(activityFeed.userId, users.id))
    .where(eq(activityFeed.userId, userId))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);

  return result.map((item) => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null,
  }));
}

/**
 * Get global activity feed (all users)
 */
export async function getGlobalActivity(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: activityFeed.id,
      userId: activityFeed.userId,
      action: activityFeed.action,
      resourceType: activityFeed.resourceType,
      resourceId: activityFeed.resourceId,
      resourceName: activityFeed.resourceName,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(activityFeed)
    .leftJoin(users, eq(activityFeed.userId, users.id))
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);

  return result.map((item) => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null,
  }));
}

/**
 * Format activity action for display
 */
export function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    created_prompt: "created a prompt",
    updated_prompt: "updated a prompt",
    deleted_prompt: "deleted a prompt",
    ran_evaluation: "ran an evaluation",
    published_template: "published a template",
    used_template: "used a template",
    rated_template: "rated a template",
    created_budget: "created a budget",
    created_test_suite: "created a test suite",
    ran_test_suite: "ran a test suite",
    optimized_prompt: "optimized a prompt",
  };

  return actionMap[action] || action;
}

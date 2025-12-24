import { getDb } from "../db";
import { prompts, evaluations, apiKeys, apiUsage, organizationMemberships } from "../../drizzle/schema";
import { eq, and, count, sql } from "drizzle-orm";

/**
 * Workspace Analytics Service
 * Provides aggregate metrics and statistics for team workspaces
 */

export interface WorkspaceMetrics {
  totalPrompts: number;
  totalEvaluations: number;
  totalMembers: number;
  totalApiKeys: number;
  apiUsageCount: number;
  recentActivity: {
    promptsCreatedThisWeek: number;
    evaluationsRunThisWeek: number;
  };
}

/**
 * Get comprehensive metrics for a workspace
 */
export async function getWorkspaceMetrics(organizationId: string): Promise<WorkspaceMetrics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get total prompts
  const [promptCount] = await db
    .select({ count: count() })
    .from(prompts)
    .where(eq(prompts.organizationId, organizationId));

  // Get total evaluations
  const [evalCount] = await db
    .select({ count: count() })
    .from(evaluations)
    .where(eq(evaluations.organizationId, organizationId));

  // Get total members
  const [memberCount] = await db
    .select({ count: count() })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.isActive, true)
      )
    );

  // Get total API keys (count by userId since apiKeys doesn't have organizationId)
  const [apiKeyCount] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));

  // Get API usage count from apiUsage table
  const [apiUsageResult] = await db
    .select({ total: count() })
    .from(apiUsage);

  // Get recent activity (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [recentPrompts] = await db
    .select({ count: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.organizationId, organizationId),
        sql`${prompts.createdAt} >= ${oneWeekAgo.toISOString()}`
      )
    );

  const [recentEvals] = await db
    .select({ count: count() })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.organizationId, organizationId),
        sql`${evaluations.createdAt} >= ${oneWeekAgo.toISOString()}`
      )
    );

  return {
    totalPrompts: promptCount?.count || 0,
    totalEvaluations: evalCount?.count || 0,
    totalMembers: memberCount?.count || 0,
    totalApiKeys: apiKeyCount?.count || 0,
    apiUsageCount: Number(apiUsageResult?.total) || 0,
    recentActivity: {
      promptsCreatedThisWeek: recentPrompts?.count || 0,
      evaluationsRunThisWeek: recentEvals?.count || 0,
    },
  };
}

/**
 * Get top contributors in a workspace
 */
export async function getTopContributors(organizationId: string, limit: number = 5) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const contributors = await db
    .select({
      userId: prompts.userId,
      promptCount: count(prompts.id),
    })
    .from(prompts)
    .where(eq(prompts.organizationId, organizationId))
    .groupBy(prompts.userId)
    .orderBy(sql`COUNT(${prompts.id}) DESC`)
    .limit(limit);

  return contributors;
}

/**
 * Get workspace activity timeline (last 30 days)
 */
export async function getActivityTimeline(organizationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get daily prompt creation counts
  const promptActivity = await db
    .select({
      date: sql<string>`DATE(${prompts.createdAt})`,
      count: count(),
    })
    .from(prompts)
    .where(
      and(
        eq(prompts.organizationId, organizationId),
        sql`${prompts.createdAt} >= ${thirtyDaysAgo.toISOString()}`
      )
    )
    .groupBy(sql`DATE(${prompts.createdAt})`)
    .orderBy(sql`DATE(${prompts.createdAt})`);

  // Get daily evaluation counts
  const evalActivity = await db
    .select({
      date: sql<string>`DATE(${evaluations.createdAt})`,
      count: count(),
    })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.organizationId, organizationId),
        sql`${evaluations.createdAt} >= ${thirtyDaysAgo.toISOString()}`
      )
    )
    .groupBy(sql`DATE(${evaluations.createdAt})`)
    .orderBy(sql`DATE(${evaluations.createdAt})`);

  return {
    prompts: promptActivity,
    evaluations: evalActivity,
  };
}

/**
 * Get workspace growth metrics
 */
export async function getGrowthMetrics(organizationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Prompts growth
  const [lastMonthPrompts] = await db
    .select({ count: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.organizationId, organizationId),
        sql`${prompts.createdAt} >= ${lastMonth.toISOString()}`,
        sql`${prompts.createdAt} < ${thisMonth.toISOString()}`
      )
    );

  const [thisMonthPrompts] = await db
    .select({ count: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.organizationId, organizationId),
        sql`${prompts.createdAt} >= ${thisMonth.toISOString()}`
      )
    );

  const promptsGrowth =
    lastMonthPrompts?.count && lastMonthPrompts.count > 0
      ? ((thisMonthPrompts?.count || 0) - lastMonthPrompts.count) / lastMonthPrompts.count * 100
      : 0;

  // Evaluations growth
  const [lastMonthEvals] = await db
    .select({ count: count() })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.organizationId, organizationId),
        sql`${evaluations.createdAt} >= ${lastMonth.toISOString()}`,
        sql`${evaluations.createdAt} < ${thisMonth.toISOString()}`
      )
    );

  const [thisMonthEvals] = await db
    .select({ count: count() })
    .from(evaluations)
    .where(
      and(
        eq(evaluations.organizationId, organizationId),
        sql`${evaluations.createdAt} >= ${thisMonth.toISOString()}`
      )
    );

  const evalsGrowth =
    lastMonthEvals?.count && lastMonthEvals.count > 0
      ? ((thisMonthEvals?.count || 0) - lastMonthEvals.count) / lastMonthEvals.count * 100
      : 0;

  return {
    promptsGrowth: Math.round(promptsGrowth * 10) / 10,
    evaluationsGrowth: Math.round(evalsGrowth * 10) / 10,
    lastMonth: {
      prompts: lastMonthPrompts?.count || 0,
      evaluations: lastMonthEvals?.count || 0,
    },
    thisMonth: {
      prompts: thisMonthPrompts?.count || 0,
      evaluations: thisMonthEvals?.count || 0,
    },
  };
}

/**
 * Export Audit Log Service
 * Provides detailed audit trail for compliance
 */

import { eq, and, desc, sql, gte, lte, or, like } from "drizzle-orm";
import { getDb } from "../db";
import { exportAuditLog, exportAuditSettings } from "../../drizzle/importExport_schema";
import crypto from "crypto";

type AuditAction =
  | "export_created"
  | "export_downloaded"
  | "export_shared"
  | "export_share_accessed"
  | "export_share_downloaded"
  | "export_deleted"
  | "export_encrypted"
  | "export_decrypted"
  | "import_started"
  | "import_completed"
  | "import_failed"
  | "version_created"
  | "version_restored"
  | "version_compared"
  | "webhook_triggered"
  | "schedule_created"
  | "schedule_updated"
  | "schedule_deleted"
  | "schedule_triggered"
  | "template_used";

type ResourceType = "export" | "import" | "share" | "version" | "webhook" | "schedule" | "template";
type ActorType = "user" | "system" | "anonymous";

/**
 * Log an audit event
 */
export async function logAuditEvent(params: {
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  actorType?: ActorType;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  metadata?: {
    exportFileName?: string;
    promptCount?: number;
    fileSize?: number;
    shareCode?: string;
    versionNumber?: number;
    webhookUrl?: string;
    scheduleName?: string;
    templateName?: string;
    errorMessage?: string;
  };
}): Promise<{ id: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if logging is enabled for this action type
  if (params.userId) {
    const settings = await getAuditSettings({ userId: params.userId });
    if (settings) {
      const actionCategory = getActionCategory(params.action);
      if (!isLoggingEnabled(settings, actionCategory)) {
        return { id: "" }; // Skip logging if disabled
      }

      // Check IP/user agent logging preferences
      if (!settings.logIpAddresses) {
        params.ipAddress = undefined;
      }
      if (!settings.logUserAgents) {
        params.userAgent = undefined;
      }
    }
  }

  const id = crypto.randomUUID();

  await db.insert(exportAuditLog).values({
    id,
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    actorType: params.actorType || "user",
    actorId: params.actorId,
    actorName: params.actorName,
    actorEmail: params.actorEmail,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    requestId: params.requestId,
    details: params.details,
    metadata: params.metadata,
    createdAt: new Date(),
  });

  return { id };
}

/**
 * Get action category for settings check
 */
function getActionCategory(action: AuditAction): string {
  if (action.startsWith("export_")) return "exports";
  if (action.startsWith("import_")) return "imports";
  if (action.includes("share")) return "shares";
  if (action.startsWith("version_")) return "versions";
  if (action.startsWith("webhook_")) return "webhooks";
  if (action.startsWith("schedule_")) return "schedules";
  if (action.startsWith("template_")) return "templates";
  return "exports";
}

/**
 * Check if logging is enabled for a category
 */
function isLoggingEnabled(settings: typeof exportAuditSettings.$inferSelect, category: string): boolean {
  switch (category) {
    case "exports": return settings.logExports;
    case "imports": return settings.logImports;
    case "shares": return settings.logShares;
    case "versions": return settings.logVersions;
    case "webhooks": return settings.logWebhooks;
    case "schedules": return settings.logSchedules;
    default: return true;
  }
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogs(params: {
  userId: string;
  limit?: number;
  offset?: number;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}): Promise<{
  logs: Array<typeof exportAuditLog.$inferSelect>;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  const conditions = [eq(exportAuditLog.userId, params.userId)];

  if (params.action) {
    conditions.push(eq(exportAuditLog.action, params.action));
  }

  if (params.resourceType) {
    conditions.push(eq(exportAuditLog.resourceType, params.resourceType));
  }

  if (params.resourceId) {
    conditions.push(eq(exportAuditLog.resourceId, params.resourceId));
  }

  if (params.startDate) {
    conditions.push(gte(exportAuditLog.createdAt, params.startDate));
  }

  if (params.endDate) {
    conditions.push(lte(exportAuditLog.createdAt, params.endDate));
  }

  if (params.search) {
    conditions.push(
      or(
        like(exportAuditLog.actorName, `%${params.search}%`),
        like(exportAuditLog.actorEmail, `%${params.search}%`),
        like(exportAuditLog.ipAddress, `%${params.search}%`)
      ) || sql`1=1`
    );
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exportAuditLog)
    .where(and(...conditions));

  const logs = await db
    .select()
    .from(exportAuditLog)
    .where(and(...conditions))
    .orderBy(desc(exportAuditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    logs,
    total: countResult?.count || 0,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(params: {
  userId: string;
  days?: number;
}): Promise<{
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByResourceType: Record<string, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
  topActors: Array<{
    actorName: string | null;
    actorEmail: string | null;
    count: number;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const days = params.days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Total events
  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        gte(exportAuditLog.createdAt, startDate)
      )
    );

  // Events by action
  const actionStats = await db
    .select({
      action: exportAuditLog.action,
      count: sql<number>`COUNT(*)`,
    })
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        gte(exportAuditLog.createdAt, startDate)
      )
    )
    .groupBy(exportAuditLog.action);

  const eventsByAction: Record<string, number> = {};
  for (const stat of actionStats) {
    eventsByAction[stat.action] = stat.count;
  }

  // Events by resource type
  const resourceStats = await db
    .select({
      resourceType: exportAuditLog.resourceType,
      count: sql<number>`COUNT(*)`,
    })
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        gte(exportAuditLog.createdAt, startDate)
      )
    )
    .groupBy(exportAuditLog.resourceType);

  const eventsByResourceType: Record<string, number> = {};
  for (const stat of resourceStats) {
    eventsByResourceType[stat.resourceType] = stat.count;
  }

  // Recent activity by day
  const recentActivity = await db
    .select({
      date: sql<string>`DATE(${exportAuditLog.createdAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        gte(exportAuditLog.createdAt, startDate)
      )
    )
    .groupBy(sql`DATE(${exportAuditLog.createdAt})`)
    .orderBy(desc(sql`DATE(${exportAuditLog.createdAt})`))
    .limit(30);

  // Top actors
  const topActors = await db
    .select({
      actorName: exportAuditLog.actorName,
      actorEmail: exportAuditLog.actorEmail,
      count: sql<number>`COUNT(*)`,
    })
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        gte(exportAuditLog.createdAt, startDate)
      )
    )
    .groupBy(exportAuditLog.actorName, exportAuditLog.actorEmail)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);

  return {
    totalEvents: totalResult?.count || 0,
    eventsByAction,
    eventsByResourceType,
    recentActivity: recentActivity.map((r) => ({ date: r.date, count: r.count })),
    topActors,
  };
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(params: {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  format?: "json" | "csv";
}): Promise<{
  data: string;
  filename: string;
  contentType: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(exportAuditLog.userId, params.userId)];

  if (params.startDate) {
    conditions.push(gte(exportAuditLog.createdAt, params.startDate));
  }

  if (params.endDate) {
    conditions.push(lte(exportAuditLog.createdAt, params.endDate));
  }

  const logs = await db
    .select()
    .from(exportAuditLog)
    .where(and(...conditions))
    .orderBy(desc(exportAuditLog.createdAt));

  const format = params.format || "json";
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "csv") {
    const headers = [
      "ID",
      "Timestamp",
      "Action",
      "Resource Type",
      "Resource ID",
      "Actor Type",
      "Actor Name",
      "Actor Email",
      "IP Address",
      "User Agent",
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt?.toISOString() || "",
      log.action,
      log.resourceType,
      log.resourceId,
      log.actorType,
      log.actorName || "",
      log.actorEmail || "",
      log.ipAddress || "",
      (log.userAgent || "").replace(/,/g, ";"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return {
      data: csv,
      filename: `audit-log-${timestamp}.csv`,
      contentType: "text/csv",
    };
  } else {
    return {
      data: JSON.stringify(logs, null, 2),
      filename: `audit-log-${timestamp}.json`,
      contentType: "application/json",
    };
  }
}

/**
 * Get audit settings for a user
 */
export async function getAuditSettings(params: {
  userId: string;
}): Promise<typeof exportAuditSettings.$inferSelect | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [settings] = await db
    .select()
    .from(exportAuditSettings)
    .where(eq(exportAuditSettings.userId, params.userId))
    .limit(1);

  return settings || null;
}

/**
 * Update audit settings
 */
export async function updateAuditSettings(params: {
  userId: string;
  retentionDays?: number;
  logExports?: boolean;
  logImports?: boolean;
  logShares?: boolean;
  logVersions?: boolean;
  logWebhooks?: boolean;
  logSchedules?: boolean;
  logIpAddresses?: boolean;
  logUserAgents?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAuditSettings({ userId: params.userId });

  if (existing) {
    const updateData: Partial<typeof exportAuditSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (params.retentionDays !== undefined) updateData.retentionDays = params.retentionDays;
    if (params.logExports !== undefined) updateData.logExports = params.logExports;
    if (params.logImports !== undefined) updateData.logImports = params.logImports;
    if (params.logShares !== undefined) updateData.logShares = params.logShares;
    if (params.logVersions !== undefined) updateData.logVersions = params.logVersions;
    if (params.logWebhooks !== undefined) updateData.logWebhooks = params.logWebhooks;
    if (params.logSchedules !== undefined) updateData.logSchedules = params.logSchedules;
    if (params.logIpAddresses !== undefined) updateData.logIpAddresses = params.logIpAddresses;
    if (params.logUserAgents !== undefined) updateData.logUserAgents = params.logUserAgents;

    await db
      .update(exportAuditSettings)
      .set(updateData)
      .where(eq(exportAuditSettings.userId, params.userId));
  } else {
    await db.insert(exportAuditSettings).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      retentionDays: params.retentionDays ?? 90,
      logExports: params.logExports ?? true,
      logImports: params.logImports ?? true,
      logShares: params.logShares ?? true,
      logVersions: params.logVersions ?? true,
      logWebhooks: params.logWebhooks ?? true,
      logSchedules: params.logSchedules ?? true,
      logIpAddresses: params.logIpAddresses ?? true,
      logUserAgents: params.logUserAgents ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Clean up old audit logs based on retention settings
 */
export async function cleanupOldAuditLogs(params: {
  userId: string;
}): Promise<{ deletedCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getAuditSettings({ userId: params.userId });
  const retentionDays = settings?.retentionDays || 90;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.userId, params.userId),
        lte(exportAuditLog.createdAt, cutoffDate)
      )
    );

  return { deletedCount: 0 }; // MySQL doesn't return affected rows in drizzle delete
}

/**
 * Get a specific audit log entry
 */
export async function getAuditLogEntry(params: {
  id: string;
  userId: string;
}): Promise<typeof exportAuditLog.$inferSelect | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [entry] = await db
    .select()
    .from(exportAuditLog)
    .where(
      and(
        eq(exportAuditLog.id, params.id),
        eq(exportAuditLog.userId, params.userId)
      )
    )
    .limit(1);

  return entry || null;
}

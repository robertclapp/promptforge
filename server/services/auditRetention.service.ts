import { getDb } from "../db";
import { 
  auditLogs, 
  auditRetentionSettings, 
  archivedAuditLogs,
  organizations 
} from "../../drizzle/schema";
import { eq, and, lt, gte, desc, count, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Retention policy configuration
 */
export interface RetentionConfig {
  retentionDays: number;
  archiveBeforeDelete: boolean;
  lastCleanupAt: Date | null;
  lastCleanupCount: number;
}

const DEFAULT_CONFIG: RetentionConfig = {
  retentionDays: 90,
  archiveBeforeDelete: true,
  lastCleanupAt: null,
  lastCleanupCount: 0,
};

/**
 * Get retention settings for a workspace
 */
export async function getRetentionSettings(
  organizationId: string
): Promise<RetentionConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_CONFIG;

  try {
    const [settings] = await db
      .select()
      .from(auditRetentionSettings)
      .where(eq(auditRetentionSettings.organizationId, organizationId))
      .limit(1);

    if (!settings) return DEFAULT_CONFIG;

    return {
      retentionDays: settings.retentionDays,
      archiveBeforeDelete: settings.archiveBeforeDelete,
      lastCleanupAt: settings.lastCleanupAt,
      lastCleanupCount: settings.lastCleanupCount || 0,
    };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

/**
 * Update retention settings for a workspace
 */
export async function updateRetentionSettings(
  organizationId: string,
  config: Partial<RetentionConfig>
): Promise<RetentionConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentConfig = await getRetentionSettings(organizationId);
  const newConfig = { ...currentConfig, ...config };

  // Upsert settings
  await db
    .insert(auditRetentionSettings)
    .values({
      id: `${organizationId}-retention`,
      organizationId,
      retentionDays: newConfig.retentionDays,
      archiveBeforeDelete: newConfig.archiveBeforeDelete,
    })
    .onDuplicateKeyUpdate({
      set: {
        retentionDays: newConfig.retentionDays,
        archiveBeforeDelete: newConfig.archiveBeforeDelete,
      },
    });

  return newConfig;
}

/**
 * Get logs that are due for cleanup based on retention policy
 */
export async function getLogsForCleanup(
  organizationId: string,
  retentionDays: number,
  limit: number = 1000
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  if (retentionDays === 0) {
    // Keep forever
    return [];
  }

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        lt(auditLogs.createdAt, cutoffDate)
      )
    )
    .orderBy(auditLogs.createdAt)
    .limit(limit);
}

/**
 * Archive audit logs before deletion
 */
export async function archiveLogs(
  organizationId: string,
  logs: any[]
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (logs.length === 0) {
    throw new Error("No logs to archive");
  }

  const archiveId = uuidv4();
  const startDate = logs[0].createdAt;
  const endDate = logs[logs.length - 1].createdAt;

  // Create archive record
  await db.insert(archivedAuditLogs).values({
    id: archiveId,
    organizationId,
    startDate,
    endDate,
    logCount: logs.length,
    archivedData: logs,
  });

  return archiveId;
}

/**
 * Delete old audit logs
 */
export async function deleteLogs(
  organizationId: string,
  logIds: string[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (logIds.length === 0) return 0;

  // Delete in batches to avoid query size limits
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < logIds.length; i += batchSize) {
    const batch = logIds.slice(i, i + batchSize);
    await db
      .delete(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          sql`${auditLogs.id} IN (${sql.join(batch.map(id => sql`${id}`), sql`, `)})`
        )
      );
    deletedCount += batch.length;
  }

  return deletedCount;
}

/**
 * Run cleanup for a workspace
 */
export async function runCleanup(
  organizationId: string
): Promise<{
  archived: number;
  deleted: number;
  archiveId?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getRetentionSettings(organizationId);
  
  if (settings.retentionDays === 0) {
    return { archived: 0, deleted: 0 };
  }

  // Get logs for cleanup
  const logsToCleanup = await getLogsForCleanup(
    organizationId,
    settings.retentionDays
  );

  if (logsToCleanup.length === 0) {
    return { archived: 0, deleted: 0 };
  }

  let archiveId: string | undefined;

  // Archive if enabled
  if (settings.archiveBeforeDelete) {
    archiveId = await archiveLogs(organizationId, logsToCleanup);
  }

  // Delete logs
  const logIds = logsToCleanup.map((log) => log.id);
  const deletedCount = await deleteLogs(organizationId, logIds);

  // Update last cleanup timestamp
  await db
    .update(auditRetentionSettings)
    .set({
      lastCleanupAt: new Date(),
      lastCleanupCount: deletedCount,
    })
    .where(eq(auditRetentionSettings.organizationId, organizationId));

  return {
    archived: settings.archiveBeforeDelete ? logsToCleanup.length : 0,
    deleted: deletedCount,
    archiveId,
  };
}

/**
 * Run cleanup for all workspaces (scheduled job)
 */
export async function runGlobalCleanup(): Promise<{
  workspacesProcessed: number;
  totalArchived: number;
  totalDeleted: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all organizations
  const orgs = await db.select({ id: organizations.id }).from(organizations);

  let totalArchived = 0;
  let totalDeleted = 0;

  for (const org of orgs) {
    try {
      const result = await runCleanup(org.id);
      totalArchived += result.archived;
      totalDeleted += result.deleted;
    } catch (error) {
      console.error(`Failed to run cleanup for org ${org.id}:`, error);
    }
  }

  return {
    workspacesProcessed: orgs.length,
    totalArchived,
    totalDeleted,
  };
}

/**
 * Get archived audit logs for a workspace
 */
export async function getArchivedLogs(
  organizationId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  archives: any[];
  total: number;
}> {
  const db = await getDb();
  if (!db) return { archives: [], total: 0 };

  const [archives, totalResult] = await Promise.all([
    db
      .select({
        id: archivedAuditLogs.id,
        archiveDate: archivedAuditLogs.archiveDate,
        startDate: archivedAuditLogs.startDate,
        endDate: archivedAuditLogs.endDate,
        logCount: archivedAuditLogs.logCount,
        createdAt: archivedAuditLogs.createdAt,
      })
      .from(archivedAuditLogs)
      .where(eq(archivedAuditLogs.organizationId, organizationId))
      .orderBy(desc(archivedAuditLogs.archiveDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(archivedAuditLogs)
      .where(eq(archivedAuditLogs.organizationId, organizationId)),
  ]);

  return {
    archives,
    total: totalResult[0]?.count || 0,
  };
}

/**
 * Get a specific archive with its data
 */
export async function getArchiveById(
  organizationId: string,
  archiveId: string
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const [archive] = await db
    .select()
    .from(archivedAuditLogs)
    .where(
      and(
        eq(archivedAuditLogs.organizationId, organizationId),
        eq(archivedAuditLogs.id, archiveId)
      )
    )
    .limit(1);

  return archive || null;
}

/**
 * Delete an archive
 */
export async function deleteArchive(
  organizationId: string,
  archiveId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(archivedAuditLogs)
    .where(
      and(
        eq(archivedAuditLogs.organizationId, organizationId),
        eq(archivedAuditLogs.id, archiveId)
      )
    );

  return true;
}

/**
 * Get retention statistics
 */
export async function getRetentionStats(
  organizationId: string
): Promise<{
  totalLogs: number;
  logsOlderThan30Days: number;
  logsOlderThan60Days: number;
  logsOlderThan90Days: number;
  totalArchives: number;
  totalArchivedLogs: number;
  estimatedCleanupCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalLogs: 0,
      logsOlderThan30Days: 0,
      logsOlderThan60Days: 0,
      logsOlderThan90Days: 0,
      totalArchives: 0,
      totalArchivedLogs: 0,
      estimatedCleanupCount: 0,
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const settings = await getRetentionSettings(organizationId);
  const cutoffDate = settings.retentionDays > 0
    ? new Date(now.getTime() - settings.retentionDays * 24 * 60 * 60 * 1000)
    : null;

  const [
    totalResult,
    older30Result,
    older60Result,
    older90Result,
    archivesResult,
    archivedLogsResult,
    cleanupResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(auditLogs).where(eq(auditLogs.organizationId, organizationId)),
    db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.organizationId, organizationId), lt(auditLogs.createdAt, thirtyDaysAgo))),
    db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.organizationId, organizationId), lt(auditLogs.createdAt, sixtyDaysAgo))),
    db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.organizationId, organizationId), lt(auditLogs.createdAt, ninetyDaysAgo))),
    db.select({ count: count() }).from(archivedAuditLogs).where(eq(archivedAuditLogs.organizationId, organizationId)),
    db.select({ total: sql<number>`SUM(${archivedAuditLogs.logCount})` }).from(archivedAuditLogs).where(eq(archivedAuditLogs.organizationId, organizationId)),
    cutoffDate
      ? db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.organizationId, organizationId), lt(auditLogs.createdAt, cutoffDate)))
      : Promise.resolve([{ count: 0 }]),
  ]);

  return {
    totalLogs: totalResult[0]?.count || 0,
    logsOlderThan30Days: older30Result[0]?.count || 0,
    logsOlderThan60Days: older60Result[0]?.count || 0,
    logsOlderThan90Days: older90Result[0]?.count || 0,
    totalArchives: archivesResult[0]?.count || 0,
    totalArchivedLogs: archivedLogsResult[0]?.total || 0,
    estimatedCleanupCount: cleanupResult[0]?.count || 0,
  };
}

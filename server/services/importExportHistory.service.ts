/**
 * Import/Export History Service
 * Tracks all import and export operations
 */

import { getDb } from "../db";
import { importExportHistory } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Create a history entry for an export operation
 */
export async function createExportHistoryEntry(params: {
  userId: string;
  organizationId?: string;
  scheduleId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  
  await db.insert(importExportHistory).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    operationType: "export",
    status: "processing",
    scheduleId: params.scheduleId,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  
  return id;
}

/**
 * Update export history entry with success
 */
export async function updateExportHistorySuccess(
  id: string,
  data: {
    url: string;
    filename: string;
    size: number;
    promptCount: number;
    versionCount: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(importExportHistory)
    .set({
      status: "completed",
      exportUrl: data.url,
      exportFileName: data.filename,
      exportFileSize: data.size,
      exportPromptCount: data.promptCount,
      exportVersionCount: data.versionCount,
      completedAt: new Date(),
    })
    .where(eq(importExportHistory.id, id));
}

/**
 * Update export history entry with failure
 */
export async function updateExportHistoryFailure(id: string, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(importExportHistory)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    })
    .where(eq(importExportHistory.id, id));
}

/**
 * Create a history entry for an import operation
 */
export async function createImportHistoryEntry(params: {
  userId: string;
  organizationId?: string;
  fileName: string;
  fileSize: number;
  overwriteExisting: boolean;
  prefix?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  
  await db.insert(importExportHistory).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    operationType: "import",
    status: "processing",
    importFileName: params.fileName,
    importFileSize: params.fileSize,
    overwriteExisting: params.overwriteExisting,
    importPrefix: params.prefix,
    startedAt: new Date(),
  });
  
  return id;
}

/**
 * Update import history entry with success
 */
export async function updateImportHistorySuccess(
  id: string,
  data: {
    importedCount: number;
    skippedCount: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(importExportHistory)
    .set({
      status: "completed",
      importedCount: data.importedCount,
      skippedCount: data.skippedCount,
      completedAt: new Date(),
    })
    .where(eq(importExportHistory.id, id));
}

/**
 * Update import history entry with failure
 */
export async function updateImportHistoryFailure(
  id: string,
  errorMessage: string,
  errorDetails?: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(importExportHistory)
    .set({
      status: "failed",
      errorMessage,
      errorDetails,
      completedAt: new Date(),
    })
    .where(eq(importExportHistory.id, id));
}

/**
 * Get import/export history for a user
 */
export async function getUserHistory(
  userId: string,
  options?: {
    organizationId?: string;
    operationType?: "export" | "import";
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let conditions = eq(importExportHistory.userId, userId);
  
  if (options?.organizationId) {
    conditions = and(conditions, eq(importExportHistory.organizationId, options.organizationId))!;
  }
  
  if (options?.operationType) {
    conditions = and(conditions, eq(importExportHistory.operationType, options.operationType))!;
  }
  
  const results = await db
    .select()
    .from(importExportHistory)
    .where(conditions)
    .orderBy(desc(importExportHistory.startedAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);
  
  return results;
}

/**
 * Get a single history entry by ID
 */
export async function getHistoryEntry(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(importExportHistory)
    .where(and(eq(importExportHistory.id, id), eq(importExportHistory.userId, userId)));
  
  return results[0] || null;
}

/**
 * Get history statistics for a user
 */
export async function getHistoryStats(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let conditions = eq(importExportHistory.userId, userId);
  if (organizationId) {
    conditions = and(conditions, eq(importExportHistory.organizationId, organizationId))!;
  }
  
  const results = await db
    .select({
      operationType: importExportHistory.operationType,
      status: importExportHistory.status,
      count: sql<number>`count(*)`,
    })
    .from(importExportHistory)
    .where(conditions)
    .groupBy(importExportHistory.operationType, importExportHistory.status);
  
  // Aggregate results
  const stats = {
    exports: { total: 0, completed: 0, failed: 0 },
    imports: { total: 0, completed: 0, failed: 0 },
  };
  
  for (const row of results) {
    const type = row.operationType === "export" ? "exports" : "imports";
    stats[type].total += Number(row.count);
    if (row.status === "completed") {
      stats[type].completed += Number(row.count);
    } else if (row.status === "failed") {
      stats[type].failed += Number(row.count);
    }
  }
  
  return stats;
}

/**
 * Delete old history entries (cleanup)
 */
export async function cleanupOldHistory(daysToKeep: number = 90) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  await db
    .delete(importExportHistory)
    .where(sql`${importExportHistory.completedAt} < ${cutoffDate}`);
  
  return { success: true };
}

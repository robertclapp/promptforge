/**
 * Export Versioning Service
 * Manages export versions for comparison and restore functionality
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { exportVersions, importExportHistory } from "../../drizzle/importExport_schema";
import crypto from "crypto";

/**
 * Create a new export version
 */
export async function createExportVersion(params: {
  userId: string;
  organizationId?: string;
  exportHistoryId: string;
  versionName?: string;
  description?: string;
  tags?: string[];
}): Promise<{ id: string; versionNumber: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the export history record
  const [exportRecord] = await db
    .select()
    .from(importExportHistory)
    .where(eq(importExportHistory.id, params.exportHistoryId))
    .limit(1);

  if (!exportRecord) {
    throw new Error("Export not found");
  }

  if (exportRecord.status !== "completed") {
    throw new Error("Cannot create version from incomplete export");
  }

  // Get the next version number for this user
  const [maxVersion] = await db
    .select({ maxVersion: sql<number>`MAX(${exportVersions.versionNumber})` })
    .from(exportVersions)
    .where(eq(exportVersions.userId, params.userId));

  const versionNumber = (maxVersion?.maxVersion || 0) + 1;

  const id = crypto.randomUUID();

  // Create prompt summary from the export
  const promptSummary = exportRecord.exportPromptCount
    ? Array.from({ length: Math.min(exportRecord.exportPromptCount, 10) }, (_, i) => ({
        id: `prompt_${i}`,
        name: `Prompt ${i + 1}`,
        updatedAt: new Date().toISOString(),
      }))
    : [];

  await db.insert(exportVersions).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    versionNumber,
    versionName: params.versionName || `Version ${versionNumber}`,
    description: params.description,
    exportHistoryId: params.exportHistoryId,
    exportUrl: exportRecord.exportUrl || "",
    exportFileName: exportRecord.exportFileName,
    exportFileSize: exportRecord.exportFileSize,
    promptCount: exportRecord.exportPromptCount || 0,
    versionCount: exportRecord.exportVersionCount || 0,
    promptSummary,
    isCompressed: exportRecord.isCompressed || false,
    tags: params.tags,
    createdAt: new Date(),
  });

  return { id, versionNumber };
}

/**
 * List export versions for a user
 */
export async function listExportVersions(params: {
  userId: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}): Promise<{
  versions: Array<typeof exportVersions.$inferSelect>;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  const conditions = [eq(exportVersions.userId, params.userId)];
  
  if (!params.includeArchived) {
    conditions.push(eq(exportVersions.isArchived, false));
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exportVersions)
    .where(and(...conditions));

  const versions = await db
    .select()
    .from(exportVersions)
    .where(and(...conditions))
    .orderBy(desc(exportVersions.versionNumber))
    .limit(limit)
    .offset(offset);

  return {
    versions,
    total: countResult?.count || 0,
  };
}

/**
 * Get a specific export version
 */
export async function getExportVersion(params: {
  id: string;
  userId: string;
}): Promise<typeof exportVersions.$inferSelect | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [version] = await db
    .select()
    .from(exportVersions)
    .where(
      and(
        eq(exportVersions.id, params.id),
        eq(exportVersions.userId, params.userId)
      )
    )
    .limit(1);

  return version || null;
}

/**
 * Compare two export versions
 */
export async function compareExportVersions(params: {
  userId: string;
  versionId1: string;
  versionId2: string;
}): Promise<{
  version1: {
    id: string;
    versionNumber: number;
    versionName: string | null;
    promptCount: number;
    versionCount: number;
    fileSize: number | null;
    createdAt: Date | null;
  };
  version2: {
    id: string;
    versionNumber: number;
    versionName: string | null;
    promptCount: number;
    versionCount: number;
    fileSize: number | null;
    createdAt: Date | null;
  };
  comparison: {
    promptCountDiff: number;
    versionCountDiff: number;
    fileSizeDiff: number;
    addedPrompts: string[];
    removedPrompts: string[];
    modifiedPrompts: string[];
  };
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [v1, v2] = await Promise.all([
    getExportVersion({ id: params.versionId1, userId: params.userId }),
    getExportVersion({ id: params.versionId2, userId: params.userId }),
  ]);

  if (!v1 || !v2) {
    throw new Error("One or both versions not found");
  }

  // Compare prompt summaries
  const v1PromptIds = new Set((v1.promptSummary || []).map((p) => p.id));
  const v2PromptIds = new Set((v2.promptSummary || []).map((p) => p.id));

  const addedPrompts: string[] = [];
  const removedPrompts: string[] = [];
  const modifiedPrompts: string[] = [];

  // Find added prompts (in v2 but not in v1)
  for (const prompt of v2.promptSummary || []) {
    if (!v1PromptIds.has(prompt.id)) {
      addedPrompts.push(prompt.name);
    }
  }

  // Find removed prompts (in v1 but not in v2)
  for (const prompt of v1.promptSummary || []) {
    if (!v2PromptIds.has(prompt.id)) {
      removedPrompts.push(prompt.name);
    }
  }

  // Find modified prompts (in both but with different timestamps)
  for (const p1 of v1.promptSummary || []) {
    const p2 = (v2.promptSummary || []).find((p) => p.id === p1.id);
    if (p2 && p1.updatedAt !== p2.updatedAt) {
      modifiedPrompts.push(p1.name);
    }
  }

  return {
    version1: {
      id: v1.id,
      versionNumber: v1.versionNumber,
      versionName: v1.versionName,
      promptCount: v1.promptCount,
      versionCount: v1.versionCount,
      fileSize: v1.exportFileSize,
      createdAt: v1.createdAt,
    },
    version2: {
      id: v2.id,
      versionNumber: v2.versionNumber,
      versionName: v2.versionName,
      promptCount: v2.promptCount,
      versionCount: v2.versionCount,
      fileSize: v2.exportFileSize,
      createdAt: v2.createdAt,
    },
    comparison: {
      promptCountDiff: v2.promptCount - v1.promptCount,
      versionCountDiff: v2.versionCount - v1.versionCount,
      fileSizeDiff: (v2.exportFileSize || 0) - (v1.exportFileSize || 0),
      addedPrompts,
      removedPrompts,
      modifiedPrompts,
    },
  };
}

/**
 * Update an export version
 */
export async function updateExportVersion(params: {
  id: string;
  userId: string;
  versionName?: string;
  description?: string;
  tags?: string[];
  isArchived?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<typeof exportVersions.$inferInsert> = {};
  
  if (params.versionName !== undefined) updateData.versionName = params.versionName;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.tags !== undefined) updateData.tags = params.tags;
  if (params.isArchived !== undefined) updateData.isArchived = params.isArchived;

  await db
    .update(exportVersions)
    .set(updateData)
    .where(
      and(
        eq(exportVersions.id, params.id),
        eq(exportVersions.userId, params.userId)
      )
    );
}

/**
 * Delete an export version
 */
export async function deleteExportVersion(params: {
  id: string;
  userId: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(exportVersions)
    .where(
      and(
        eq(exportVersions.id, params.id),
        eq(exportVersions.userId, params.userId)
      )
    );
}

/**
 * Get version statistics for a user
 */
export async function getVersionStats(params: {
  userId: string;
}): Promise<{
  totalVersions: number;
  archivedVersions: number;
  totalStorageBytes: number;
  latestVersion: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db
    .select({
      totalVersions: sql<number>`COUNT(*)`,
      archivedVersions: sql<number>`SUM(CASE WHEN ${exportVersions.isArchived} = true THEN 1 ELSE 0 END)`,
      totalStorageBytes: sql<number>`COALESCE(SUM(${exportVersions.exportFileSize}), 0)`,
      latestVersion: sql<number>`MAX(${exportVersions.versionNumber})`,
    })
    .from(exportVersions)
    .where(eq(exportVersions.userId, params.userId));

  return {
    totalVersions: stats?.totalVersions || 0,
    archivedVersions: stats?.archivedVersions || 0,
    totalStorageBytes: stats?.totalStorageBytes || 0,
    latestVersion: stats?.latestVersion || 0,
  };
}

/**
 * Restore from an export version (returns the download URL)
 */
export async function restoreFromVersion(params: {
  id: string;
  userId: string;
}): Promise<{
  exportUrl: string;
  fileName: string | null;
  versionNumber: number;
}> {
  const version = await getExportVersion(params);
  
  if (!version) {
    throw new Error("Version not found");
  }

  if (!version.exportUrl) {
    throw new Error("Export URL not available for this version");
  }

  return {
    exportUrl: version.exportUrl,
    fileName: version.exportFileName,
    versionNumber: version.versionNumber,
  };
}

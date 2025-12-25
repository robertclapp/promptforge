/**
 * Version Cleanup Service
 * Manages automatic deletion of old export versions based on retention policies
 */

import { eq, and, desc, lt, sql, asc } from "drizzle-orm";
import { getDb } from "../db";
import {
  versionRetentionSettings,
  versionCleanupHistory,
  exportVersions,
} from "../../drizzle/importExport_schema";
import crypto from "crypto";

/**
 * Get retention settings for a user
 */
export async function getRetentionSettings(userId: string): Promise<{
  id: string;
  enabled: boolean;
  maxVersionsPerExport: number | null;
  maxAgeDays: number | null;
  minVersionsToKeep: number;
  maxTotalSizeMb: number | null;
  archiveBeforeDelete: boolean;
  archiveLocation: string | null;
  cleanupFrequency: "daily" | "weekly" | "monthly";
  lastCleanupAt: Date | null;
  nextCleanupAt: Date | null;
  totalVersionsDeleted: number;
  totalSpaceFreedMb: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [settings] = await db
    .select()
    .from(versionRetentionSettings)
    .where(eq(versionRetentionSettings.userId, userId))
    .limit(1);

  return settings || null;
}

/**
 * Create or update retention settings
 */
export async function upsertRetentionSettings(params: {
  userId: string;
  organizationId?: string;
  enabled?: boolean;
  maxVersionsPerExport?: number | null;
  maxAgeDays?: number | null;
  minVersionsToKeep?: number;
  maxTotalSizeMb?: number | null;
  archiveBeforeDelete?: boolean;
  archiveLocation?: string | null;
  cleanupFrequency?: "daily" | "weekly" | "monthly";
}): Promise<{ id: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getRetentionSettings(params.userId);

  if (existing) {
    // Update existing settings
    await db
      .update(versionRetentionSettings)
      .set({
        enabled: params.enabled ?? existing.enabled,
        maxVersionsPerExport: params.maxVersionsPerExport !== undefined ? params.maxVersionsPerExport : existing.maxVersionsPerExport,
        maxAgeDays: params.maxAgeDays !== undefined ? params.maxAgeDays : existing.maxAgeDays,
        minVersionsToKeep: params.minVersionsToKeep ?? existing.minVersionsToKeep,
        maxTotalSizeMb: params.maxTotalSizeMb !== undefined ? params.maxTotalSizeMb : existing.maxTotalSizeMb,
        archiveBeforeDelete: params.archiveBeforeDelete ?? existing.archiveBeforeDelete,
        archiveLocation: params.archiveLocation !== undefined ? params.archiveLocation : existing.archiveLocation,
        cleanupFrequency: params.cleanupFrequency ?? existing.cleanupFrequency,
        nextCleanupAt: calculateNextCleanup(params.cleanupFrequency ?? existing.cleanupFrequency),
      })
      .where(eq(versionRetentionSettings.id, existing.id));

    return { id: existing.id };
  } else {
    // Create new settings
    const id = crypto.randomUUID();
    const cleanupFrequency = params.cleanupFrequency || "weekly";

    await db.insert(versionRetentionSettings).values({
      id,
      userId: params.userId,
      organizationId: params.organizationId,
      enabled: params.enabled ?? false,
      maxVersionsPerExport: params.maxVersionsPerExport ?? 10,
      maxAgeDays: params.maxAgeDays ?? 90,
      minVersionsToKeep: params.minVersionsToKeep ?? 1,
      maxTotalSizeMb: params.maxTotalSizeMb,
      archiveBeforeDelete: params.archiveBeforeDelete ?? false,
      archiveLocation: params.archiveLocation,
      cleanupFrequency,
      nextCleanupAt: calculateNextCleanup(cleanupFrequency),
    });

    return { id };
  }
}

/**
 * Calculate the next cleanup time based on frequency
 */
function calculateNextCleanup(frequency: "daily" | "weekly" | "monthly"): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0); // 2 AM
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(2, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(2, 0, 0, 0);
      break;
  }

  return next;
}

/**
 * Run cleanup for a specific user
 */
export async function runCleanup(userId: string): Promise<{
  versionsDeleted: number;
  spaceFreedBytes: number;
  archivedVersions: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getRetentionSettings(userId);
  if (!settings || !settings.enabled) {
    return {
      versionsDeleted: 0,
      spaceFreedBytes: 0,
      archivedVersions: 0,
      status: "success",
    };
  }

  const startedAt = new Date();
  let versionsDeleted = 0;
  let spaceFreedBytes = 0;
  let archivedVersions = 0;
  let errorMessage: string | undefined;
  let status: "success" | "partial" | "failed" = "success";

  try {
    // Get all versions for this user
    const allVersions = await db
      .select()
      .from(exportVersions)
      .where(eq(exportVersions.userId, userId))
      .orderBy(desc(exportVersions.createdAt));

    // Group versions by export name/type for per-export limits
    const versionsByExport = new Map<string, typeof allVersions>();
    for (const version of allVersions) {
      const key = version.versionName || "default";
      if (!versionsByExport.has(key)) {
        versionsByExport.set(key, []);
      }
      versionsByExport.get(key)!.push(version);
    }

    const versionsToDelete: string[] = [];

    // Apply max versions per export rule
    if (settings.maxVersionsPerExport) {
      for (const [, versions] of Array.from(versionsByExport.entries())) {
        if (versions.length > settings.maxVersionsPerExport) {
          // Keep the minimum required versions
          const toKeep = Math.max(settings.minVersionsToKeep, settings.maxVersionsPerExport);
          const excess = versions.slice(toKeep);
          for (const v of excess) {
            if (!versionsToDelete.includes(v.id)) {
              versionsToDelete.push(v.id);
              spaceFreedBytes += v.exportFileSize || 0;
            }
          }
        }
      }
    }

    // Apply max age rule
    if (settings.maxAgeDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.maxAgeDays);

      for (const version of allVersions) {
        if (version.createdAt && new Date(version.createdAt) < cutoffDate) {
          // Check if we'd still have minimum versions
          const key = version.versionName || "default";
          const groupVersions = versionsByExport.get(key) || [];
          const remainingInGroup = groupVersions.filter(
            (v) => !versionsToDelete.includes(v.id) && v.id !== version.id
          ).length;

          if (remainingInGroup >= settings.minVersionsToKeep) {
            if (!versionsToDelete.includes(version.id)) {
              versionsToDelete.push(version.id);
              spaceFreedBytes += version.exportFileSize || 0;
            }
          }
        }
      }
    }

    // Apply total size limit
    if (settings.maxTotalSizeMb) {
      const maxBytes = settings.maxTotalSizeMb * 1024 * 1024;
      let currentTotal = allVersions.reduce((sum, v) => sum + (v.exportFileSize || 0), 0);
      currentTotal -= spaceFreedBytes; // Account for already marked deletions

      if (currentTotal > maxBytes) {
        // Delete oldest versions first until under limit
        const sortedByAge = [...allVersions]
          .filter((v) => !versionsToDelete.includes(v.id))
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });

        for (const version of sortedByAge) {
          if (currentTotal <= maxBytes) break;

          // Check minimum versions constraint
          const key = version.versionName || "default";
          const groupVersions = versionsByExport.get(key) || [];
          const remainingInGroup = groupVersions.filter(
            (v) => !versionsToDelete.includes(v.id) && v.id !== version.id
          ).length;

          if (remainingInGroup >= settings.minVersionsToKeep) {
            versionsToDelete.push(version.id);
            spaceFreedBytes += version.exportFileSize || 0;
            currentTotal -= version.exportFileSize || 0;
          }
        }
      }
    }

    // Delete the versions
    if (versionsToDelete.length > 0) {
      for (const versionId of versionsToDelete) {
        await db
          .delete(exportVersions)
          .where(eq(exportVersions.id, versionId));
        versionsDeleted++;
      }
    }

    // Update settings with cleanup stats
    await db
      .update(versionRetentionSettings)
      .set({
        lastCleanupAt: new Date(),
        nextCleanupAt: calculateNextCleanup(settings.cleanupFrequency),
        totalVersionsDeleted: sql`${versionRetentionSettings.totalVersionsDeleted} + ${versionsDeleted}`,
        totalSpaceFreedMb: sql`${versionRetentionSettings.totalSpaceFreedMb} + ${Math.round(spaceFreedBytes / (1024 * 1024))}`,
      })
      .where(eq(versionRetentionSettings.id, settings.id));

  } catch (error) {
    status = versionsDeleted > 0 ? "partial" : "failed";
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  // Record cleanup history
  const historyId = crypto.randomUUID();
  await db.insert(versionCleanupHistory).values({
    id: historyId,
    userId,
    versionsDeleted,
    spaceFreedBytes,
    archivedVersions,
    criteria: {
      maxVersions: settings.maxVersionsPerExport ?? undefined,
      maxAgeDays: settings.maxAgeDays ?? undefined,
      maxTotalSizeMb: settings.maxTotalSizeMb ?? undefined,
    },
    status,
    errorMessage,
    startedAt,
    completedAt: new Date(),
  });

  return {
    versionsDeleted,
    spaceFreedBytes,
    archivedVersions,
    status,
    errorMessage,
  };
}

/**
 * Get cleanup history for a user
 */
export async function getCleanupHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  items: Array<{
    id: string;
    versionsDeleted: number;
    spaceFreedBytes: number;
    archivedVersions: number;
    criteria: { maxVersions?: number; maxAgeDays?: number; maxTotalSizeMb?: number } | null;
    status: "success" | "partial" | "failed";
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
    createdAt: Date | null;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const items = await db
    .select()
    .from(versionCleanupHistory)
    .where(eq(versionCleanupHistory.userId, userId))
    .orderBy(desc(versionCleanupHistory.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(versionCleanupHistory)
    .where(eq(versionCleanupHistory.userId, userId));

  return {
    items,
    total: countResult?.count || 0,
  };
}

/**
 * Get cleanup statistics for a user
 */
export async function getCleanupStats(userId: string): Promise<{
  totalCleanups: number;
  totalVersionsDeleted: number;
  totalSpaceFreedMb: number;
  lastCleanupAt: Date | null;
  nextCleanupAt: Date | null;
  averageVersionsPerCleanup: number;
  successRate: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalCleanups: 0,
      totalVersionsDeleted: 0,
      totalSpaceFreedMb: 0,
      lastCleanupAt: null,
      nextCleanupAt: null,
      averageVersionsPerCleanup: 0,
      successRate: 0,
    };
  }

  const settings = await getRetentionSettings(userId);

  const [stats] = await db
    .select({
      totalCleanups: sql<number>`count(*)`,
      totalVersionsDeleted: sql<number>`COALESCE(SUM(${versionCleanupHistory.versionsDeleted}), 0)`,
      totalSpaceFreedBytes: sql<number>`COALESCE(SUM(${versionCleanupHistory.spaceFreedBytes}), 0)`,
      successCount: sql<number>`SUM(CASE WHEN ${versionCleanupHistory.status} = 'success' THEN 1 ELSE 0 END)`,
    })
    .from(versionCleanupHistory)
    .where(eq(versionCleanupHistory.userId, userId));

  const totalCleanups = stats?.totalCleanups || 0;
  const totalVersionsDeleted = stats?.totalVersionsDeleted || 0;
  const totalSpaceFreedMb = Math.round((stats?.totalSpaceFreedBytes || 0) / (1024 * 1024));
  const successCount = stats?.successCount || 0;

  return {
    totalCleanups,
    totalVersionsDeleted,
    totalSpaceFreedMb,
    lastCleanupAt: settings?.lastCleanupAt || null,
    nextCleanupAt: settings?.nextCleanupAt || null,
    averageVersionsPerCleanup: totalCleanups > 0 ? Math.round(totalVersionsDeleted / totalCleanups) : 0,
    successRate: totalCleanups > 0 ? Math.round((successCount / totalCleanups) * 100) : 100,
  };
}

/**
 * Preview what would be deleted with current settings
 */
export async function previewCleanup(userId: string): Promise<{
  versionsToDelete: number;
  spaceToFreeBytes: number;
  versionDetails: Array<{
    id: string;
    versionName: string | null;
    versionNumber: number;
    exportFileSize: number | null;
    createdAt: Date | null;
    reason: string;
  }>;
}> {
  const db = await getDb();
  if (!db) return { versionsToDelete: 0, spaceToFreeBytes: 0, versionDetails: [] };

  const settings = await getRetentionSettings(userId);
  if (!settings || !settings.enabled) {
    return { versionsToDelete: 0, spaceToFreeBytes: 0, versionDetails: [] };
  }

  const allVersions = await db
    .select()
    .from(exportVersions)
    .where(eq(exportVersions.userId, userId))
    .orderBy(desc(exportVersions.createdAt));

  const versionsByExport = new Map<string, typeof allVersions>();
  for (const version of allVersions) {
    const key = version.versionName || "default";
    if (!versionsByExport.has(key)) {
      versionsByExport.set(key, []);
    }
    versionsByExport.get(key)!.push(version);
  }

  const versionDetails: Array<{
    id: string;
    versionName: string | null;
    versionNumber: number;
    exportFileSize: number | null;
    createdAt: Date | null;
    reason: string;
  }> = [];

  const markedIds = new Set<string>();

  // Check max versions per export
  if (settings.maxVersionsPerExport) {
    for (const [, versions] of Array.from(versionsByExport.entries())) {
      if (versions.length > settings.maxVersionsPerExport) {
        const toKeep = Math.max(settings.minVersionsToKeep, settings.maxVersionsPerExport);
        const excess = versions.slice(toKeep);
        for (const v of excess) {
          if (!markedIds.has(v.id)) {
            markedIds.add(v.id);
            versionDetails.push({
              id: v.id,
              versionName: v.versionName,
              versionNumber: v.versionNumber,
              exportFileSize: v.exportFileSize,
              createdAt: v.createdAt,
              reason: `Exceeds max ${settings.maxVersionsPerExport} versions per export`,
            });
          }
        }
      }
    }
  }

  // Check max age
  if (settings.maxAgeDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.maxAgeDays);

    for (const version of allVersions) {
      if (version.createdAt && new Date(version.createdAt) < cutoffDate && !markedIds.has(version.id)) {
        const key = version.versionName || "default";
        const groupVersions = versionsByExport.get(key) || [];
        const remainingInGroup = groupVersions.filter(
          (v) => !markedIds.has(v.id) && v.id !== version.id
        ).length;

        if (remainingInGroup >= settings.minVersionsToKeep) {
          markedIds.add(version.id);
          versionDetails.push({
            id: version.id,
            versionName: version.versionName,
            versionNumber: version.versionNumber,
            exportFileSize: version.exportFileSize,
            createdAt: version.createdAt,
            reason: `Older than ${settings.maxAgeDays} days`,
          });
        }
      }
    }
  }

  const spaceToFreeBytes = versionDetails.reduce((sum, v) => sum + (v.exportFileSize || 0), 0);

  return {
    versionsToDelete: versionDetails.length,
    spaceToFreeBytes,
    versionDetails,
  };
}

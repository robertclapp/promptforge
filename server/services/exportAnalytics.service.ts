/**
 * Export Analytics Service
 * Provides analytics and statistics for export operations
 */

import { getDb } from "../db";
import { importExportHistory, exportSchedules, exportTemplates } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";

export interface ExportFrequencyData {
  date: string;
  exports: number;
  imports: number;
}

export interface FileSizeTrendData {
  date: string;
  averageSize: number;
  totalSize: number;
  count: number;
}

export interface TemplateUsageData {
  templateId: string;
  templateName: string;
  usageCount: number;
  lastUsed: Date | null;
}

export interface ExportTypeBreakdown {
  manual: number;
  scheduled: number;
  total: number;
}

export interface AnalyticsSummary {
  totalExports: number;
  totalImports: number;
  totalDataExported: number; // in bytes
  averageFileSize: number;
  successRate: number;
  activeSchedules: number;
  totalTemplates: number;
}

/**
 * Get export/import frequency over time
 */
export async function getExportFrequency(
  userId: string,
  organizationId?: string,
  days: number = 30
): Promise<ExportFrequencyData[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Build conditions
  const conditions = organizationId
    ? and(
        eq(importExportHistory.organizationId, organizationId),
        gte(importExportHistory.startedAt, startDate)
      )
    : and(
        eq(importExportHistory.userId, userId),
        gte(importExportHistory.startedAt, startDate)
      );

  const history = await db
    .select()
    .from(importExportHistory)
    .where(conditions)
    .orderBy(importExportHistory.startedAt);

  // Group by date
  const frequencyMap = new Map<string, { exports: number; imports: number }>();
  
  // Initialize all dates in range
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    frequencyMap.set(dateStr, { exports: 0, imports: 0 });
  }

  // Count operations by date
  for (const record of history) {
    const dateStr = record.startedAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
    const current = frequencyMap.get(dateStr) || { exports: 0, imports: 0 };
    
    if (record.operationType === "export") {
      current.exports++;
    } else {
      current.imports++;
    }
    
    frequencyMap.set(dateStr, current);
  }

  return Array.from(frequencyMap.entries())
    .map(([date, data]) => ({
      date,
      exports: data.exports,
      imports: data.imports,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get file size trends over time
 */
export async function getFileSizeTrends(
  userId: string,
  organizationId?: string,
  days: number = 30
): Promise<FileSizeTrendData[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const conditions = organizationId
    ? and(
        eq(importExportHistory.organizationId, organizationId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      )
    : and(
        eq(importExportHistory.userId, userId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      );

  const history = await db
    .select()
    .from(importExportHistory)
    .where(conditions)
    .orderBy(importExportHistory.startedAt);

  // Group by date
  const sizeMap = new Map<string, { totalSize: number; count: number }>();
  
  // Initialize all dates in range
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    sizeMap.set(dateStr, { totalSize: 0, count: 0 });
  }

  // Aggregate sizes by date
  for (const record of history) {
    const dateStr = record.startedAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
    const current = sizeMap.get(dateStr) || { totalSize: 0, count: 0 };
    
    current.totalSize += record.exportFileSize || 0;
    current.count++;
    
    sizeMap.set(dateStr, current);
  }

  return Array.from(sizeMap.entries())
    .map(([date, data]) => ({
      date,
      averageSize: data.count > 0 ? Math.round(data.totalSize / data.count) : 0,
      totalSize: data.totalSize,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get most used templates
 */
export async function getTemplateUsage(
  userId: string,
  organizationId?: string,
  limit: number = 10
): Promise<TemplateUsageData[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = organizationId
    ? eq(exportTemplates.organizationId, organizationId)
    : eq(exportTemplates.userId, userId);

  const templates = await db
    .select()
    .from(exportTemplates)
    .where(conditions)
    .orderBy(desc(exportTemplates.usageCount))
    .limit(limit);

  return templates.map((t) => ({
    templateId: t.id,
    templateName: t.name,
    usageCount: t.usageCount,
    lastUsed: t.lastUsedAt,
  }));
}

/**
 * Get export type breakdown (manual vs scheduled)
 */
export async function getExportTypeBreakdown(
  userId: string,
  organizationId?: string,
  days: number = 30
): Promise<ExportTypeBreakdown> {
  const db = await getDb();
  if (!db) return { manual: 0, scheduled: 0, total: 0 };

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const conditions = organizationId
    ? and(
        eq(importExportHistory.organizationId, organizationId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      )
    : and(
        eq(importExportHistory.userId, userId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      );

  const history = await db
    .select()
    .from(importExportHistory)
    .where(conditions);

  let manual = 0;
  let scheduled = 0;

  for (const record of history) {
    if (record.scheduleId) {
      scheduled++;
    } else {
      manual++;
    }
  }

  return {
    manual,
    scheduled,
    total: manual + scheduled,
  };
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(
  userId: string,
  organizationId?: string,
  days: number = 30
): Promise<AnalyticsSummary> {
  const db = await getDb();
  if (!db) {
    return {
      totalExports: 0,
      totalImports: 0,
      totalDataExported: 0,
      averageFileSize: 0,
      successRate: 0,
      activeSchedules: 0,
      totalTemplates: 0,
    };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get history
  const historyConditions = organizationId
    ? and(
        eq(importExportHistory.organizationId, organizationId),
        gte(importExportHistory.startedAt, startDate)
      )
    : and(
        eq(importExportHistory.userId, userId),
        gte(importExportHistory.startedAt, startDate)
      );

  const history = await db
    .select()
    .from(importExportHistory)
    .where(historyConditions);

  // Calculate history stats
  let totalExports = 0;
  let totalImports = 0;
  let totalDataExported = 0;
  let successfulOps = 0;
  let exportFileSizes: number[] = [];

  for (const record of history) {
    if (record.operationType === "export") {
      totalExports++;
      totalDataExported += record.exportFileSize || 0;
      if (record.exportFileSize) {
        exportFileSizes.push(record.exportFileSize);
      }
    } else {
      totalImports++;
    }
    
    if (record.status === "completed") {
      successfulOps++
    }
  }

  const averageFileSize = exportFileSizes.length > 0
    ? Math.round(exportFileSizes.reduce((a, b) => a + b, 0) / exportFileSizes.length)
    : 0;

  const successRate = history.length > 0
    ? Math.round((successfulOps / history.length) * 100)
    : 100;

  // Get active schedules count
  const scheduleConditions = organizationId
    ? and(
        eq(exportSchedules.organizationId, organizationId),
        eq(exportSchedules.isActive, true)
      )
    : and(
        eq(exportSchedules.userId, userId),
        eq(exportSchedules.isActive, true)
      );

  const schedules = await db
    .select()
    .from(exportSchedules)
    .where(scheduleConditions);

  // Get templates count
  const templateConditions = organizationId
    ? eq(exportTemplates.organizationId, organizationId)
    : eq(exportTemplates.userId, userId);

  const templates = await db
    .select()
    .from(exportTemplates)
    .where(templateConditions);

  return {
    totalExports,
    totalImports,
    totalDataExported,
    averageFileSize,
    successRate,
    activeSchedules: schedules.length,
    totalTemplates: templates.length,
  };
}

/**
 * Get hourly distribution of exports
 */
export async function getHourlyDistribution(
  userId: string,
  organizationId?: string,
  days: number = 30
): Promise<{ hour: number; count: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const conditions = organizationId
    ? and(
        eq(importExportHistory.organizationId, organizationId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      )
    : and(
        eq(importExportHistory.userId, userId),
        eq(importExportHistory.operationType, "export"),
        gte(importExportHistory.startedAt, startDate)
      );

  const history = await db
    .select()
    .from(importExportHistory)
    .where(conditions);

  // Initialize hourly counts
  const hourlyMap = new Map<number, number>();
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, 0);
  }

  // Count by hour
  for (const record of history) {
    const hour = record.startedAt?.getHours() || 0;
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  }

  return Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);
}

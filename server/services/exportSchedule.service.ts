/**
 * Export Schedule Service
 * Handles CRUD operations and execution of scheduled exports
 */

import { getDb } from "../db";
import { exportSchedules, importExportHistory } from "../../drizzle/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { exportPrompts } from "./promptImportExport.service";
import { notifyExportSuccess, notifyExportFailure, getNotificationPreferences } from "./exportNotification.service";

/**
 * Calculate the next run time based on schedule configuration
 */
function calculateNextRunTime(schedule: {
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hour: number;
  minute: number;
}): Date {
  const now = new Date();
  const next = new Date();
  
  // Set the time
  next.setUTCHours(schedule.hour, schedule.minute, 0, 0);
  
  switch (schedule.frequency) {
    case "daily":
      // If today's time has passed, schedule for tomorrow
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
      
    case "weekly":
      const targetDay = schedule.dayOfWeek ?? 0;
      const currentDay = next.getUTCDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      
      next.setUTCDate(next.getUTCDate() + daysUntilTarget);
      break;
      
    case "monthly":
      const targetDate = schedule.dayOfMonth ?? 1;
      next.setUTCDate(targetDate);
      
      // If this month's date has passed, move to next month
      if (next <= now) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      
      // Handle months with fewer days
      const maxDays = new Date(next.getUTCFullYear(), next.getUTCMonth() + 1, 0).getUTCDate();
      if (targetDate > maxDays) {
        next.setUTCDate(maxDays);
      }
      break;
  }
  
  return next;
}

/**
 * Create a new export schedule
 */
export async function createExportSchedule(params: {
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  exportAll?: boolean;
  promptIds?: string[];
  includeVersions?: boolean;
  includeVariables?: boolean;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  enableCompression?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  
  const nextRunAt = calculateNextRunTime({
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    dayOfMonth: params.dayOfMonth,
    hour: params.hour ?? 0,
    minute: params.minute ?? 0,
  });
  
  await db.insert(exportSchedules).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    name: params.name,
    description: params.description,
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    dayOfMonth: params.dayOfMonth,
    hour: params.hour ?? 0,
    minute: params.minute ?? 0,
    exportAll: params.exportAll ?? true,
    promptIds: params.promptIds,
    includeVersions: params.includeVersions ?? true,
    includeVariables: params.includeVariables ?? true,
    notifyOnSuccess: params.notifyOnSuccess ?? true,
    notifyOnFailure: params.notifyOnFailure ?? true,
    enableCompression: params.enableCompression ?? false,
    isActive: true,
    nextRunAt,
  });
  
  return { id, nextRunAt };
}

/**
 * Get all export schedules for a user
 */
export async function getUserExportSchedules(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = organizationId
    ? and(eq(exportSchedules.userId, userId), eq(exportSchedules.organizationId, organizationId))
    : eq(exportSchedules.userId, userId);
  
  return db.select().from(exportSchedules).where(conditions);
}

/**
 * Get a single export schedule by ID
 */
export async function getExportSchedule(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(exportSchedules)
    .where(and(eq(exportSchedules.id, id), eq(exportSchedules.userId, userId)));
  
  return results[0] || null;
}

/**
 * Update an export schedule
 */
export async function updateExportSchedule(
  id: string,
  userId: string,
  updates: Partial<{
    name: string;
    description: string;
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek: number;
    dayOfMonth: number;
    hour: number;
    minute: number;
    exportAll: boolean;
    promptIds: string[];
    includeVersions: boolean;
    includeVariables: boolean;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    enableCompression: boolean;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current schedule to recalculate next run time if needed
  const current = await getExportSchedule(id, userId);
  if (!current) {
    throw new Error("Schedule not found");
  }
  
  // Recalculate next run time if schedule timing changed
  let nextRunAt = current.nextRunAt;
  if (updates.frequency || updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined || 
      updates.hour !== undefined || updates.minute !== undefined) {
    nextRunAt = calculateNextRunTime({
      frequency: updates.frequency ?? current.frequency,
      dayOfWeek: updates.dayOfWeek ?? current.dayOfWeek,
      dayOfMonth: updates.dayOfMonth ?? current.dayOfMonth,
      hour: updates.hour ?? current.hour,
      minute: updates.minute ?? current.minute,
    });
  }
  
  await db
    .update(exportSchedules)
    .set({ ...updates, nextRunAt })
    .where(and(eq(exportSchedules.id, id), eq(exportSchedules.userId, userId)));
  
  return { id, nextRunAt };
}

/**
 * Delete an export schedule
 */
export async function deleteExportSchedule(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(exportSchedules)
    .where(and(eq(exportSchedules.id, id), eq(exportSchedules.userId, userId)));
  
  return { success: true };
}

/**
 * Toggle an export schedule's active status
 */
export async function toggleExportSchedule(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const schedule = await getExportSchedule(id, userId);
  if (!schedule) {
    throw new Error("Schedule not found");
  }
  
  const newStatus = !schedule.isActive;
  let nextRunAt = schedule.nextRunAt;
  
  // If activating, recalculate next run time
  if (newStatus) {
    nextRunAt = calculateNextRunTime({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      hour: schedule.hour,
      minute: schedule.minute,
    });
  }
  
  await db
    .update(exportSchedules)
    .set({ isActive: newStatus, nextRunAt })
    .where(eq(exportSchedules.id, id));
  
  return { isActive: newStatus, nextRunAt };
}

/**
 * Get schedules that are due to run
 */
export async function getDueSchedules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  
  return db
    .select()
    .from(exportSchedules)
    .where(
      and(
        eq(exportSchedules.isActive, true),
        lte(exportSchedules.nextRunAt, now)
      )
    );
}

/**
 * Execute a scheduled export
 */
export async function executeScheduledExport(scheduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the schedule
  const schedules = await db
    .select()
    .from(exportSchedules)
    .where(eq(exportSchedules.id, scheduleId));
  
  const schedule = schedules[0];
  if (!schedule) {
    throw new Error("Schedule not found");
  }
  
  // Create history entry
  const historyId = nanoid();
  await db.insert(importExportHistory).values({
    id: historyId,
    userId: schedule.userId,
    organizationId: schedule.organizationId,
    operationType: "export",
    status: "processing",
    scheduleId: schedule.id,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  
  try {
    // Execute the export
    const result = await exportPrompts({
      userId: schedule.userId,
      organizationId: schedule.organizationId ?? undefined,
      promptIds: schedule.exportAll ? undefined : (schedule.promptIds ?? undefined),
    });
    
    // Update history with success
    await db
      .update(importExportHistory)
      .set({
        status: "completed",
        exportUrl: result.url,
        exportFileName: result.filename,
        exportFileSize: result.size,
        exportPromptCount: result.promptCount,
        exportVersionCount: result.versionCount,
        completedAt: new Date(),
      })
      .where(eq(importExportHistory.id, historyId));
    
    // Update schedule with last run info and next run time
    const nextRunAt = calculateNextRunTime({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      hour: schedule.hour,
      minute: schedule.minute,
    });
    
    await db
      .update(exportSchedules)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        lastExportUrl: result.url,
        lastExportError: null,
      })
      .where(eq(exportSchedules.id, scheduleId));
    
    // Send success notification if enabled
    const prefs = await getNotificationPreferences(scheduleId);
    if (prefs.notifyOnSuccess) {
      await notifyExportSuccess({
        scheduleName: schedule.name,
        scheduleId: schedule.id,
        userId: schedule.userId,
        organizationId: schedule.organizationId ?? undefined,
        exportUrl: result.url,
        promptCount: result.promptCount,
        versionCount: result.versionCount,
        fileSize: result.size,
      });
    }
    
    return { success: true, historyId, url: result.url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Update history with failure
    await db
      .update(importExportHistory)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(importExportHistory.id, historyId));
    
    // Update schedule with error
    const nextRunAt = calculateNextRunTime({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      hour: schedule.hour,
      minute: schedule.minute,
    });
    
    await db
      .update(exportSchedules)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        lastExportError: errorMessage,
      })
      .where(eq(exportSchedules.id, scheduleId));
    
    // Send failure notification if enabled
    const prefs = await getNotificationPreferences(scheduleId);
    if (prefs.notifyOnFailure) {
      await notifyExportFailure({
        scheduleName: schedule.name,
        scheduleId: schedule.id,
        userId: schedule.userId,
        organizationId: schedule.organizationId ?? undefined,
        errorMessage,
      });
    }
    
    throw error;
  }
}

/**
 * Process all due scheduled exports
 */
export async function processScheduledExports() {
  const dueSchedules = await getDueSchedules();
  const results = [];
  
  for (const schedule of dueSchedules) {
    try {
      const result = await executeScheduledExport(schedule.id);
      results.push({ scheduleId: schedule.id, historyId: result.historyId, url: result.url, success: true });
    } catch (error) {
      results.push({
        scheduleId: schedule.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}

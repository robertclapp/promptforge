/**
 * Export Template Service
 * Handles CRUD operations for reusable export configurations
 */

import { getDb } from "../db";
import { exportTemplates } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface CreateExportTemplateParams {
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  exportAll?: boolean;
  promptIds?: string[];
  includeVersions?: boolean;
  includeVariables?: boolean;
  enableCompression?: boolean;
  // Schedule configuration
  frequency?: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  // Notification preferences
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
}

export interface UpdateExportTemplateParams {
  name?: string;
  description?: string;
  exportAll?: boolean;
  promptIds?: string[];
  includeVersions?: boolean;
  includeVariables?: boolean;
  enableCompression?: boolean;
  frequency?: "daily" | "weekly" | "monthly" | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hour?: number;
  minute?: number;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
}

/**
 * Create a new export template
 */
export async function createExportTemplate(params: CreateExportTemplateParams) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const id = nanoid();
  
  await db.insert(exportTemplates).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    name: params.name,
    description: params.description,
    exportAll: params.exportAll ?? true,
    promptIds: params.promptIds,
    includeVersions: params.includeVersions ?? true,
    includeVariables: params.includeVariables ?? true,
    enableCompression: params.enableCompression ?? false,
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    dayOfMonth: params.dayOfMonth,
    hour: params.hour ?? 0,
    minute: params.minute ?? 0,
    notifyOnSuccess: params.notifyOnSuccess ?? true,
    notifyOnFailure: params.notifyOnFailure ?? true,
    usageCount: 0,
  });
  
  return { id };
}

/**
 * Get all export templates for a user
 */
export async function getUserExportTemplates(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = organizationId
    ? and(eq(exportTemplates.userId, userId), eq(exportTemplates.organizationId, organizationId))
    : eq(exportTemplates.userId, userId);
  
  return db
    .select()
    .from(exportTemplates)
    .where(conditions)
    .orderBy(desc(exportTemplates.usageCount), desc(exportTemplates.createdAt));
}

/**
 * Get a single export template by ID
 */
export async function getExportTemplate(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(exportTemplates)
    .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)));
  
  return results[0] || null;
}

/**
 * Update an export template
 */
export async function updateExportTemplate(
  id: string,
  userId: string,
  updates: UpdateExportTemplateParams
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const existing = await getExportTemplate(id, userId);
  if (!existing) {
    throw new Error("Template not found");
  }
  
  await db
    .update(exportTemplates)
    .set(updates)
    .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)));
  
  return { id };
}

/**
 * Delete an export template
 */
export async function deleteExportTemplate(id: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(exportTemplates)
    .where(and(eq(exportTemplates.id, id), eq(exportTemplates.userId, userId)));
  
  return { success: true };
}

/**
 * Increment usage count for a template
 */
export async function incrementTemplateUsage(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(exportTemplates)
    .set({
      usageCount: sql`${exportTemplates.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(exportTemplates.id, id));
}

/**
 * Duplicate an export template
 */
export async function duplicateExportTemplate(id: string, userId: string, newName?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const original = await getExportTemplate(id, userId);
  if (!original) {
    throw new Error("Template not found");
  }
  
  const newId = nanoid();
  
  await db.insert(exportTemplates).values({
    id: newId,
    userId: original.userId,
    organizationId: original.organizationId,
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    exportAll: original.exportAll,
    promptIds: original.promptIds,
    includeVersions: original.includeVersions,
    includeVariables: original.includeVariables,
    enableCompression: original.enableCompression,
    frequency: original.frequency,
    dayOfWeek: original.dayOfWeek,
    dayOfMonth: original.dayOfMonth,
    hour: original.hour,
    minute: original.minute,
    notifyOnSuccess: original.notifyOnSuccess,
    notifyOnFailure: original.notifyOnFailure,
    usageCount: 0,
  });
  
  return { id: newId };
}

/**
 * Get template statistics
 */
export async function getTemplateStats(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const templates = await getUserExportTemplates(userId, organizationId);
  
  const totalTemplates = templates.length;
  const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
  const withScheduleConfig = templates.filter(t => t.frequency !== null).length;
  const withCompression = templates.filter(t => t.enableCompression).length;
  
  return {
    totalTemplates,
    totalUsage,
    withScheduleConfig,
    withCompression,
  };
}

/**
 * Export Notification Service
 * Handles email notifications for scheduled export events
 */

import { notifyOwner } from "../_core/notification";
import { getDb } from "../db";
import { exportSchedules, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface ExportNotificationData {
  scheduleName: string;
  scheduleId: string;
  userId: string;
  organizationId?: string;
  exportUrl?: string;
  promptCount?: number;
  versionCount?: number;
  fileSize?: number;
  errorMessage?: string;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Get user display name
 */
async function getUserDisplayName(userId: string): Promise<string> {
  const db = await getDb();
  if (!db) return "User";
  
  const result = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result[0]?.name || "User";
}

/**
 * Send notification for successful export
 */
export async function notifyExportSuccess(data: ExportNotificationData): Promise<boolean> {
  const userName = await getUserDisplayName(data.userId);
  
  const title = `✅ Scheduled Export Completed: ${data.scheduleName}`;
  
  const content = `
Hello ${userName},

Your scheduled export "${data.scheduleName}" has completed successfully.

**Export Details:**
- Prompts exported: ${data.promptCount || 0}
- Versions included: ${data.versionCount || 0}
- File size: ${data.fileSize ? formatFileSize(data.fileSize) : "N/A"}

**Download Link:**
${data.exportUrl || "Not available"}

Note: This download link will expire in 7 days.

---
This is an automated notification from PromptForge.
To manage your export schedules, visit the Import/Export page.
  `.trim();
  
  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error("[ExportNotification] Failed to send success notification:", error);
    return false;
  }
}

/**
 * Send notification for failed export
 */
export async function notifyExportFailure(data: ExportNotificationData): Promise<boolean> {
  const userName = await getUserDisplayName(data.userId);
  
  const title = `❌ Scheduled Export Failed: ${data.scheduleName}`;
  
  const content = `
Hello ${userName},

Your scheduled export "${data.scheduleName}" has failed.

**Error Details:**
${data.errorMessage || "An unknown error occurred during the export process."}

**Troubleshooting Steps:**
1. Check that you have prompts available for export
2. Verify your workspace permissions
3. Try running a manual export to diagnose the issue
4. Contact support if the problem persists

---
This is an automated notification from PromptForge.
To manage your export schedules, visit the Import/Export page.
  `.trim();
  
  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error("[ExportNotification] Failed to send failure notification:", error);
    return false;
  }
}

/**
 * Send notification for schedule activation
 */
export async function notifyScheduleActivated(data: {
  scheduleName: string;
  scheduleId: string;
  userId: string;
  nextRunAt: Date;
}): Promise<boolean> {
  const userName = await getUserDisplayName(data.userId);
  
  const title = `📅 Export Schedule Activated: ${data.scheduleName}`;
  
  const content = `
Hello ${userName},

Your export schedule "${data.scheduleName}" has been activated.

**Next Scheduled Run:**
${data.nextRunAt.toUTCString()}

You will receive notifications when exports complete or fail.

---
This is an automated notification from PromptForge.
  `.trim();
  
  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error("[ExportNotification] Failed to send activation notification:", error);
    return false;
  }
}

/**
 * Send export success notification (wrapper for test compatibility)
 */
export async function sendExportSuccessNotification(params: {
  scheduleName: string;
  promptCount: number;
  fileSize: number;
  downloadUrl: string;
  duration: number;
}): Promise<boolean> {
  return notifyOwner({
    title: `✅ Export Successful: ${params.scheduleName}`,
    content: `Your export "${params.scheduleName}" completed successfully.\n\n**Details:**\n- ${params.promptCount} prompts exported\n- File size: ${formatFileSize(params.fileSize)}\n- Duration: ${formatDuration(params.duration)}\n\n**Download:** ${params.downloadUrl}`,
  });
}

/**
 * Send export failure notification (wrapper for test compatibility)
 */
export async function sendExportFailureNotification(params: {
  scheduleName: string;
  errorMessage: string;
  attemptedAt: Date;
}): Promise<boolean> {
  return notifyOwner({
    title: `❌ Export Failed: ${params.scheduleName}`,
    content: `Your export "${params.scheduleName}" failed.\n\n**Error:** ${params.errorMessage}\n\n**Attempted at:** ${params.attemptedAt.toISOString()}`,
  });
}

/**
 * Check if notifications are enabled for a schedule
 */
export async function isNotificationEnabled(scheduleId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ notifyOnSuccess: exportSchedules.notifyOnSuccess, notifyOnFailure: exportSchedules.notifyOnFailure })
    .from(exportSchedules)
    .where(eq(exportSchedules.id, scheduleId))
    .limit(1);
  
  if (!result[0]) return false;
  
  return result[0].notifyOnSuccess || result[0].notifyOnFailure;
}

/**
 * Get notification preferences for a schedule
 */
export async function getNotificationPreferences(scheduleId: string): Promise<{
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}> {
  const db = await getDb();
  if (!db) return { notifyOnSuccess: true, notifyOnFailure: true };
  
  const result = await db
    .select({ notifyOnSuccess: exportSchedules.notifyOnSuccess, notifyOnFailure: exportSchedules.notifyOnFailure })
    .from(exportSchedules)
    .where(eq(exportSchedules.id, scheduleId))
    .limit(1);
  
  if (!result[0]) return { notifyOnSuccess: true, notifyOnFailure: true };
  
  return {
    notifyOnSuccess: result[0].notifyOnSuccess ?? true,
    notifyOnFailure: result[0].notifyOnFailure ?? true,
  };
}

import { getDb } from "../db";
import { auditLogs, organizations, organizationMemberships, users, securityAlertSettings } from "../../drizzle/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Security alert types
 */
export type SecurityAlertType = 
  | "multiple_permission_denials"
  | "unusual_login_pattern"
  | "bulk_deletion"
  | "role_escalation"
  | "api_key_abuse"
  | "suspicious_activity";

/**
 * Security alert configuration
 */
export interface SecurityAlertConfig {
  permissionDenialThreshold: number; // Number of denials in time window
  permissionDenialWindowMinutes: number; // Time window for counting denials
  bulkDeletionThreshold: number; // Number of deletions in time window
  bulkDeletionWindowMinutes: number; // Time window for counting deletions
  loginAttemptThreshold: number; // Failed logins before alert
  loginAttemptWindowMinutes: number; // Time window for login attempts
  enabled: boolean;
}

const DEFAULT_CONFIG: SecurityAlertConfig = {
  permissionDenialThreshold: 5,
  permissionDenialWindowMinutes: 15,
  bulkDeletionThreshold: 10,
  bulkDeletionWindowMinutes: 30,
  loginAttemptThreshold: 5,
  loginAttemptWindowMinutes: 10,
  enabled: true,
};

/**
 * Get security alert settings for a workspace
 */
export async function getSecurityAlertSettings(
  organizationId: string
): Promise<SecurityAlertConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_CONFIG;

  try {
    const [settings] = await db
      .select()
      .from(securityAlertSettings)
      .where(eq(securityAlertSettings.organizationId, organizationId))
      .limit(1);

    if (!settings) return DEFAULT_CONFIG;

    return {
      permissionDenialThreshold: settings.permissionDenialThreshold,
      permissionDenialWindowMinutes: settings.permissionDenialWindowMinutes,
      bulkDeletionThreshold: settings.bulkDeletionThreshold,
      bulkDeletionWindowMinutes: settings.bulkDeletionWindowMinutes,
      loginAttemptThreshold: settings.loginAttemptThreshold,
      loginAttemptWindowMinutes: settings.loginAttemptWindowMinutes,
      enabled: settings.enabled,
    };
  } catch (error) {
    // Table might not exist yet
    return DEFAULT_CONFIG;
  }
}

/**
 * Update security alert settings for a workspace
 */
export async function updateSecurityAlertSettings(
  organizationId: string,
  config: Partial<SecurityAlertConfig>
): Promise<SecurityAlertConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentConfig = await getSecurityAlertSettings(organizationId);
  const newConfig = { ...currentConfig, ...config };

  // Upsert settings
  await db
    .insert(securityAlertSettings)
    .values({
      id: `${organizationId}-settings`,
      organizationId,
      ...newConfig,
    })
    .onDuplicateKeyUpdate({
      set: newConfig,
    });

  return newConfig;
}

/**
 * Check for multiple permission denials and send alert if threshold exceeded
 */
export async function checkPermissionDenialAlert(
  organizationId: string,
  userId: string,
  userName?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const config = await getSecurityAlertSettings(organizationId);
  if (!config.enabled) return false;

  const windowStart = new Date(
    Date.now() - config.permissionDenialWindowMinutes * 60 * 1000
  );

  // Count recent permission denials for this user
  const [result] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.userId, userId),
        eq(auditLogs.eventCategory, "permission"),
        eq(auditLogs.status, "denied"),
        gte(auditLogs.createdAt, windowStart)
      )
    );

  const denialCount = result?.count || 0;

  if (denialCount >= config.permissionDenialThreshold) {
    await sendSecurityAlert(organizationId, {
      type: "multiple_permission_denials",
      title: "🚨 Multiple Permission Denials Detected",
      description: `User ${userName || userId} has been denied access ${denialCount} times in the last ${config.permissionDenialWindowMinutes} minutes. This may indicate an unauthorized access attempt.`,
      userId,
      userName,
      count: denialCount,
      windowMinutes: config.permissionDenialWindowMinutes,
    });
    return true;
  }

  return false;
}

/**
 * Check for bulk deletions and send alert if threshold exceeded
 */
export async function checkBulkDeletionAlert(
  organizationId: string,
  userId: string,
  userName?: string,
  resourceType?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const config = await getSecurityAlertSettings(organizationId);
  if (!config.enabled) return false;

  const windowStart = new Date(
    Date.now() - config.bulkDeletionWindowMinutes * 60 * 1000
  );

  // Count recent deletions by this user
  const [result] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.userId, userId),
        eq(auditLogs.action, "delete"),
        gte(auditLogs.createdAt, windowStart)
      )
    );

  const deletionCount = result?.count || 0;

  if (deletionCount >= config.bulkDeletionThreshold) {
    await sendSecurityAlert(organizationId, {
      type: "bulk_deletion",
      title: "⚠️ Bulk Deletion Activity Detected",
      description: `User ${userName || userId} has deleted ${deletionCount} resources in the last ${config.bulkDeletionWindowMinutes} minutes. Please verify this activity is authorized.`,
      userId,
      userName,
      count: deletionCount,
      windowMinutes: config.bulkDeletionWindowMinutes,
      resourceType,
    });
    return true;
  }

  return false;
}

/**
 * Check for role escalation attempts
 */
export async function checkRoleEscalationAlert(
  organizationId: string,
  actorId: string,
  actorName: string | undefined,
  targetUserId: string,
  targetUserName: string | undefined,
  oldRole: string,
  newRole: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const config = await getSecurityAlertSettings(organizationId);
  if (!config.enabled) return false;

  // Alert on any role escalation to admin or owner
  if (newRole === "admin" || newRole === "owner") {
    await sendSecurityAlert(organizationId, {
      type: "role_escalation",
      title: "👤 Role Escalation Detected",
      description: `${actorName || actorId} changed ${targetUserName || targetUserId}'s role from "${oldRole}" to "${newRole}". Please verify this change is authorized.`,
      userId: actorId,
      userName: actorName,
      targetUserId,
      targetUserName,
      oldRole,
      newRole,
    });
    return true;
  }

  return false;
}

/**
 * Check for suspicious API key activity
 */
export async function checkApiKeyAbuseAlert(
  organizationId: string,
  apiKeyId: string,
  requestCount: number,
  windowMinutes: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const config = await getSecurityAlertSettings(organizationId);
  if (!config.enabled) return false;

  // Alert if API key usage exceeds 1000 requests in the window
  const threshold = 1000;
  if (requestCount >= threshold) {
    await sendSecurityAlert(organizationId, {
      type: "api_key_abuse",
      title: "🔑 High API Key Usage Detected",
      description: `API key ${apiKeyId.substring(0, 8)}... has made ${requestCount} requests in the last ${windowMinutes} minutes. This may indicate abuse or a compromised key.`,
      apiKeyId,
      count: requestCount,
      windowMinutes,
    });
    return true;
  }

  return false;
}

/**
 * Send a security alert to workspace owner
 */
async function sendSecurityAlert(
  organizationId: string,
  alert: {
    type: SecurityAlertType;
    title: string;
    description: string;
    [key: string]: any;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Get organization name
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Build notification content
    const content = `
**Workspace:** ${org?.name || organizationId}
**Alert Type:** ${alert.type.replace(/_/g, " ").toUpperCase()}
**Time:** ${new Date().toISOString()}

${alert.description}

---
*This is an automated security alert from PromptForge. Review your Audit Logs for more details.*
    `.trim();

    // Send notification to owner
    await notifyOwner({
      title: alert.title,
      content,
    });

    // Log the alert
    await db.insert(auditLogs).values({
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      userId: alert.userId || "system",
      userName: alert.userName || "System",
      eventType: "security_alert_sent",
      eventCategory: "security",
      action: "alert",
      status: "success",
      details: alert,
    });

    return true;
  } catch (error) {
    console.error("Failed to send security alert:", error);
    return false;
  }
}

/**
 * Get recent security alerts for a workspace
 */
export async function getRecentSecurityAlerts(
  organizationId: string,
  limit: number = 10
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const alerts = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.eventType, "security_alert_sent")
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return alerts;
}

/**
 * Get security summary for dashboard
 */
export async function getSecuritySummary(organizationId: string): Promise<{
  recentAlerts: number;
  permissionDenials24h: number;
  deletions24h: number;
  roleChanges7d: number;
  lastAlertTime: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      recentAlerts: 0,
      permissionDenials24h: 0,
      deletions24h: 0,
      roleChanges7d: 0,
      lastAlertTime: null,
    };
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get counts in parallel
  const [alertsResult, denialsResult, deletionsResult, roleChangesResult, lastAlert] = await Promise.all([
    // Recent alerts (7 days)
    db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.eventType, "security_alert_sent"),
          gte(auditLogs.createdAt, sevenDaysAgo)
        )
      ),
    // Permission denials (24h)
    db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.eventCategory, "permission"),
          eq(auditLogs.status, "denied"),
          gte(auditLogs.createdAt, twentyFourHoursAgo)
        )
      ),
    // Deletions (24h)
    db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.action, "delete"),
          gte(auditLogs.createdAt, twentyFourHoursAgo)
        )
      ),
    // Role changes (7 days)
    db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.eventType, "role_changed"),
          gte(auditLogs.createdAt, sevenDaysAgo)
        )
      ),
    // Last alert
    db
      .select({ createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.eventType, "security_alert_sent")
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(1),
  ]);

  return {
    recentAlerts: alertsResult[0]?.count || 0,
    permissionDenials24h: denialsResult[0]?.count || 0,
    deletions24h: deletionsResult[0]?.count || 0,
    roleChanges7d: roleChangesResult[0]?.count || 0,
    lastAlertTime: lastAlert[0]?.createdAt || null,
  };
}

/**
 * Audit Alerts Service
 * Manages alert rules and triggers real-time notifications for audit events
 */

import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  auditAlertRules,
  auditAlertHistory,
  exportAuditLog,
} from "../../drizzle/importExport_schema";
import { notifyOwner } from "../_core/notification";
import crypto from "crypto";

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  triggerOnActions: string[];
  triggerOnResourceTypes: string[] | null;
  triggerOnStatus: string[] | null;
  thresholdCount: number;
  thresholdWindowMinutes: number;
  triggerOnUnknownIp: boolean;
  allowedIps: string[] | null;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  triggerCount: number;
  cooldownMinutes: number;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(params: {
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  triggerOnActions: string[];
  triggerOnResourceTypes?: string[];
  triggerOnStatus?: string[];
  thresholdCount?: number;
  thresholdWindowMinutes?: number;
  triggerOnUnknownIp?: boolean;
  allowedIps?: string[];
  notifyEmail?: boolean;
  notifyWebhook?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  cooldownMinutes?: number;
}): Promise<{ id: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();

  await db.insert(auditAlertRules).values({
    id,
    userId: params.userId,
    organizationId: params.organizationId,
    name: params.name,
    description: params.description,
    triggerOnActions: params.triggerOnActions,
    triggerOnResourceTypes: params.triggerOnResourceTypes,
    triggerOnStatus: params.triggerOnStatus,
    thresholdCount: params.thresholdCount ?? 1,
    thresholdWindowMinutes: params.thresholdWindowMinutes ?? 60,
    triggerOnUnknownIp: params.triggerOnUnknownIp ?? false,
    allowedIps: params.allowedIps,
    notifyEmail: params.notifyEmail ?? true,
    notifyWebhook: params.notifyWebhook ?? false,
    webhookUrl: params.webhookUrl,
    webhookSecret: params.webhookSecret,
    cooldownMinutes: params.cooldownMinutes ?? 15,
  });

  return { id };
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  ruleId: string,
  userId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    triggerOnActions: string[];
    triggerOnResourceTypes: string[] | null;
    triggerOnStatus: string[] | null;
    thresholdCount: number;
    thresholdWindowMinutes: number;
    triggerOnUnknownIp: boolean;
    allowedIps: string[] | null;
    notifyEmail: boolean;
    notifyWebhook: boolean;
    webhookUrl: string | null;
    webhookSecret: string | null;
    isActive: boolean;
    cooldownMinutes: number;
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(auditAlertRules)
    .set(updates)
    .where(and(eq(auditAlertRules.id, ruleId), eq(auditAlertRules.userId, userId)));

  return true;
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(ruleId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(auditAlertRules)
    .where(and(eq(auditAlertRules.id, ruleId), eq(auditAlertRules.userId, userId)));

  return true;
}

/**
 * Get all alert rules for a user
 */
export async function getAlertRules(userId: string): Promise<AlertRule[]> {
  const db = await getDb();
  if (!db) return [];

  const rules = await db
    .select()
    .from(auditAlertRules)
    .where(eq(auditAlertRules.userId, userId))
    .orderBy(desc(auditAlertRules.createdAt));

  return rules;
}

/**
 * Get a specific alert rule
 */
export async function getAlertRule(ruleId: string, userId: string): Promise<AlertRule | null> {
  const db = await getDb();
  if (!db) return null;

  const [rule] = await db
    .select()
    .from(auditAlertRules)
    .where(and(eq(auditAlertRules.id, ruleId), eq(auditAlertRules.userId, userId)))
    .limit(1);

  return rule || null;
}

/**
 * Check if an audit event should trigger any alerts
 */
export async function checkAndTriggerAlerts(params: {
  userId: string;
  action: string;
  resourceType: string;
  status: string;
  sourceIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  auditEventId: string;
}): Promise<{ alertsTriggered: number; alertIds: string[] }> {
  const db = await getDb();
  if (!db) return { alertsTriggered: 0, alertIds: [] };

  // Get all active rules for this user
  const rules = await db
    .select()
    .from(auditAlertRules)
    .where(and(eq(auditAlertRules.userId, params.userId), eq(auditAlertRules.isActive, true)));

  const triggeredAlertIds: string[] = [];

  for (const rule of rules) {
    // Check if this event matches the rule
    const matchesAction = rule.triggerOnActions.includes(params.action);
    const matchesResourceType =
      !rule.triggerOnResourceTypes ||
      rule.triggerOnResourceTypes.length === 0 ||
      rule.triggerOnResourceTypes.includes(params.resourceType);
    const matchesStatus =
      !rule.triggerOnStatus ||
      rule.triggerOnStatus.length === 0 ||
      rule.triggerOnStatus.includes(params.status);

    // Check IP-based rules
    let matchesIpRule = true;
    if (rule.triggerOnUnknownIp && params.sourceIp && rule.allowedIps && rule.allowedIps.length > 0) {
      matchesIpRule = !rule.allowedIps.includes(params.sourceIp);
    } else if (rule.triggerOnUnknownIp && !params.sourceIp) {
      matchesIpRule = true; // Unknown IP triggers if configured
    } else if (!rule.triggerOnUnknownIp) {
      matchesIpRule = true; // Not checking IPs
    }

    if (!matchesAction || !matchesResourceType || !matchesStatus) {
      continue;
    }

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const cooldownEnd = new Date(rule.lastTriggeredAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + rule.cooldownMinutes);
      if (new Date() < cooldownEnd) {
        continue; // Still in cooldown
      }
    }

    // Check threshold (count events in window)
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - rule.thresholdWindowMinutes);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exportAuditLog)
      .where(
        and(
          eq(exportAuditLog.userId, params.userId),
          sql`${exportAuditLog.action} = ${params.action}`,
          gte(exportAuditLog.createdAt, windowStart)
        )
      );

    const eventCount = (countResult?.count || 0) + 1; // +1 for current event

    if (eventCount >= rule.thresholdCount) {
      // Trigger the alert
      const alertId = await triggerAlert({
        rule,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        status: params.status,
        sourceIp: params.sourceIp,
        userAgent: params.userAgent,
        metadata: params.metadata,
        auditEventIds: [params.auditEventId],
        eventCount,
      });

      if (alertId) {
        triggeredAlertIds.push(alertId);
      }
    }
  }

  return {
    alertsTriggered: triggeredAlertIds.length,
    alertIds: triggeredAlertIds,
  };
}

/**
 * Trigger an alert and send notifications
 */
async function triggerAlert(params: {
  rule: AlertRule;
  userId: string;
  action: string;
  resourceType: string;
  status: string;
  sourceIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  auditEventIds: string[];
  eventCount: number;
}): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const alertId = crypto.randomUUID();
  const severity = determineSeverity(params.action, params.status, params.eventCount);
  const title = generateAlertTitle(params.rule.name, params.action, params.eventCount);
  const message = generateAlertMessage(params);

  // Create alert history record
  await db.insert(auditAlertHistory).values({
    id: alertId,
    ruleId: params.rule.id,
    userId: params.userId,
    alertType: params.action,
    severity,
    title,
    message,
    auditEventIds: params.auditEventIds,
    eventCount: params.eventCount,
    sourceIp: params.sourceIp,
    userAgent: params.userAgent,
    metadata: params.metadata,
  });

  // Update rule with trigger info
  await db
    .update(auditAlertRules)
    .set({
      lastTriggeredAt: new Date(),
      triggerCount: sql`${auditAlertRules.triggerCount} + 1`,
    })
    .where(eq(auditAlertRules.id, params.rule.id));

  // Send notifications
  let emailSent = false;
  let webhookSent = false;
  let webhookResponse: string | undefined;

  // Send email notification
  if (params.rule.notifyEmail) {
    try {
      await notifyOwner({
        title: `🚨 ${title}`,
        content: message,
      });
      emailSent = true;
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  // Send webhook notification
  if (params.rule.notifyWebhook && params.rule.webhookUrl) {
    try {
      const payload = {
        alertId,
        ruleId: params.rule.id,
        ruleName: params.rule.name,
        alertType: params.action,
        severity,
        title,
        message,
        eventCount: params.eventCount,
        sourceIp: params.sourceIp,
        timestamp: new Date().toISOString(),
        metadata: params.metadata,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add HMAC signature if secret is configured
      if (params.rule.webhookSecret) {
        const signature = crypto
          .createHmac("sha256", params.rule.webhookSecret)
          .update(JSON.stringify(payload))
          .digest("hex");
        headers["X-Signature-256"] = `sha256=${signature}`;
      }

      const response = await fetch(params.rule.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      webhookSent = response.ok;
      webhookResponse = `${response.status}: ${await response.text().catch(() => "")}`;
    } catch (error) {
      webhookResponse = error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Update notification status
  await db
    .update(auditAlertHistory)
    .set({
      emailSent,
      webhookSent,
      webhookResponse,
    })
    .where(eq(auditAlertHistory.id, alertId));

  return alertId;
}

/**
 * Determine alert severity based on action and context
 */
function determineSeverity(
  action: string,
  status: string,
  eventCount: number
): "low" | "medium" | "high" | "critical" {
  // Critical: unauthorized access, multiple failures
  if (status === "unauthorized" || status === "forbidden") {
    return "critical";
  }

  // High: failures, unknown IPs
  if (status === "failed" || action.includes("unauthorized")) {
    return eventCount > 5 ? "critical" : "high";
  }

  // Medium: suspicious patterns
  if (eventCount > 10) {
    return "medium";
  }

  // Low: informational
  return "low";
}

/**
 * Generate alert title
 */
function generateAlertTitle(ruleName: string, action: string, eventCount: number): string {
  const actionLabel = action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  if (eventCount > 1) {
    return `${ruleName}: ${eventCount} ${actionLabel} events detected`;
  }
  return `${ruleName}: ${actionLabel} detected`;
}

/**
 * Generate alert message
 */
function generateAlertMessage(params: {
  action: string;
  resourceType: string;
  status: string;
  sourceIp?: string;
  eventCount: number;
}): string {
  const lines: string[] = [];

  lines.push(`Action: ${params.action}`);
  lines.push(`Resource Type: ${params.resourceType}`);
  lines.push(`Status: ${params.status}`);
  lines.push(`Event Count: ${params.eventCount}`);

  if (params.sourceIp) {
    lines.push(`Source IP: ${params.sourceIp}`);
  }

  lines.push(`Time: ${new Date().toISOString()}`);

  return lines.join("\n");
}

/**
 * Get alert history for a user
 */
export async function getAlertHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    ruleId?: string;
    severity?: string;
    acknowledged?: boolean;
  }
): Promise<{
  items: Array<{
    id: string;
    ruleId: string;
    alertType: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
    eventCount: number;
    sourceIp: string | null;
    emailSent: boolean;
    webhookSent: boolean;
    acknowledged: boolean;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
    triggeredAt: Date | null;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  let query = db
    .select()
    .from(auditAlertHistory)
    .where(eq(auditAlertHistory.userId, userId))
    .orderBy(desc(auditAlertHistory.triggeredAt))
    .limit(limit)
    .offset(offset);

  const items = await query;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditAlertHistory)
    .where(eq(auditAlertHistory.userId, userId));

  return {
    items,
    total: countResult?.count || 0,
  };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string,
  note?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(auditAlertHistory)
    .set({
      acknowledged: true,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
      acknowledgeNote: note,
    })
    .where(and(eq(auditAlertHistory.id, alertId), eq(auditAlertHistory.userId, userId)));

  return true;
}

/**
 * Get alert statistics
 */
export async function getAlertStats(userId: string): Promise<{
  totalAlerts: number;
  unacknowledged: number;
  bySeverity: { low: number; medium: number; high: number; critical: number };
  last24Hours: number;
  last7Days: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalAlerts: 0,
      unacknowledged: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      last24Hours: 0,
      last7Days: 0,
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [stats] = await db
    .select({
      totalAlerts: sql<number>`count(*)`,
      unacknowledged: sql<number>`SUM(CASE WHEN ${auditAlertHistory.acknowledged} = false THEN 1 ELSE 0 END)`,
      lowCount: sql<number>`SUM(CASE WHEN ${auditAlertHistory.severity} = 'low' THEN 1 ELSE 0 END)`,
      mediumCount: sql<number>`SUM(CASE WHEN ${auditAlertHistory.severity} = 'medium' THEN 1 ELSE 0 END)`,
      highCount: sql<number>`SUM(CASE WHEN ${auditAlertHistory.severity} = 'high' THEN 1 ELSE 0 END)`,
      criticalCount: sql<number>`SUM(CASE WHEN ${auditAlertHistory.severity} = 'critical' THEN 1 ELSE 0 END)`,
    })
    .from(auditAlertHistory)
    .where(eq(auditAlertHistory.userId, userId));

  const [last24HoursResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditAlertHistory)
    .where(and(eq(auditAlertHistory.userId, userId), gte(auditAlertHistory.triggeredAt, oneDayAgo)));

  const [last7DaysResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditAlertHistory)
    .where(and(eq(auditAlertHistory.userId, userId), gte(auditAlertHistory.triggeredAt, sevenDaysAgo)));

  return {
    totalAlerts: stats?.totalAlerts || 0,
    unacknowledged: stats?.unacknowledged || 0,
    bySeverity: {
      low: stats?.lowCount || 0,
      medium: stats?.mediumCount || 0,
      high: stats?.highCount || 0,
      critical: stats?.criticalCount || 0,
    },
    last24Hours: last24HoursResult?.count || 0,
    last7Days: last7DaysResult?.count || 0,
  };
}

/**
 * Get predefined alert rule templates
 */
export function getAlertRuleTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  config: Partial<AlertRule>;
}> {
  return [
    {
      id: "unauthorized_access",
      name: "Unauthorized Access Attempts",
      description: "Alert when unauthorized access to exports is detected",
      config: {
        triggerOnActions: ["share_access", "export_download"],
        triggerOnStatus: ["unauthorized", "forbidden", "failed"],
        thresholdCount: 1,
        thresholdWindowMinutes: 60,
        cooldownMinutes: 5,
      },
    },
    {
      id: "failed_exports",
      name: "Export Failures",
      description: "Alert when exports fail multiple times",
      config: {
        triggerOnActions: ["export_failed", "scheduled_export_failed"],
        thresholdCount: 3,
        thresholdWindowMinutes: 60,
        cooldownMinutes: 30,
      },
    },
    {
      id: "unknown_ip",
      name: "Unknown IP Access",
      description: "Alert when exports are accessed from unknown IPs",
      config: {
        triggerOnActions: ["share_access", "export_download"],
        triggerOnUnknownIp: true,
        thresholdCount: 1,
        thresholdWindowMinutes: 60,
        cooldownMinutes: 15,
      },
    },
    {
      id: "bulk_downloads",
      name: "Bulk Download Activity",
      description: "Alert on unusual download volume",
      config: {
        triggerOnActions: ["export_download", "share_access"],
        thresholdCount: 10,
        thresholdWindowMinutes: 30,
        cooldownMinutes: 60,
      },
    },
    {
      id: "share_expiry",
      name: "Expired Share Access",
      description: "Alert when someone tries to access expired shares",
      config: {
        triggerOnActions: ["share_access"],
        triggerOnStatus: ["expired"],
        thresholdCount: 1,
        thresholdWindowMinutes: 60,
        cooldownMinutes: 15,
      },
    },
  ];
}

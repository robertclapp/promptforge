import { eq, and, lte, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  scheduledReports,
  reportDeliveries,
  emailPreferences,
  evaluations,
  evaluationResults,
  budgets,
  analyticsEvents,
  auditLogs,
} from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import crypto from "crypto";

// Report types
export type ReportType = 
  | "api_usage"
  | "security_summary"
  | "evaluation_metrics"
  | "budget_status"
  | "team_activity"
  | "comprehensive";

export type ReportFrequency = "daily" | "weekly" | "monthly";

// Generate unique ID
function generateId(): string {
  return `sr_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Create a new scheduled report
 */
export async function createScheduledReport(
  userId: string,
  data: {
    name: string;
    reportType: ReportType;
    frequency: ReportFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour?: number;
    timezone?: string;
    emailRecipients: string[];
    includeAttachment?: boolean;
    attachmentFormat?: "pdf" | "csv" | "json";
    workspaceId?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = generateId();
  const nextScheduledAt = calculateNextSchedule(
    data.frequency,
    data.hour || 9,
    data.dayOfWeek,
    data.dayOfMonth,
    data.timezone || "UTC"
  );

  await db.insert(scheduledReports).values({
    id,
    userId,
    workspaceId: data.workspaceId,
    name: data.name,
    reportType: data.reportType,
    frequency: data.frequency,
    dayOfWeek: data.dayOfWeek,
    dayOfMonth: data.dayOfMonth,
    hour: data.hour || 9,
    timezone: data.timezone || "UTC",
    emailRecipients: data.emailRecipients,
    includeAttachment: data.includeAttachment ?? true,
    attachmentFormat: data.attachmentFormat || "pdf",
    isActive: true,
    nextScheduledAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id, nextScheduledAt };
}

/**
 * Get user's scheduled reports
 */
export async function getUserScheduledReports(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.userId, userId))
    .orderBy(desc(scheduledReports.createdAt));
}

/**
 * Get scheduled report by ID
 */
export async function getScheduledReport(reportId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(scheduledReports)
    .where(
      and(eq(scheduledReports.id, reportId), eq(scheduledReports.userId, userId))
    );
  return results[0] || null;
}

/**
 * Update scheduled report
 */
export async function updateScheduledReport(
  reportId: string,
  userId: string,
  updates: Partial<{
    name: string;
    reportType: ReportType;
    frequency: ReportFrequency;
    dayOfWeek: number;
    dayOfMonth: number;
    hour: number;
    timezone: string;
    emailRecipients: string[];
    includeAttachment: boolean;
    attachmentFormat: "pdf" | "csv" | "json";
    isActive: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Recalculate next schedule if frequency/timing changed
  let nextScheduledAt: Date | undefined;
  if (updates.frequency || updates.hour !== undefined || updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined) {
    const report = await getScheduledReport(reportId, userId);
    if (report) {
      nextScheduledAt = calculateNextSchedule(
        updates.frequency || report.frequency,
        updates.hour ?? report.hour,
        updates.dayOfWeek ?? report.dayOfWeek ?? undefined,
        updates.dayOfMonth ?? report.dayOfMonth ?? undefined,
        updates.timezone || report.timezone
      );
    }
  }

  await db
    .update(scheduledReports)
    .set({
      ...updates,
      ...(nextScheduledAt && { nextScheduledAt }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(scheduledReports.id, reportId), eq(scheduledReports.userId, userId))
    );
}

/**
 * Delete scheduled report
 */
export async function deleteScheduledReport(reportId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(scheduledReports)
    .where(
      and(eq(scheduledReports.id, reportId), eq(scheduledReports.userId, userId))
    );
}

/**
 * Get report delivery history
 */
export async function getReportDeliveries(reportId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(reportDeliveries)
    .where(eq(reportDeliveries.reportId, reportId))
    .orderBy(desc(reportDeliveries.sentAt))
    .limit(limit);
}

/**
 * Generate report data based on type
 */
export async function generateReportData(
  userId: string,
  reportType: ReportType,
  workspaceId?: string
): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) return {};

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (reportType) {
    case "api_usage":
      return generateApiUsageReport(userId, thirtyDaysAgo, now);
    case "security_summary":
      return generateSecurityReport(userId, thirtyDaysAgo, now);
    case "evaluation_metrics":
      return generateEvaluationReport(userId, thirtyDaysAgo, now);
    case "budget_status":
      return generateBudgetReport(userId);
    case "team_activity":
      return generateTeamActivityReport(userId, workspaceId, thirtyDaysAgo, now);
    case "comprehensive":
      return {
        apiUsage: await generateApiUsageReport(userId, thirtyDaysAgo, now),
        security: await generateSecurityReport(userId, thirtyDaysAgo, now),
        evaluations: await generateEvaluationReport(userId, thirtyDaysAgo, now),
        budgets: await generateBudgetReport(userId),
        teamActivity: await generateTeamActivityReport(userId, workspaceId, thirtyDaysAgo, now),
        generatedAt: now.toISOString(),
        period: { start: thirtyDaysAgo.toISOString(), end: now.toISOString() },
      };
    default:
      return {};
  }
}

async function generateApiUsageReport(userId: string, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return {};

  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId))
    .limit(1000);

  const apiEvents = events.filter(e => 
    e.eventType.includes("api") || e.eventType.includes("evaluation")
  );

  return {
    totalCalls: apiEvents.length,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    eventsByType: apiEvents.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    generatedAt: new Date().toISOString(),
  };
}

async function generateSecurityReport(userId: string, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return {};

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .limit(500);

  const securityEvents = logs.filter(l => 
    l.action === "denied" || 
    l.action === "delete" || 
    l.action === "update"
  );

  return {
    totalSecurityEvents: securityEvents.length,
    permissionDenials: securityEvents.filter(e => e.action === "denied").length,
    deletions: securityEvents.filter(e => e.action === "delete").length,
    roleChanges: securityEvents.filter(e => e.action === "update").length,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateEvaluationReport(userId: string, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return {};

  const evals = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.userId, userId))
    .limit(100);

  const completedEvals = evals.filter(e => e.status === "completed");

  return {
    totalEvaluations: evals.length,
    completedEvaluations: completedEvals.length,
    pendingEvaluations: evals.filter(e => e.status === "pending").length,
    failedEvaluations: evals.filter(e => e.status === "failed").length,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateBudgetReport(userId: string) {
  const db = await getDb();
  if (!db) return {};

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, userId));

  return {
    totalBudgets: userBudgets.length,
    activeBudgets: userBudgets.filter(b => b.isActive).length,
    budgetSummary: userBudgets.map(b => ({
      name: b.name,
      amount: b.amount / 100,
      currentSpend: b.currentSpend / 100,
      percentUsed: b.amount > 0 ? Math.round((b.currentSpend / b.amount) * 100) : 0,
      period: b.period,
      isActive: b.isActive,
    })),
    totalAllocated: userBudgets.reduce((sum, b) => sum + b.amount, 0) / 100,
    totalSpent: userBudgets.reduce((sum, b) => sum + b.currentSpend, 0) / 100,
    generatedAt: new Date().toISOString(),
  };
}

async function generateTeamActivityReport(
  userId: string,
  workspaceId: string | undefined,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return {};

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .limit(500);

  return {
    totalActivities: logs.length,
    activitiesByAction: logs.reduce((acc, l) => {
      acc[l.action] = (acc[l.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Send a scheduled report
 */
export async function sendScheduledReport(reportId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const reports = await db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.id, reportId));

  const report = reports[0];
  if (!report) throw new Error("Report not found");

  // Generate report data
  const reportData = await generateReportData(
    report.userId,
    report.reportType as ReportType,
    report.workspaceId || undefined
  );

  // Create delivery record
  const deliveryId = `rd_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

  try {
    // Send notification to owner with report summary
    const reportSummary = formatReportSummary(report.reportType as ReportType, reportData);
    
    await notifyOwner({
      title: `📊 ${report.name} - Scheduled Report`,
      content: reportSummary,
    });

    // Record successful delivery
    await db.insert(reportDeliveries).values({
      id: deliveryId,
      reportId,
      sentAt: new Date(),
      recipients: report.emailRecipients as string[],
      status: "sent",
      reportData: reportData as Record<string, unknown>,
      createdAt: new Date(),
    });

    // Update report with last sent and next scheduled
    const nextScheduledAt = calculateNextSchedule(
      report.frequency,
      report.hour,
      report.dayOfWeek ?? undefined,
      report.dayOfMonth ?? undefined,
      report.timezone
    );

    await db
      .update(scheduledReports)
      .set({
        lastSentAt: new Date(),
        nextScheduledAt,
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, reportId));

    return { success: true, deliveryId };
  } catch (error) {
    // Record failed delivery
    await db.insert(reportDeliveries).values({
      id: deliveryId,
      reportId,
      sentAt: new Date(),
      recipients: report.emailRecipients as string[],
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      createdAt: new Date(),
    });

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Format report summary for notification
 */
function formatReportSummary(reportType: ReportType, data: Record<string, unknown>): string {
  switch (reportType) {
    case "api_usage":
      return `API Usage Report\n\nTotal API Calls: ${data.totalCalls || 0}\nPeriod: Last 30 days`;
    case "security_summary":
      return `Security Summary\n\nTotal Security Events: ${data.totalSecurityEvents || 0}\nPermission Denials: ${data.permissionDenials || 0}\nDeletions: ${data.deletions || 0}`;
    case "evaluation_metrics":
      return `Evaluation Metrics\n\nTotal Evaluations: ${data.totalEvaluations || 0}\nCompleted: ${data.completedEvaluations || 0}\nPending: ${data.pendingEvaluations || 0}`;
    case "budget_status":
      return `Budget Status\n\nTotal Budgets: ${data.totalBudgets || 0}\nTotal Allocated: $${data.totalAllocated || 0}\nTotal Spent: $${data.totalSpent || 0}`;
    case "team_activity":
      return `Team Activity Report\n\nTotal Activities: ${data.totalActivities || 0}\nPeriod: Last 30 days`;
    case "comprehensive":
      return `Comprehensive Report\n\nThis report includes API usage, security summary, evaluation metrics, budget status, and team activity for the last 30 days.`;
    default:
      return "Report generated successfully.";
  }
}

/**
 * Calculate next schedule time
 */
function calculateNextSchedule(
  frequency: string,
  hour: number,
  dayOfWeek?: number,
  dayOfMonth?: number,
  timezone: string = "UTC"
): Date {
  const now = new Date();
  const next = new Date(now);

  // Set hour
  next.setHours(hour, 0, 0, 0);

  switch (frequency) {
    case "daily":
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case "weekly":
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case "monthly":
      const targetDate = dayOfMonth ?? 1; // Default to 1st
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }

  return next;
}

/**
 * Get email preferences for user
 */
export async function getEmailPreferences(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId));
  return results[0] || null;
}

/**
 * Update email preferences
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<{
    securityAlerts: boolean;
    evaluationComplete: boolean;
    budgetWarnings: boolean;
    weeklyDigest: boolean;
    monthlyReport: boolean;
    teamUpdates: boolean;
    emailAddress: string;
    timezone: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getEmailPreferences(userId);

  if (existing) {
    await db
      .update(emailPreferences)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(emailPreferences.userId, userId));
  } else {
    const id = `ep_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    await db.insert(emailPreferences).values({
      id,
      userId,
      ...preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Get reports due for sending
 */
export async function getDueReports() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  return db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.isActive, true),
        lte(scheduledReports.nextScheduledAt, now)
      )
    );
}

/**
 * Process all due reports
 */
export async function processDueReports() {
  const dueReports = await getDueReports();
  const results = [];

  for (const report of dueReports) {
    const result = await sendScheduledReport(report.id);
    results.push({ reportId: report.id, ...result });
  }

  return results;
}

/**
 * Send a test report immediately
 */
export async function sendTestReport(reportId: string, userId: string) {
  const report = await getScheduledReport(reportId, userId);
  if (!report) throw new Error("Report not found");

  return sendScheduledReport(reportId);
}

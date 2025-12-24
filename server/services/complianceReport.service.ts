import { getDb } from "../db";
import { 
  complianceReports, 
  auditLogs, 
  organizationMemberships, 
  users,
  ipAllowlist,
  ipAllowlistSettings,
  twoFactorSettings,
  workspacePermissionOverrides
} from "../../drizzle/schema";
import { eq, and, gte, lte, count, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { storagePut } from "../storage";

export type ReportType = "security_audit" | "access_patterns" | "compliance_summary";
export type ReportFormat = "pdf" | "csv" | "json";
export type ReportStatus = "pending" | "generating" | "completed" | "failed";

interface ReportSummary {
  totalEvents: number;
  securityScore: number;
  criticalFindings: number;
  warnings: number;
  recommendations: string[];
  [key: string]: unknown;
}

/**
 * Create a new compliance report request
 */
export async function createReport(
  organizationId: string,
  requestedBy: string,
  options: {
    reportType: ReportType;
    format: ReportFormat;
    periodStart: Date;
    periodEnd: Date;
  }
): Promise<{ id: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();
  
  await db.insert(complianceReports).values({
    id,
    organizationId,
    reportType: options.reportType,
    format: options.format,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    requestedBy,
    status: "pending",
  });

  // Start generating the report asynchronously
  generateReport(id).catch(console.error);

  return { id };
}

/**
 * Get a compliance report by ID
 */
export async function getReport(id: string) {
  const db = await getDb();
  if (!db) return null;

  const [report] = await db
    .select()
    .from(complianceReports)
    .where(eq(complianceReports.id, id))
    .limit(1);

  return report || null;
}

/**
 * List compliance reports for a workspace
 */
export async function listReports(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return { reports: [], total: 0 };

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const reports = await db
    .select()
    .from(complianceReports)
    .where(eq(complianceReports.organizationId, organizationId))
    .orderBy(desc(complianceReports.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(complianceReports)
    .where(eq(complianceReports.organizationId, organizationId));

  return { reports, total };
}

/**
 * Generate the compliance report
 */
async function generateReport(reportId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Update status to generating
  await db
    .update(complianceReports)
    .set({ status: "generating" })
    .where(eq(complianceReports.id, reportId));

  try {
    const report = await getReport(reportId);
    if (!report) throw new Error("Report not found");

    let content: string;
    let summary: ReportSummary;

    switch (report.reportType) {
      case "security_audit":
        ({ content, summary } = await generateSecurityAuditReport(
          report.organizationId,
          report.periodStart,
          report.periodEnd,
          report.format as ReportFormat
        ));
        break;
      case "access_patterns":
        ({ content, summary } = await generateAccessPatternsReport(
          report.organizationId,
          report.periodStart,
          report.periodEnd,
          report.format as ReportFormat
        ));
        break;
      case "compliance_summary":
        ({ content, summary } = await generateComplianceSummaryReport(
          report.organizationId,
          report.periodStart,
          report.periodEnd,
          report.format as ReportFormat
        ));
        break;
      default:
        throw new Error(`Unknown report type: ${report.reportType}`);
    }

    // Upload to S3
    const fileName = `compliance-reports/${report.organizationId}/${reportId}.${report.format}`;
    const contentType = getContentType(report.format as ReportFormat);
    const { url } = await storagePut(fileName, content, contentType);

    // Update report with results
    await db
      .update(complianceReports)
      .set({
        status: "completed",
        fileUrl: url,
        summary: summary as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(complianceReports.id, reportId));

  } catch (error) {
    console.error("Report generation failed:", error);
    await db
      .update(complianceReports)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(complianceReports.id, reportId));
  }
}

/**
 * Generate Security Audit Report
 */
async function generateSecurityAuditReport(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  format: ReportFormat
): Promise<{ content: string; summary: ReportSummary }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gather security data
  const [
    auditEvents,
    permissionDenials,
    deletionEvents,
    roleChanges,
    loginFailures,
  ] = await Promise.all([
    // Total audit events
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
    
    // Permission denials
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.eventType, "permission_denied"),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
    
    // Deletion events
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.action, "delete"),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
    
    // Role changes
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.eventType, "role_changed"),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
    
    // Login failures
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.eventType, "login_failed"),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
  ]);

  // Get team members with 2FA status
  const members = await db
    .select({
      userId: organizationMemberships.userId,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.organizationId, organizationId));

  const twoFactorEnabled = await Promise.all(
    members.map(async (m) => {
      const [settings] = await db
        .select({ enabled: twoFactorSettings.enabled })
        .from(twoFactorSettings)
        .where(eq(twoFactorSettings.userId, m.userId))
        .limit(1);
      return settings?.enabled || false;
    })
  );

  const twoFactorCount = twoFactorEnabled.filter(Boolean).length;

  // Get IP allowlist status
  const [ipSettings] = await db
    .select()
    .from(ipAllowlistSettings)
    .where(eq(ipAllowlistSettings.organizationId, organizationId))
    .limit(1);

  // Calculate security score
  const securityScore = calculateSecurityScore({
    twoFactorPercentage: members.length > 0 ? (twoFactorCount / members.length) * 100 : 0,
    ipAllowlistEnabled: ipSettings?.enabled || false,
    permissionDenials: permissionDenials[0]?.count || 0,
    loginFailures: loginFailures[0]?.count || 0,
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (twoFactorCount < members.length) {
    recommendations.push(`Enable 2FA for all ${members.length - twoFactorCount} users without it`);
  }
  if (!ipSettings?.enabled) {
    recommendations.push("Consider enabling IP allowlisting for additional security");
  }
  if ((permissionDenials[0]?.count || 0) > 10) {
    recommendations.push("Review permission denials - users may need role adjustments");
  }
  if ((loginFailures[0]?.count || 0) > 5) {
    recommendations.push("Investigate login failures for potential security threats");
  }

  const summary: ReportSummary = {
    totalEvents: auditEvents[0]?.count || 0,
    securityScore,
    criticalFindings: (loginFailures[0]?.count || 0) > 10 ? 1 : 0,
    warnings: (permissionDenials[0]?.count || 0) > 5 ? 1 : 0,
    recommendations,
    details: {
      permissionDenials: permissionDenials[0]?.count || 0,
      deletionEvents: deletionEvents[0]?.count || 0,
      roleChanges: roleChanges[0]?.count || 0,
      loginFailures: loginFailures[0]?.count || 0,
      twoFactorAdoption: `${twoFactorCount}/${members.length}`,
      ipAllowlistEnabled: ipSettings?.enabled || false,
    },
  };

  const content = formatReport(
    "Security Audit Report",
    organizationId,
    periodStart,
    periodEnd,
    summary,
    format
  );

  return { content, summary };
}

/**
 * Generate Access Patterns Report
 */
async function generateAccessPatternsReport(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  format: ReportFormat
): Promise<{ content: string; summary: ReportSummary }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get access patterns by user
  const userActivity = await db
    .select({
      userId: auditLogs.userId,
      userName: auditLogs.userName,
      eventCount: count(),
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.organizationId, organizationId),
      gte(auditLogs.createdAt, periodStart),
      lte(auditLogs.createdAt, periodEnd)
    ))
    .groupBy(auditLogs.userId, auditLogs.userName)
    .orderBy(desc(count()));

  // Get access patterns by resource type
  const resourceActivity = await db
    .select({
      resourceType: auditLogs.resourceType,
      eventCount: count(),
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.organizationId, organizationId),
      gte(auditLogs.createdAt, periodStart),
      lte(auditLogs.createdAt, periodEnd)
    ))
    .groupBy(auditLogs.resourceType)
    .orderBy(desc(count()));

  // Get access patterns by action
  const actionActivity = await db
    .select({
      action: auditLogs.action,
      eventCount: count(),
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.organizationId, organizationId),
      gte(auditLogs.createdAt, periodStart),
      lte(auditLogs.createdAt, periodEnd)
    ))
    .groupBy(auditLogs.action)
    .orderBy(desc(count()));

  const totalEvents = userActivity.reduce((sum, u) => sum + (u.eventCount || 0), 0);

  const summary: ReportSummary = {
    totalEvents,
    securityScore: 100,
    criticalFindings: 0,
    warnings: 0,
    recommendations: [],
    details: {
      activeUsers: userActivity.length,
      topUsers: userActivity.slice(0, 5).map(u => ({
        name: u.userName || "Unknown",
        events: u.eventCount,
      })),
      resourceBreakdown: resourceActivity.map(r => ({
        type: r.resourceType || "Unknown",
        events: r.eventCount,
      })),
      actionBreakdown: actionActivity.map(a => ({
        action: a.action || "Unknown",
        events: a.eventCount,
      })),
    },
  };

  const content = formatReport(
    "Access Patterns Report",
    organizationId,
    periodStart,
    periodEnd,
    summary,
    format
  );

  return { content, summary };
}

/**
 * Generate Compliance Summary Report
 */
async function generateComplianceSummaryReport(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  format: ReportFormat
): Promise<{ content: string; summary: ReportSummary }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all compliance-related data
  const [
    totalMembers,
    twoFactorUsers,
    ipAllowlistEntries,
    permissionOverrides,
    auditEventCount,
  ] = await Promise.all([
    db.select({ count: count() })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, organizationId)),
    
    db.select({ count: count() })
      .from(twoFactorSettings)
      .innerJoin(organizationMemberships, eq(twoFactorSettings.userId, organizationMemberships.userId))
      .where(and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(twoFactorSettings.enabled, true)
      )),
    
    db.select({ count: count() })
      .from(ipAllowlist)
      .where(and(
        eq(ipAllowlist.organizationId, organizationId),
        eq(ipAllowlist.enabled, true)
      )),
    
    db.select({ count: count() })
      .from(workspacePermissionOverrides)
      .where(eq(workspacePermissionOverrides.organizationId, organizationId)),
    
    db.select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        gte(auditLogs.createdAt, periodStart),
        lte(auditLogs.createdAt, periodEnd)
      )),
  ]);

  // Get IP allowlist settings
  const [ipSettings] = await db
    .select()
    .from(ipAllowlistSettings)
    .where(eq(ipAllowlistSettings.organizationId, organizationId))
    .limit(1);

  const memberCount = totalMembers[0]?.count || 0;
  const twoFactorCount = twoFactorUsers[0]?.count || 0;
  const twoFactorPercentage = memberCount > 0 ? Math.round((twoFactorCount / memberCount) * 100) : 0;

  // Compliance checks
  const complianceChecks = [
    {
      name: "Two-Factor Authentication",
      status: twoFactorPercentage >= 100 ? "compliant" : twoFactorPercentage >= 50 ? "partial" : "non-compliant",
      details: `${twoFactorCount}/${memberCount} users (${twoFactorPercentage}%)`,
    },
    {
      name: "IP Allowlisting",
      status: ipSettings?.enabled ? "compliant" : "non-compliant",
      details: ipSettings?.enabled ? `${ipAllowlistEntries[0]?.count || 0} IPs configured` : "Not enabled",
    },
    {
      name: "Audit Logging",
      status: "compliant",
      details: `${auditEventCount[0]?.count || 0} events logged`,
    },
    {
      name: "Permission Management",
      status: "compliant",
      details: `${permissionOverrides[0]?.count || 0} custom overrides`,
    },
  ];

  const compliantCount = complianceChecks.filter(c => c.status === "compliant").length;
  const complianceScore = Math.round((compliantCount / complianceChecks.length) * 100);

  const recommendations: string[] = [];
  complianceChecks.forEach(check => {
    if (check.status === "non-compliant") {
      recommendations.push(`Address ${check.name}: ${check.details}`);
    } else if (check.status === "partial") {
      recommendations.push(`Improve ${check.name}: ${check.details}`);
    }
  });

  const summary: ReportSummary = {
    totalEvents: auditEventCount[0]?.count || 0,
    securityScore: complianceScore,
    criticalFindings: complianceChecks.filter(c => c.status === "non-compliant").length,
    warnings: complianceChecks.filter(c => c.status === "partial").length,
    recommendations,
    details: {
      complianceChecks,
      overallCompliance: `${compliantCount}/${complianceChecks.length} checks passed`,
    },
  };

  const content = formatReport(
    "Compliance Summary Report",
    organizationId,
    periodStart,
    periodEnd,
    summary,
    format
  );

  return { content, summary };
}

/**
 * Format report content based on format type
 */
function formatReport(
  title: string,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  summary: ReportSummary,
  format: ReportFormat
): string {
  const reportDate = new Date().toISOString();
  
  switch (format) {
    case "json":
      return JSON.stringify({
        title,
        organizationId,
        generatedAt: reportDate,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary,
      }, null, 2);

    case "csv":
      return generateCsvReport(title, periodStart, periodEnd, summary);

    case "pdf":
      // For PDF, we'll generate HTML that can be converted
      // In production, you'd use a library like puppeteer or pdfkit
      return generateHtmlReport(title, organizationId, periodStart, periodEnd, summary);

    default:
      return JSON.stringify(summary);
  }
}

/**
 * Generate CSV report content
 */
function generateCsvReport(
  title: string,
  periodStart: Date,
  periodEnd: Date,
  summary: ReportSummary
): string {
  const lines: string[] = [];
  
  lines.push(`"${title}"`);
  lines.push(`"Period","${periodStart.toISOString()}","${periodEnd.toISOString()}"`);
  lines.push(`"Generated","${new Date().toISOString()}"`);
  lines.push("");
  lines.push(`"Metric","Value"`);
  lines.push(`"Total Events","${summary.totalEvents}"`);
  lines.push(`"Security Score","${summary.securityScore}%"`);
  lines.push(`"Critical Findings","${summary.criticalFindings}"`);
  lines.push(`"Warnings","${summary.warnings}"`);
  lines.push("");
  lines.push(`"Recommendations"`);
  summary.recommendations.forEach(rec => {
    lines.push(`"${rec}"`);
  });

  if (summary.details && typeof summary.details === "object") {
    lines.push("");
    lines.push(`"Details"`);
    Object.entries(summary.details).forEach(([key, value]) => {
      if (typeof value === "object") {
        lines.push(`"${key}","${JSON.stringify(value)}"`);
      } else {
        lines.push(`"${key}","${value}"`);
      }
    });
  }

  return lines.join("\n");
}

/**
 * Generate HTML report content (for PDF conversion)
 */
function generateHtmlReport(
  title: string,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  summary: ReportSummary
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
    .score { font-size: 48px; font-weight: bold; color: ${summary.securityScore >= 80 ? '#22c55e' : summary.securityScore >= 50 ? '#f59e0b' : '#ef4444'}; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .stat { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .stat-label { color: #6b7280; font-size: 12px; }
    .recommendations { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .recommendations h3 { color: #92400e; margin-top: 0; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .recommendations li { color: #78350f; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p>Organization: ${organizationId}</p>
    <p>Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>

  <h2>Security Score</h2>
  <div class="score">${summary.securityScore}%</div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${summary.totalEvents}</div>
      <div class="stat-label">Total Events</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.criticalFindings}</div>
      <div class="stat-label">Critical Findings</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.warnings}</div>
      <div class="stat-label">Warnings</div>
    </div>
  </div>

  ${summary.recommendations.length > 0 ? `
  <div class="recommendations">
    <h3>Recommendations</h3>
    <ul>
      ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('\n')}
    </ul>
  </div>
  ` : ''}

  ${summary.details ? `
  <h2>Details</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    ${Object.entries(summary.details).map(([key, value]) => `
      <tr>
        <td>${key}</td>
        <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
      </tr>
    `).join('\n')}
  </table>
  ` : ''}

  <div class="footer">
    <p>This report was automatically generated by PromptForge Security Compliance System.</p>
    <p>For questions or concerns, contact your workspace administrator.</p>
  </div>
</body>
</html>`;
}

/**
 * Calculate security score
 */
function calculateSecurityScore(metrics: {
  twoFactorPercentage: number;
  ipAllowlistEnabled: boolean;
  permissionDenials: number;
  loginFailures: number;
}): number {
  let score = 100;

  // 2FA adoption (up to 30 points)
  score -= Math.max(0, 30 - (metrics.twoFactorPercentage * 0.3));

  // IP allowlist (10 points)
  if (!metrics.ipAllowlistEnabled) {
    score -= 10;
  }

  // Permission denials penalty (up to 20 points)
  if (metrics.permissionDenials > 0) {
    score -= Math.min(20, metrics.permissionDenials * 2);
  }

  // Login failures penalty (up to 20 points)
  if (metrics.loginFailures > 0) {
    score -= Math.min(20, metrics.loginFailures * 4);
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get content type for format
 */
function getContentType(format: ReportFormat): string {
  switch (format) {
    case "json": return "application/json";
    case "csv": return "text/csv";
    case "pdf": return "text/html"; // We generate HTML, would need PDF conversion
    default: return "text/plain";
  }
}

/**
 * Delete a compliance report
 */
export async function deleteReport(
  organizationId: string,
  reportId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(complianceReports)
    .where(and(
      eq(complianceReports.id, reportId),
      eq(complianceReports.organizationId, organizationId)
    ));

  return true;
}

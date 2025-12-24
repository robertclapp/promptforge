import { mysqlTable, varchar, text, boolean, timestamp, json, mysqlEnum, int } from "drizzle-orm/mysql-core";

/**
 * Scheduled report configurations
 */
export const scheduledReports = mysqlTable("scheduled_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  workspaceId: varchar("workspace_id", { length: 64 }),
  
  // Report settings
  name: varchar("name", { length: 255 }).notNull(),
  reportType: mysqlEnum("report_type", [
    "api_usage",
    "security_summary",
    "evaluation_metrics",
    "budget_status",
    "team_activity",
    "comprehensive"
  ]).notNull(),
  
  // Schedule settings
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly reports (0 = Sunday)
  dayOfMonth: int("day_of_month"), // 1-31 for monthly reports
  hour: int("hour").notNull().default(9), // Hour to send (0-23)
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  
  // Delivery settings
  emailRecipients: json("email_recipients").$type<string[]>().notNull(),
  includeAttachment: boolean("include_attachment").notNull().default(true),
  attachmentFormat: mysqlEnum("attachment_format", ["pdf", "csv", "json"]).default("pdf"),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Report delivery history
 */
export const reportDeliveries = mysqlTable("report_deliveries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  reportId: varchar("report_id", { length: 64 }).notNull(),
  
  // Delivery details
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  recipients: json("recipients").$type<string[]>().notNull(),
  
  // Status
  status: mysqlEnum("status", ["sent", "failed", "partial"]).notNull(),
  errorMessage: text("error_message"),
  
  // Report data snapshot
  reportData: json("report_data").$type<Record<string, unknown>>(),
  attachmentUrl: varchar("attachment_url", { length: 512 }),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Email notification preferences
 */
export const emailPreferences = mysqlTable("email_preferences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  
  // Notification types
  securityAlerts: boolean("security_alerts").notNull().default(true),
  evaluationComplete: boolean("evaluation_complete").notNull().default(true),
  budgetWarnings: boolean("budget_warnings").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  monthlyReport: boolean("monthly_report").notNull().default(false),
  teamUpdates: boolean("team_updates").notNull().default(true),
  
  // Delivery preferences
  emailAddress: varchar("email_address", { length: 255 }),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

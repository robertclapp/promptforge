import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Export Schedules - for automatic periodic backups
 */
export const exportSchedules = mysqlTable("exportSchedules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Schedule configuration
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).notNull(),
  dayOfWeek: int("dayOfWeek"), // 0-6 for weekly (0 = Sunday)
  dayOfMonth: int("dayOfMonth"), // 1-31 for monthly
  hour: int("hour").default(0).notNull(), // 0-23 UTC
  minute: int("minute").default(0).notNull(), // 0-59
  // Export options
  exportAll: boolean("exportAll").default(true).notNull(),
  promptIds: json("promptIds").$type<string[]>(), // Specific prompts to export if not exportAll
  includeVersions: boolean("includeVersions").default(true).notNull(),
  includeVariables: boolean("includeVariables").default(true).notNull(),
  // Notification preferences
  notifyOnSuccess: boolean("notifyOnSuccess").default(true).notNull(),
  notifyOnFailure: boolean("notifyOnFailure").default(true).notNull(),
  // Compression option
  enableCompression: boolean("enableCompression").default(false).notNull(),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastExportUrl: varchar("lastExportUrl", { length: 1000 }),
  lastExportError: text("lastExportError"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ExportSchedule = typeof exportSchedules.$inferSelect;
export type InsertExportSchedule = typeof exportSchedules.$inferInsert;

/**
 * Import/Export History - tracks all import and export operations
 */
export const importExportHistory = mysqlTable("importExportHistory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  // Operation type
  operationType: mysqlEnum("operationType", ["export", "import"]).notNull(),
  // Status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  // Export-specific fields
  exportUrl: varchar("exportUrl", { length: 1000 }),
  exportFileName: varchar("exportFileName", { length: 255 }),
  exportFileSize: int("exportFileSize"), // in bytes
  exportPromptCount: int("exportPromptCount"),
  exportVersionCount: int("exportVersionCount"),
  isCompressed: boolean("isCompressed").default(false),
  // Import-specific fields
  importFileName: varchar("importFileName", { length: 255 }),
  importFileSize: int("importFileSize"), // in bytes
  importedCount: int("importedCount"),
  skippedCount: int("skippedCount"),
  overwriteExisting: boolean("overwriteExisting").default(false),
  importPrefix: varchar("importPrefix", { length: 100 }),
  // Error tracking
  errorMessage: text("errorMessage"),
  errorDetails: json("errorDetails").$type<string[]>(),
  // Schedule reference (if triggered by schedule)
  scheduleId: varchar("scheduleId", { length: 64 }),
  // Timestamps
  startedAt: timestamp("startedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  // Expiration for export URLs (default 7 days)
  expiresAt: timestamp("expiresAt"),
});

export type ImportExportHistory = typeof importExportHistory.$inferSelect;
export type InsertImportExportHistory = typeof importExportHistory.$inferInsert;

/**
 * Export Templates - reusable export configurations
 */
export const exportTemplates = mysqlTable("exportTemplates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Export configuration
  exportAll: boolean("exportAll").default(true).notNull(),
  promptIds: json("promptIds").$type<string[]>(),
  includeVersions: boolean("includeVersions").default(true).notNull(),
  includeVariables: boolean("includeVariables").default(true).notNull(),
  enableCompression: boolean("enableCompression").default(false).notNull(),
  // Schedule configuration (for use with scheduled exports)
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]),
  dayOfWeek: int("dayOfWeek"),
  dayOfMonth: int("dayOfMonth"),
  hour: int("hour").default(0),
  minute: int("minute").default(0),
  // Notification preferences
  notifyOnSuccess: boolean("notifyOnSuccess").default(true).notNull(),
  notifyOnFailure: boolean("notifyOnFailure").default(true).notNull(),
  // Usage tracking
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = typeof exportTemplates.$inferInsert;

/**
 * Export Shares - shareable links for exports with access controls
 */
export const exportShares = mysqlTable("exportShares", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  // Share configuration
  shareCode: varchar("shareCode", { length: 32 }).notNull().unique(),
  exportHistoryId: varchar("exportHistoryId", { length: 64 }).notNull(),
  // Access controls
  password: varchar("password", { length: 255 }), // Hashed password if protected
  maxDownloads: int("maxDownloads"), // null = unlimited
  downloadCount: int("downloadCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"), // null = never expires
  // Permissions
  allowPreview: boolean("allowPreview").default(true).notNull(),
  allowDownload: boolean("allowDownload").default(true).notNull(),
  // Tracking
  lastAccessedAt: timestamp("lastAccessedAt"),
  accessLog: json("accessLog").$type<Array<{ ip: string; userAgent: string; timestamp: string }>>(),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ExportShare = typeof exportShares.$inferSelect;
export type InsertExportShare = typeof exportShares.$inferInsert;


/**
 * Export Versions - track multiple versions of exports for comparison and restore
 */
export const exportVersions = mysqlTable("exportVersions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  // Version info
  versionNumber: int("versionNumber").notNull(),
  versionName: varchar("versionName", { length: 255 }),
  description: text("description"),
  // Export reference
  exportHistoryId: varchar("exportHistoryId", { length: 64 }).notNull(),
  exportUrl: varchar("exportUrl", { length: 1000 }).notNull(),
  exportFileName: varchar("exportFileName", { length: 255 }),
  exportFileSize: int("exportFileSize"),
  // Content summary
  promptCount: int("promptCount").default(0).notNull(),
  versionCount: int("versionCount").default(0).notNull(),
  promptIds: json("promptIds").$type<string[]>(),
  // Snapshot of prompt names for quick comparison
  promptSummary: json("promptSummary").$type<Array<{ id: string; name: string; updatedAt: string }>>(),
  // Metadata
  isCompressed: boolean("isCompressed").default(false),
  isEncrypted: boolean("isEncrypted").default(false),
  checksum: varchar("checksum", { length: 64 }), // SHA-256 hash for integrity
  // Tags for organization
  tags: json("tags").$type<string[]>(),
  // Status
  isArchived: boolean("isArchived").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
});

export type ExportVersion = typeof exportVersions.$inferSelect;
export type InsertExportVersion = typeof exportVersions.$inferInsert;

/**
 * Export Webhooks - configure webhooks for export events
 */
export const exportWebhooks = mysqlTable("exportWebhooks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  // Webhook configuration
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 1000 }).notNull(),
  // Authentication
  secret: varchar("secret", { length: 255 }), // For HMAC signature
  headers: json("headers").$type<Record<string, string>>(), // Custom headers
  // Event triggers
  triggerOnExportComplete: boolean("triggerOnExportComplete").default(true).notNull(),
  triggerOnExportFailed: boolean("triggerOnExportFailed").default(true).notNull(),
  triggerOnImportComplete: boolean("triggerOnImportComplete").default(false).notNull(),
  triggerOnImportFailed: boolean("triggerOnImportFailed").default(false).notNull(),
  triggerOnScheduledExport: boolean("triggerOnScheduledExport").default(true).notNull(),
  triggerOnShareAccess: boolean("triggerOnShareAccess").default(false).notNull(),
  // Retry configuration
  maxRetries: int("maxRetries").default(3).notNull(),
  retryDelaySeconds: int("retryDelaySeconds").default(60).notNull(),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  lastSuccessAt: timestamp("lastSuccessAt"),
  lastFailureAt: timestamp("lastFailureAt"),
  lastErrorMessage: text("lastErrorMessage"),
  // Statistics
  totalTriggers: int("totalTriggers").default(0).notNull(),
  successCount: int("successCount").default(0).notNull(),
  failureCount: int("failureCount").default(0).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ExportWebhook = typeof exportWebhooks.$inferSelect;
export type InsertExportWebhook = typeof exportWebhooks.$inferInsert;

/**
 * Export Webhook Deliveries - track individual webhook delivery attempts
 */
export const exportWebhookDeliveries = mysqlTable("exportWebhookDeliveries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  webhookId: varchar("webhookId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  // Event info
  eventType: mysqlEnum("eventType", [
    "export_complete",
    "export_failed",
    "import_complete",
    "import_failed",
    "scheduled_export",
    "share_access",
  ]).notNull(),
  eventPayload: json("eventPayload").$type<Record<string, unknown>>(),
  // Delivery status
  status: mysqlEnum("status", ["pending", "success", "failed", "retrying"]).default("pending").notNull(),
  // Response info
  responseStatus: int("responseStatus"),
  responseBody: text("responseBody"),
  responseTimeMs: int("responseTimeMs"),
  // Retry tracking
  attemptCount: int("attemptCount").default(0).notNull(),
  nextRetryAt: timestamp("nextRetryAt"),
  // Error tracking
  errorMessage: text("errorMessage"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  deliveredAt: timestamp("deliveredAt"),
});

export type ExportWebhookDelivery = typeof exportWebhookDeliveries.$inferSelect;
export type InsertExportWebhookDelivery = typeof exportWebhookDeliveries.$inferInsert;

/**
 * Export Audit Log - detailed audit trail for compliance
 */
export const exportAuditLog = mysqlTable("exportAuditLog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }),
  organizationId: varchar("organizationId", { length: 64 }),
  // Action details
  action: mysqlEnum("action", [
    "export_created",
    "export_downloaded",
    "export_shared",
    "export_share_accessed",
    "export_share_downloaded",
    "export_deleted",
    "export_encrypted",
    "export_decrypted",
    "import_started",
    "import_completed",
    "import_failed",
    "version_created",
    "version_restored",
    "version_compared",
    "webhook_triggered",
    "schedule_created",
    "schedule_updated",
    "schedule_deleted",
    "schedule_triggered",
    "template_used",
  ]).notNull(),
  // Resource references
  resourceType: mysqlEnum("resourceType", [
    "export",
    "import",
    "share",
    "version",
    "webhook",
    "schedule",
    "template",
  ]).notNull(),
  resourceId: varchar("resourceId", { length: 64 }).notNull(),
  // Actor info (who performed the action)
  actorType: mysqlEnum("actorType", ["user", "system", "anonymous"]).default("user").notNull(),
  actorId: varchar("actorId", { length: 64 }),
  actorName: varchar("actorName", { length: 255 }),
  actorEmail: varchar("actorEmail", { length: 255 }),
  // Request context
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv6 compatible
  userAgent: text("userAgent"),
  requestId: varchar("requestId", { length: 64 }),
  // Additional details
  details: json("details").$type<Record<string, unknown>>(),
  // Metadata
  metadata: json("metadata").$type<{
    exportFileName?: string;
    promptCount?: number;
    fileSize?: number;
    shareCode?: string;
    versionNumber?: number;
    webhookUrl?: string;
    scheduleName?: string;
    templateName?: string;
    errorMessage?: string;
  }>(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ExportAuditLog = typeof exportAuditLog.$inferSelect;
export type InsertExportAuditLog = typeof exportAuditLog.$inferInsert;

/**
 * Export Audit Log Settings - user preferences for audit logging
 */
export const exportAuditSettings = mysqlTable("exportAuditSettings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  organizationId: varchar("organizationId", { length: 64 }),
  // Retention settings
  retentionDays: int("retentionDays").default(90).notNull(),
  // What to log
  logExports: boolean("logExports").default(true).notNull(),
  logImports: boolean("logImports").default(true).notNull(),
  logShares: boolean("logShares").default(true).notNull(),
  logVersions: boolean("logVersions").default(true).notNull(),
  logWebhooks: boolean("logWebhooks").default(true).notNull(),
  logSchedules: boolean("logSchedules").default(true).notNull(),
  // IP logging preferences
  logIpAddresses: boolean("logIpAddresses").default(true).notNull(),
  logUserAgents: boolean("logUserAgents").default(true).notNull(),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type ExportAuditSettings = typeof exportAuditSettings.$inferSelect;
export type InsertExportAuditSettings = typeof exportAuditSettings.$inferInsert;

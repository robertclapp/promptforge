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

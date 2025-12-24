import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  int,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Data export requests for GDPR compliance
 */
export const dataExportRequests = mysqlTable("data_export_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Export configuration
  exportType: mysqlEnum("exportType", ["full", "prompts", "evaluations", "settings", "activity"]).notNull(),
  format: mysqlEnum("format", ["json", "csv", "zip"]).default("zip").notNull(),
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "expired"]).default("pending").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  
  // File information
  fileUrl: text("fileUrl"),
  fileSize: int("fileSize"), // bytes
  
  // Metadata
  includedData: json("includedData").$type<string[]>(), // List of data types included
  errorMessage: text("errorMessage"),
  
  // Timestamps
  requestedAt: timestamp("requestedAt").defaultNow(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"), // Download link expiration
});

export type DataExportRequest = typeof dataExportRequests.$inferSelect;
export type InsertDataExportRequest = typeof dataExportRequests.$inferInsert;

/**
 * Data deletion requests for GDPR right to erasure
 */
export const dataDeletionRequests = mysqlTable("data_deletion_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Deletion scope
  deletionType: mysqlEnum("deletionType", ["full", "prompts", "evaluations", "activity"]).notNull(),
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  // Confirmation
  confirmationCode: varchar("confirmationCode", { length: 64 }),
  confirmedAt: timestamp("confirmedAt"),
  
  // Metadata
  deletedRecords: int("deletedRecords").default(0).notNull(),
  errorMessage: text("errorMessage"),
  
  // Timestamps
  requestedAt: timestamp("requestedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type InsertDataDeletionRequest = typeof dataDeletionRequests.$inferInsert;

import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Audit event types for tracking different actions
 */
export const auditEventTypes = [
  // Permission events
  "permission_denied",
  "permission_granted",
  
  // Resource operations
  "prompt_created",
  "prompt_updated",
  "prompt_deleted",
  "evaluation_created",
  "evaluation_deleted",
  "ai_provider_created",
  "ai_provider_updated",
  "ai_provider_deleted",
  "context_package_created",
  "context_package_updated",
  "context_package_deleted",
  "budget_created",
  "budget_updated",
  "budget_deleted",
  "test_suite_created",
  "test_suite_deleted",
  "test_suite_run",
  "optimization_created",
  "optimization_applied",
  "template_published",
  "template_unpublished",
  
  // Team management
  "team_created",
  "team_updated",
  "team_deleted",
  "member_invited",
  "member_removed",
  "member_role_changed",
  "invitation_accepted",
  "invitation_rejected",
  
  // Billing events
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "payment_succeeded",
  "payment_failed",
  
  // API events
  "api_key_created",
  "api_key_revoked",
  "api_key_deleted",
  "api_rate_limit_exceeded",
  
  // Security events
  "login_success",
  "login_failed",
  "logout",
  "password_changed",
  "settings_changed",
] as const;

export type AuditEventType = typeof auditEventTypes[number];

/**
 * Audit Logs - Track all sensitive operations for compliance and security
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  // Who performed the action
  userId: varchar("userId", { length: 64 }),
  userName: varchar("userName", { length: 255 }),
  userEmail: varchar("userEmail", { length: 320 }),
  userRole: mysqlEnum("userRole", ["viewer", "member", "admin", "owner"]),
  
  // Where the action was performed
  organizationId: varchar("organizationId", { length: 64 }),
  organizationName: varchar("organizationName", { length: 255 }),
  
  // What action was performed
  eventType: varchar("eventType", { length: 64 }).notNull(),
  eventCategory: mysqlEnum("eventCategory", [
    "permission",
    "resource",
    "team",
    "billing",
    "api",
    "security",
  ]).notNull(),
  
  // Resource details
  resourceType: varchar("resourceType", { length: 64 }),
  resourceId: varchar("resourceId", { length: 64 }),
  resourceName: varchar("resourceName", { length: 255 }),
  
  // Action details
  action: mysqlEnum("action", ["create", "read", "update", "delete", "execute", "denied", "alert"]).notNull(),
  status: mysqlEnum("status", ["success", "failure", "denied"]).notNull(),
  
  // Additional context
  details: json("details").$type<Record<string, unknown>>(),
  previousValue: json("previousValue").$type<Record<string, unknown>>(),
  newValue: json("newValue").$type<Record<string, unknown>>(),
  
  // Request metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  requestId: varchar("requestId", { length: 64 }),
  
  // Permission context (for permission_denied events)
  requiredPermission: varchar("requiredPermission", { length: 64 }),
  userPermissions: json("userPermissions").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  organizationIdIdx: index("audit_logs_organization_id_idx").on(table.organizationId),
  eventTypeIdx: index("audit_logs_event_type_idx").on(table.eventType),
  eventCategoryIdx: index("audit_logs_event_category_idx").on(table.eventCategory),
  resourceTypeIdx: index("audit_logs_resource_type_idx").on(table.resourceType),
  resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  statusIdx: index("audit_logs_status_idx").on(table.status),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Workspace Permission Overrides - Custom permission settings per workspace
 */
export const workspacePermissionOverrides = mysqlTable("workspace_permission_overrides", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // The role being customized
  role: mysqlEnum("role", ["viewer", "member", "admin"]).notNull(),
  
  // Permission being overridden
  permission: varchar("permission", { length: 64 }).notNull(),
  
  // Whether to grant or deny this permission for this role
  granted: boolean("granted").notNull(),
  
  // Who made this change
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  // Unique constraint: one override per org/role/permission combination
  orgRolePermIdx: index("workspace_perm_org_role_perm_idx").on(
    table.organizationId, 
    table.role, 
    table.permission
  ),
  organizationIdIdx: index("workspace_perm_org_id_idx").on(table.organizationId),
}));

export type WorkspacePermissionOverride = typeof workspacePermissionOverrides.$inferSelect;
export type InsertWorkspacePermissionOverride = typeof workspacePermissionOverrides.$inferInsert;


/**
 * Security Alert Settings - Configure security alert thresholds per workspace
 */
export const securityAlertSettings = mysqlTable("security_alert_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Permission denial alerts
  permissionDenialThreshold: int("permissionDenialThreshold").default(5).notNull(),
  permissionDenialWindowMinutes: int("permissionDenialWindowMinutes").default(15).notNull(),
  
  // Bulk deletion alerts
  bulkDeletionThreshold: int("bulkDeletionThreshold").default(10).notNull(),
  bulkDeletionWindowMinutes: int("bulkDeletionWindowMinutes").default(30).notNull(),
  
  // Login attempt alerts
  loginAttemptThreshold: int("loginAttemptThreshold").default(5).notNull(),
  loginAttemptWindowMinutes: int("loginAttemptWindowMinutes").default(10).notNull(),
  
  // Enable/disable alerts
  enabled: boolean("enabled").default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("security_alert_org_id_idx").on(table.organizationId),
}));

export type SecurityAlertSettings = typeof securityAlertSettings.$inferSelect;
export type InsertSecurityAlertSettings = typeof securityAlertSettings.$inferInsert;

/**
 * Audit Log Retention Settings - Configure how long to keep audit logs
 */
export const auditRetentionSettings = mysqlTable("audit_retention_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Retention period in days (0 = keep forever)
  retentionDays: int("retentionDays").default(90).notNull(),
  
  // Archive old logs before deletion
  archiveBeforeDelete: boolean("archiveBeforeDelete").default(true).notNull(),
  
  // Last cleanup timestamp
  lastCleanupAt: timestamp("lastCleanupAt"),
  
  // Number of logs deleted in last cleanup
  lastCleanupCount: int("lastCleanupCount").default(0),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("audit_retention_org_id_idx").on(table.organizationId),
}));

export type AuditRetentionSettings = typeof auditRetentionSettings.$inferSelect;
export type InsertAuditRetentionSettings = typeof auditRetentionSettings.$inferInsert;

/**
 * Archived Audit Logs - Store archived audit logs for compliance
 */
export const archivedAuditLogs = mysqlTable("archived_audit_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Archive metadata
  archiveDate: timestamp("archiveDate").defaultNow().notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  logCount: int("logCount").notNull(),
  
  // Compressed JSON data of archived logs
  archivedData: json("archivedData").$type<Record<string, unknown>[]>(),
  
  // Archive file URL (if stored externally)
  archiveUrl: varchar("archiveUrl", { length: 512 }),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  organizationIdIdx: index("archived_audit_org_id_idx").on(table.organizationId),
  archiveDateIdx: index("archived_audit_date_idx").on(table.archiveDate),
}));

export type ArchivedAuditLog = typeof archivedAuditLogs.$inferSelect;
export type InsertArchivedAuditLog = typeof archivedAuditLogs.$inferInsert;

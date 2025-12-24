import {
  boolean,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Two-Factor Authentication Settings - Store 2FA configuration per user
 */
export const twoFactorSettings = mysqlTable("two_factor_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // TOTP secret (encrypted)
  secret: varchar("secret", { length: 255 }).notNull(),
  
  // Whether 2FA is enabled
  enabled: boolean("enabled").default(false).notNull(),
  
  // Whether setup is complete (user has verified first code)
  verified: boolean("verified").default(false).notNull(),
  
  // Backup codes (hashed, JSON array)
  backupCodes: json("backupCodes").$type<string[]>(),
  
  // Number of backup codes used
  backupCodesUsed: int("backupCodesUsed").default(0).notNull(),
  
  // Last successful 2FA verification
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  
  // Number of failed attempts (for rate limiting)
  failedAttempts: int("failedAttempts").default(0).notNull(),
  
  // Lockout until timestamp
  lockedUntil: timestamp("lockedUntil"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  userIdIdx: index("two_factor_user_id_idx").on(table.userId),
}));

export type TwoFactorSettings = typeof twoFactorSettings.$inferSelect;
export type InsertTwoFactorSettings = typeof twoFactorSettings.$inferInsert;

/**
 * Two-Factor Trusted Devices - Remember devices that have completed 2FA
 */
export const trustedDevices = mysqlTable("trusted_devices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Device identifier (hashed)
  deviceHash: varchar("deviceHash", { length: 255 }).notNull(),
  
  // Device info
  deviceName: varchar("deviceName", { length: 255 }),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  
  // Trust expiration
  expiresAt: timestamp("expiresAt").notNull(),
  
  // Last used
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("trusted_devices_user_id_idx").on(table.userId),
  deviceHashIdx: index("trusted_devices_device_hash_idx").on(table.deviceHash),
  expiresAtIdx: index("trusted_devices_expires_at_idx").on(table.expiresAt),
}));

export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type InsertTrustedDevice = typeof trustedDevices.$inferInsert;

/**
 * IP Allowlist - Restrict access to specific IP addresses/ranges
 */
export const ipAllowlist = mysqlTable("ip_allowlist", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // IP address or CIDR range (e.g., "192.168.1.0/24")
  ipAddress: varchar("ipAddress", { length: 50 }).notNull(),
  
  // Whether this is a CIDR range
  isCidr: boolean("isCidr").default(false).notNull(),
  
  // Description/label for this entry
  description: varchar("description", { length: 255 }),
  
  // Whether this entry is active
  enabled: boolean("enabled").default(true).notNull(),
  
  // Who created this entry
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("ip_allowlist_org_id_idx").on(table.organizationId),
  ipAddressIdx: index("ip_allowlist_ip_address_idx").on(table.ipAddress),
}));

export type IpAllowlistEntry = typeof ipAllowlist.$inferSelect;
export type InsertIpAllowlistEntry = typeof ipAllowlist.$inferInsert;

/**
 * IP Allowlist Settings - Global settings for IP allowlisting per workspace
 */
export const ipAllowlistSettings = mysqlTable("ip_allowlist_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Whether IP allowlisting is enabled
  enabled: boolean("enabled").default(false).notNull(),
  
  // Whether to enforce for API access
  enforceForApi: boolean("enforceForApi").default(true).notNull(),
  
  // Whether to enforce for web access
  enforceForWeb: boolean("enforceForWeb").default(false).notNull(),
  
  // Whether owners can bypass the allowlist
  ownersBypass: boolean("ownersBypass").default(true).notNull(),
  
  // Action on violation: "block" or "log"
  violationAction: varchar("violationAction", { length: 20 }).default("block").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("ip_allowlist_settings_org_id_idx").on(table.organizationId),
}));

export type IpAllowlistSettings = typeof ipAllowlistSettings.$inferSelect;
export type InsertIpAllowlistSettings = typeof ipAllowlistSettings.$inferInsert;

/**
 * Security Compliance Reports - Store generated compliance reports
 */
export const complianceReports = mysqlTable("compliance_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Report type
  reportType: varchar("reportType", { length: 50 }).notNull(), // "security_audit", "access_patterns", "compliance_summary"
  
  // Report period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  // Report format
  format: varchar("format", { length: 10 }).notNull(), // "pdf", "csv", "json"
  
  // Report file URL (S3)
  fileUrl: varchar("fileUrl", { length: 512 }),
  
  // Report status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending", "generating", "completed", "failed"
  
  // Report summary (JSON)
  summary: json("summary").$type<Record<string, unknown>>(),
  
  // Who requested the report
  requestedBy: varchar("requestedBy", { length: 64 }).notNull(),
  
  // Error message if failed
  errorMessage: text("errorMessage"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  organizationIdIdx: index("compliance_reports_org_id_idx").on(table.organizationId),
  statusIdx: index("compliance_reports_status_idx").on(table.status),
  createdAtIdx: index("compliance_reports_created_at_idx").on(table.createdAt),
}));

export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = typeof complianceReports.$inferInsert;

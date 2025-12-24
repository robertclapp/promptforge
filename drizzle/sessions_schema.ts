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
 * User Sessions - Track active login sessions across devices
 */
export const userSessions = mysqlTable("user_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Session token (hashed)
  tokenHash: varchar("tokenHash", { length: 255 }).notNull(),
  
  // Device information
  deviceName: varchar("deviceName", { length: 255 }),
  deviceType: varchar("deviceType", { length: 50 }), // desktop, mobile, tablet
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  userAgent: text("userAgent"),
  
  // Location information
  ipAddress: varchar("ipAddress", { length: 45 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  
  // Session status
  isActive: boolean("isActive").default(true).notNull(),
  isCurrent: boolean("isCurrent").default(false).notNull(),
  
  // Activity tracking
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  
  // Expiration
  expiresAt: timestamp("expiresAt").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => ({
  userIdIdx: index("user_sessions_user_id_idx").on(table.userId),
  tokenHashIdx: index("user_sessions_token_hash_idx").on(table.tokenHash),
  isActiveIdx: index("user_sessions_is_active_idx").on(table.isActive),
  expiresAtIdx: index("user_sessions_expires_at_idx").on(table.expiresAt),
}));

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

/**
 * Password Policies - Workspace-level password requirements
 */
export const passwordPolicies = mysqlTable("password_policies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  
  // Strength requirements
  minLength: int("minLength").default(8).notNull(),
  maxLength: int("maxLength").default(128).notNull(),
  requireUppercase: boolean("requireUppercase").default(true).notNull(),
  requireLowercase: boolean("requireLowercase").default(true).notNull(),
  requireNumbers: boolean("requireNumbers").default(true).notNull(),
  requireSpecialChars: boolean("requireSpecialChars").default(false).notNull(),
  
  // Expiration settings
  expirationDays: int("expirationDays").default(0).notNull(), // 0 = never expires
  warningDays: int("warningDays").default(14).notNull(), // Days before expiration to warn
  
  // History settings
  historyCount: int("historyCount").default(5).notNull(), // Number of previous passwords to remember
  
  // Lockout settings
  maxFailedAttempts: int("maxFailedAttempts").default(5).notNull(),
  lockoutDurationMinutes: int("lockoutDurationMinutes").default(15).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("password_policies_org_id_idx").on(table.organizationId),
}));

export type PasswordPolicy = typeof passwordPolicies.$inferSelect;
export type InsertPasswordPolicy = typeof passwordPolicies.$inferInsert;

/**
 * Password History - Track previous passwords to prevent reuse
 */
export const passwordHistory = mysqlTable("password_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Password hash
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("password_history_user_id_idx").on(table.userId),
  createdAtIdx: index("password_history_created_at_idx").on(table.createdAt),
}));

export type PasswordHistoryEntry = typeof passwordHistory.$inferSelect;
export type InsertPasswordHistoryEntry = typeof passwordHistory.$inferInsert;

/**
 * Security Onboarding Progress - Track workspace security setup progress
 */
export const securityOnboarding = mysqlTable("security_onboarding", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organizationId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(), // Who started the onboarding
  
  // Step completion status
  twoFactorSetup: boolean("twoFactorSetup").default(false).notNull(),
  ipAllowlistSetup: boolean("ipAllowlistSetup").default(false).notNull(),
  securityAlertsSetup: boolean("securityAlertsSetup").default(false).notNull(),
  passwordPolicySetup: boolean("passwordPolicySetup").default(false).notNull(),
  teamRolesReviewed: boolean("teamRolesReviewed").default(false).notNull(),
  auditLoggingReviewed: boolean("auditLoggingReviewed").default(false).notNull(),
  
  // Overall status
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  
  // Dismissal
  isDismissed: boolean("isDismissed").default(false).notNull(),
  dismissedAt: timestamp("dismissedAt"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  organizationIdIdx: index("security_onboarding_org_id_idx").on(table.organizationId),
  userIdIdx: index("security_onboarding_user_id_idx").on(table.userId),
}));

export type SecurityOnboarding = typeof securityOnboarding.$inferSelect;
export type InsertSecurityOnboarding = typeof securityOnboarding.$inferInsert;

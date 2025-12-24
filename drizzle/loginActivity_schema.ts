import {
  boolean,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Login activity tracking for security notifications
 */
export const loginActivities = mysqlTable("login_activities", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  
  // Device information
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  deviceName: varchar("deviceName", { length: 255 }),
  deviceType: varchar("deviceType", { length: 50 }), // desktop, mobile, tablet
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  userAgent: text("userAgent"),
  
  // Location information
  ipAddress: varchar("ipAddress", { length: 45 }),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("countryCode", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  
  // Login status
  loginStatus: varchar("loginStatus", { length: 20 }).notNull().default("success"), // success, failed, blocked
  failureReason: varchar("failureReason", { length: 255 }),
  
  // Flags
  isNewDevice: boolean("isNewDevice").default(false).notNull(),
  isNewLocation: boolean("isNewLocation").default(false).notNull(),
  isSuspicious: boolean("isSuspicious").default(false).notNull(),
  notificationSent: boolean("notificationSent").default(false).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
});

export type LoginActivity = typeof loginActivities.$inferSelect;
export type InsertLoginActivity = typeof loginActivities.$inferInsert;

/**
 * Known devices for a user (trusted devices)
 */
export const knownDevices = mysqlTable("known_devices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }).notNull(),
  deviceName: varchar("deviceName", { length: 255 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  firstSeenAt: timestamp("firstSeenAt").defaultNow(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow(),
  isTrusted: boolean("isTrusted").default(true).notNull(),
});

export type KnownDevice = typeof knownDevices.$inferSelect;
export type InsertKnownDevice = typeof knownDevices.$inferInsert;

/**
 * Known locations for a user
 */
export const knownLocations = mysqlTable("known_locations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("countryCode", { length: 10 }),
  firstSeenAt: timestamp("firstSeenAt").defaultNow(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow(),
  isTrusted: boolean("isTrusted").default(true).notNull(),
});

export type KnownLocation = typeof knownLocations.$inferSelect;
export type InsertKnownLocation = typeof knownLocations.$inferInsert;

/**
 * Login notification preferences
 */
export const loginNotificationSettings = mysqlTable("login_notification_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull().unique(),
  
  // Notification preferences
  notifyNewDevice: boolean("notifyNewDevice").default(true).notNull(),
  notifyNewLocation: boolean("notifyNewLocation").default(true).notNull(),
  notifyFailedLogin: boolean("notifyFailedLogin").default(true).notNull(),
  notifySuspiciousActivity: boolean("notifySuspiciousActivity").default(true).notNull(),
  
  // Notification channels
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  
  // Thresholds
  failedLoginThreshold: int("failedLoginThreshold").default(3).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type LoginNotificationSettings = typeof loginNotificationSettings.$inferSelect;
export type InsertLoginNotificationSettings = typeof loginNotificationSettings.$inferInsert;

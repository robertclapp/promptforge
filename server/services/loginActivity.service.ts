import { getDb } from "../db";
import { 
  loginActivities, 
  knownDevices, 
  knownLocations,
  loginNotificationSettings,
  users
} from "../../drizzle/schema";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { notifyOwner } from "../_core/notification";

/**
 * Generate a device fingerprint from user agent and other factors
 */
function generateDeviceFingerprint(userAgent: string | undefined, ipAddress: string | undefined): string {
  const data = `${userAgent || "unknown"}-${ipAddress || "unknown"}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Parse user agent to extract device info
 */
function parseUserAgent(userAgent: string | undefined): {
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return {
      deviceName: "Unknown Device",
      deviceType: "unknown",
      browser: "Unknown",
      os: "Unknown",
    };
  }

  let deviceType = "desktop";
  let browser = "Unknown";
  let os = "Unknown";

  // Detect device type
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // Detect browser
  if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/edge|edg/i.test(userAgent)) {
    browser = "Edge";
  } else if (/opera|opr/i.test(userAgent)) {
    browser = "Opera";
  }

  // Detect OS
  if (/windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = "macOS";
  } else if (/linux/i.test(userAgent)) {
    os = "Linux";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = "iOS";
  }

  const deviceName = `${browser} on ${os}`;

  return { deviceName, deviceType, browser, os };
}

/**
 * Check if this is a new device for the user
 */
async function isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;

  const [existing] = await db
    .select()
    .from(knownDevices)
    .where(and(
      eq(knownDevices.userId, userId),
      eq(knownDevices.deviceFingerprint, fingerprint)
    ))
    .limit(1);

  return !existing;
}

/**
 * Check if this is a new location for the user
 */
async function isNewLocation(userId: string, country: string | undefined, city: string | undefined): Promise<boolean> {
  if (!country) return false;
  
  const db = await getDb();
  if (!db) return true;

  const [existing] = await db
    .select()
    .from(knownLocations)
    .where(and(
      eq(knownLocations.userId, userId),
      eq(knownLocations.country, country),
      city ? eq(knownLocations.city, city) : undefined
    ))
    .limit(1);

  return !existing;
}

/**
 * Add device to known devices
 */
async function addKnownDevice(
  userId: string,
  fingerprint: string,
  deviceInfo: { deviceName: string; browser: string; os: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(knownDevices).values({
    id: uuidv4(),
    userId,
    deviceFingerprint: fingerprint,
    deviceName: deviceInfo.deviceName,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
  });
}

/**
 * Add location to known locations
 */
async function addKnownLocation(
  userId: string,
  location: { city?: string; region?: string; country?: string; countryCode?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(knownLocations).values({
    id: uuidv4(),
    userId,
    city: location.city,
    region: location.region,
    country: location.country,
    countryCode: location.countryCode,
  });
}

/**
 * Get notification settings for a user
 */
async function getNotificationSettings(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const [settings] = await db
    .select()
    .from(loginNotificationSettings)
    .where(eq(loginNotificationSettings.userId, userId))
    .limit(1);

  return settings || {
    notifyNewDevice: true,
    notifyNewLocation: true,
    notifyFailedLogin: true,
    notifySuspiciousActivity: true,
    emailNotifications: true,
    failedLoginThreshold: 3,
  };
}

/**
 * Send login notification email
 */
async function sendLoginNotification(
  userId: string,
  activity: {
    deviceName: string;
    browser: string;
    os: string;
    ipAddress?: string;
    city?: string;
    country?: string;
    isNewDevice: boolean;
    isNewLocation: boolean;
    isSuspicious: boolean;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  let title = "New Login Detected";
  let content = "";

  if (activity.isSuspicious) {
    title = "⚠️ Suspicious Login Activity Detected";
    content = `We detected a suspicious login to your PromptForge account.\n\n`;
  } else if (activity.isNewDevice) {
    title = "🔔 New Device Login";
    content = `Your account was accessed from a new device.\n\n`;
  } else if (activity.isNewLocation) {
    title = "📍 New Location Login";
    content = `Your account was accessed from a new location.\n\n`;
  }

  content += `**Device:** ${activity.deviceName}\n`;
  content += `**Browser:** ${activity.browser}\n`;
  content += `**Operating System:** ${activity.os}\n`;
  if (activity.ipAddress) content += `**IP Address:** ${activity.ipAddress}\n`;
  if (activity.city && activity.country) {
    content += `**Location:** ${activity.city}, ${activity.country}\n`;
  } else if (activity.country) {
    content += `**Location:** ${activity.country}\n`;
  }
  content += `\n**Time:** ${new Date().toISOString()}\n`;
  content += `\nIf this wasn't you, please secure your account immediately by changing your password and enabling two-factor authentication.`;

  await notifyOwner({ title, content });
}

/**
 * Record a login activity
 */
export async function recordLoginActivity(
  userId: string,
  options: {
    userAgent?: string;
    ipAddress?: string;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    loginStatus?: "success" | "failed" | "blocked";
    failureReason?: string;
  }
): Promise<{
  isNewDevice: boolean;
  isNewLocation: boolean;
  isSuspicious: boolean;
  notificationSent: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return { isNewDevice: false, isNewLocation: false, isSuspicious: false, notificationSent: false };
  }

  const deviceInfo = parseUserAgent(options.userAgent);
  const fingerprint = generateDeviceFingerprint(options.userAgent, options.ipAddress);
  
  const newDevice = await isNewDevice(userId, fingerprint);
  const newLocation = await isNewLocation(userId, options.country, options.city);
  
  // Check for suspicious activity (multiple failed logins in short time)
  let isSuspicious = false;
  if (options.loginStatus === "failed") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [failedCount] = await db
      .select({ count: count() })
      .from(loginActivities)
      .where(and(
        eq(loginActivities.userId, userId),
        eq(loginActivities.loginStatus, "failed"),
        gte(loginActivities.createdAt, oneHourAgo)
      ));
    
    const settings = await getNotificationSettings(userId);
    if (failedCount && failedCount.count >= (settings?.failedLoginThreshold || 3)) {
      isSuspicious = true;
    }
  }

  // Record the activity
  const activityId = uuidv4();
  await db.insert(loginActivities).values({
    id: activityId,
    userId,
    deviceFingerprint: fingerprint,
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    userAgent: options.userAgent,
    ipAddress: options.ipAddress,
    city: options.city,
    region: options.region,
    country: options.country,
    countryCode: options.countryCode,
    loginStatus: options.loginStatus || "success",
    failureReason: options.failureReason,
    isNewDevice: newDevice,
    isNewLocation: newLocation,
    isSuspicious,
    notificationSent: false,
  });

  // Add to known devices/locations if successful login
  if (options.loginStatus === "success" || !options.loginStatus) {
    if (newDevice) {
      await addKnownDevice(userId, fingerprint, deviceInfo);
    }
    if (newLocation && options.country) {
      await addKnownLocation(userId, {
        city: options.city,
        region: options.region,
        country: options.country,
        countryCode: options.countryCode,
      });
    }
  }

  // Send notification if needed
  let notificationSent = false;
  const settings = await getNotificationSettings(userId);
  
  if (settings?.emailNotifications) {
    const shouldNotify = 
      (newDevice && settings.notifyNewDevice) ||
      (newLocation && settings.notifyNewLocation) ||
      (isSuspicious && settings.notifySuspiciousActivity) ||
      (options.loginStatus === "failed" && settings.notifyFailedLogin);

    if (shouldNotify) {
      await sendLoginNotification(userId, {
        ...deviceInfo,
        ipAddress: options.ipAddress,
        city: options.city,
        country: options.country,
        isNewDevice: newDevice,
        isNewLocation: newLocation,
        isSuspicious,
      });
      notificationSent = true;

      // Update activity record
      await db
        .update(loginActivities)
        .set({ notificationSent: true })
        .where(eq(loginActivities.id, activityId));
    }
  }

  return { isNewDevice: newDevice, isNewLocation: newLocation, isSuspicious, notificationSent };
}

/**
 * Get login history for a user
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(loginActivities)
    .where(eq(loginActivities.userId, userId))
    .orderBy(desc(loginActivities.createdAt))
    .limit(limit);
}

/**
 * Get known devices for a user
 */
export async function getUserKnownDevices(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(knownDevices)
    .where(eq(knownDevices.userId, userId))
    .orderBy(desc(knownDevices.lastSeenAt));
}

/**
 * Get known locations for a user
 */
export async function getUserKnownLocations(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(knownLocations)
    .where(eq(knownLocations.userId, userId))
    .orderBy(desc(knownLocations.lastSeenAt));
}

/**
 * Remove a known device
 */
export async function removeKnownDevice(userId: string, deviceId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(knownDevices)
    .where(and(
      eq(knownDevices.id, deviceId),
      eq(knownDevices.userId, userId)
    ));

  return true;
}

/**
 * Remove a known location
 */
export async function removeKnownLocation(userId: string, locationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(knownLocations)
    .where(and(
      eq(knownLocations.id, locationId),
      eq(knownLocations.userId, userId)
    ));

  return true;
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<{
    notifyNewDevice: boolean;
    notifyNewLocation: boolean;
    notifyFailedLogin: boolean;
    notifySuspiciousActivity: boolean;
    emailNotifications: boolean;
    failedLoginThreshold: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [existing] = await db
    .select()
    .from(loginNotificationSettings)
    .where(eq(loginNotificationSettings.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(loginNotificationSettings)
      .set(settings)
      .where(eq(loginNotificationSettings.id, existing.id));
  } else {
    await db.insert(loginNotificationSettings).values({
      id: uuidv4(),
      userId,
      ...settings,
    });
  }
}

/**
 * Get login statistics for a user
 */
export async function getLoginStats(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const activities = await db
    .select()
    .from(loginActivities)
    .where(and(
      eq(loginActivities.userId, userId),
      gte(loginActivities.createdAt, thirtyDaysAgo)
    ));

  const successCount = activities.filter(a => a.loginStatus === "success").length;
  const failedCount = activities.filter(a => a.loginStatus === "failed").length;
  const newDeviceCount = activities.filter(a => a.isNewDevice).length;
  const newLocationCount = activities.filter(a => a.isNewLocation).length;
  const suspiciousCount = activities.filter(a => a.isSuspicious).length;

  const uniqueDevices = new Set(activities.map(a => a.deviceFingerprint)).size;
  const uniqueLocations = new Set(activities.filter(a => a.country).map(a => `${a.city}-${a.country}`)).size;

  return {
    totalLogins: activities.length,
    successfulLogins: successCount,
    failedLogins: failedCount,
    newDevices: newDeviceCount,
    newLocations: newLocationCount,
    suspiciousActivities: suspiciousCount,
    uniqueDevices,
    uniqueLocations,
    period: "30 days",
  };
}

import { getDb } from "../db";
import { userSessions } from "../../drizzle/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Session configuration
const SESSION_DURATION_DAYS = 30; // Default session duration
const INACTIVITY_TIMEOUT_HOURS = 24; // Expire after 24 hours of inactivity

/**
 * Parse user agent string to extract device info
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

  // Simple UA parsing - in production, use a library like ua-parser-js
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
 * Hash a session token
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  options: {
    userAgent?: string;
    ipAddress?: string;
    city?: string;
    country?: string;
  }
): Promise<{ sessionId: string; token: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionId = uuidv4();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const deviceInfo = parseUserAgent(options.userAgent);

  await db.insert(userSessions).values({
    id: sessionId,
    userId,
    tokenHash,
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    userAgent: options.userAgent,
    ipAddress: options.ipAddress,
    city: options.city,
    country: options.country,
    isActive: true,
    isCurrent: true,
    lastActivityAt: new Date(),
    expiresAt,
  });

  // Mark other sessions as not current
  await db
    .update(userSessions)
    .set({ isCurrent: false })
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.id, sessionId) // Exclude current session
    ));

  return { sessionId, token, expiresAt };
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  sessionId?: string;
}> {
  const db = await getDb();
  if (!db) return { valid: false };

  const tokenHash = hashToken(token);

  const [session] = await db
    .select()
    .from(userSessions)
    .where(and(
      eq(userSessions.tokenHash, tokenHash),
      eq(userSessions.isActive, true)
    ))
    .limit(1);

  if (!session) {
    return { valid: false };
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    await revokeSession(session.id, session.userId);
    return { valid: false };
  }

  // Check for inactivity timeout
  const inactivityThreshold = new Date();
  inactivityThreshold.setHours(inactivityThreshold.getHours() - INACTIVITY_TIMEOUT_HOURS);
  
  if (session.lastActivityAt < inactivityThreshold) {
    await revokeSession(session.id, session.userId);
    return { valid: false };
  }

  // Update last activity
  await db
    .update(userSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(userSessions.id, session.id));

  return {
    valid: true,
    userId: session.userId,
    sessionId: session.id,
  };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const sessions = await db
    .select({
      id: userSessions.id,
      deviceName: userSessions.deviceName,
      deviceType: userSessions.deviceType,
      browser: userSessions.browser,
      os: userSessions.os,
      ipAddress: userSessions.ipAddress,
      city: userSessions.city,
      country: userSessions.country,
      isActive: userSessions.isActive,
      isCurrent: userSessions.isCurrent,
      lastActivityAt: userSessions.lastActivityAt,
      expiresAt: userSessions.expiresAt,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, true)
    ))
    .orderBy(desc(userSessions.lastActivityAt));

  return sessions;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(userSessions)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(and(
      eq(userSessions.id, sessionId),
      eq(userSessions.userId, userId)
    ));

  return true;
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .update(userSessions)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, true)
    ));

  // Re-activate current session
  await db
    .update(userSessions)
    .set({
      isActive: true,
      revokedAt: null,
    })
    .where(eq(userSessions.id, currentSessionId));

  return 1; // Return count of revoked sessions
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  await db
    .update(userSessions)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, true)
    ));

  return 1;
}

/**
 * Clean up expired sessions (can be run as a scheduled job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  await db
    .update(userSessions)
    .set({
      isActive: false,
      revokedAt: now,
    })
    .where(and(
      eq(userSessions.isActive, true),
      lt(userSessions.expiresAt, now)
    ));

  return 1;
}

/**
 * Get session statistics for a user
 */
export async function getSessionStats(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const sessions = await getUserSessions(userId);
  
  const deviceTypes = sessions.reduce((acc, s) => {
    const type = s.deviceType || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locations = sessions.reduce((acc, s) => {
    const location = s.country || "Unknown";
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalActiveSessions: sessions.length,
    deviceTypes,
    locations,
    mostRecentActivity: sessions[0]?.lastActivityAt || null,
  };
}

/**
 * Mark a session as current
 */
export async function markSessionAsCurrent(sessionId: string, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // First, mark all sessions as not current
  await db
    .update(userSessions)
    .set({ isCurrent: false })
    .where(eq(userSessions.userId, userId));

  // Then mark the specified session as current
  await db
    .update(userSessions)
    .set({ isCurrent: true })
    .where(and(
      eq(userSessions.id, sessionId),
      eq(userSessions.userId, userId)
    ));
}

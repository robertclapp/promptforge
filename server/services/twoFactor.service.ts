import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { getDb } from "../db";
import { twoFactorSettings, trustedDevices, users } from "../../drizzle/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Configure TOTP settings
authenticator.options = {
  digits: 6,
  step: 30, // 30 second window
  window: 1, // Allow 1 step before/after for clock drift
};

const APP_NAME = "PromptForge";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const TRUSTED_DEVICE_DAYS = 30;

/**
 * Generate a new TOTP secret for a user
 */
export async function generateSecret(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get user email for the QR code
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const email = user?.email || userId;
  const secret = authenticator.generateSecret();
  
  // Generate otpauth URL
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  
  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
  
  // Format secret for manual entry (groups of 4)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(" ") || secret;

  // Store the secret (not yet enabled)
  const existingSettings = await getTwoFactorSettings(userId);
  
  if (existingSettings) {
    await db
      .update(twoFactorSettings)
      .set({
        secret,
        enabled: false,
        verified: false,
        backupCodes: null,
        backupCodesUsed: 0,
      })
      .where(eq(twoFactorSettings.userId, userId));
  } else {
    await db.insert(twoFactorSettings).values({
      id: uuidv4(),
      userId,
      secret,
      enabled: false,
      verified: false,
    });
  }

  return {
    secret,
    qrCodeUrl,
    manualEntryKey,
  };
}

/**
 * Verify a TOTP code and enable 2FA if valid
 */
export async function verifyAndEnable(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getTwoFactorSettings(userId);
  
  if (!settings) {
    return { success: false, error: "2FA not set up. Please generate a new secret first." };
  }

  if (settings.enabled && settings.verified) {
    return { success: false, error: "2FA is already enabled." };
  }

  // Check for lockout
  if (settings.lockedUntil && new Date(settings.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(settings.lockedUntil).getTime() - Date.now()) / 60000
    );
    return { 
      success: false, 
      error: `Too many failed attempts. Try again in ${minutesLeft} minutes.` 
    };
  }

  // Verify the code
  const isValid = authenticator.verify({
    token: code,
    secret: settings.secret,
  });

  if (!isValid) {
    // Increment failed attempts
    const newFailedAttempts = settings.failedAttempts + 1;
    const lockedUntil = newFailedAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await db
      .update(twoFactorSettings)
      .set({
        failedAttempts: newFailedAttempts,
        lockedUntil,
      })
      .where(eq(twoFactorSettings.userId, userId));

    return { 
      success: false, 
      error: lockedUntil 
        ? `Too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        : "Invalid verification code. Please try again." 
    };
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

  // Enable 2FA
  await db
    .update(twoFactorSettings)
    .set({
      enabled: true,
      verified: true,
      backupCodes: hashedBackupCodes,
      backupCodesUsed: 0,
      failedAttempts: 0,
      lockedUntil: null,
      lastVerifiedAt: new Date(),
    })
    .where(eq(twoFactorSettings.userId, userId));

  return {
    success: true,
    backupCodes, // Return plain text codes for user to save
  };
}

/**
 * Verify a TOTP code during login
 */
export async function verifyCode(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getTwoFactorSettings(userId);
  
  if (!settings || !settings.enabled) {
    return { success: true }; // 2FA not enabled, allow through
  }

  // Check for lockout
  if (settings.lockedUntil && new Date(settings.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(settings.lockedUntil).getTime() - Date.now()) / 60000
    );
    return { 
      success: false, 
      error: `Account temporarily locked. Try again in ${minutesLeft} minutes.` 
    };
  }

  // First try TOTP code
  const isValidTotp = authenticator.verify({
    token: code,
    secret: settings.secret,
  });

  if (isValidTotp) {
    // Reset failed attempts and update last verified
    await db
      .update(twoFactorSettings)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: new Date(),
      })
      .where(eq(twoFactorSettings.userId, userId));

    return { success: true };
  }

  // Try backup code
  if (settings.backupCodes && settings.backupCodes.length > 0) {
    const hashedInput = hashBackupCode(code.replace(/\s/g, "").toUpperCase());
    const codeIndex = settings.backupCodes.findIndex(bc => bc === hashedInput);

    if (codeIndex !== -1) {
      // Remove used backup code
      const updatedCodes = [...settings.backupCodes];
      updatedCodes.splice(codeIndex, 1);

      await db
        .update(twoFactorSettings)
        .set({
          backupCodes: updatedCodes,
          backupCodesUsed: settings.backupCodesUsed + 1,
          failedAttempts: 0,
          lockedUntil: null,
          lastVerifiedAt: new Date(),
        })
        .where(eq(twoFactorSettings.userId, userId));

      return { success: true };
    }
  }

  // Invalid code - increment failed attempts
  const newFailedAttempts = settings.failedAttempts + 1;
  const lockedUntil = newFailedAttempts >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  await db
    .update(twoFactorSettings)
    .set({
      failedAttempts: newFailedAttempts,
      lockedUntil,
    })
    .where(eq(twoFactorSettings.userId, userId));

  return { 
    success: false, 
    error: lockedUntil 
      ? `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
      : "Invalid verification code." 
  };
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getTwoFactorSettings(userId);
  
  if (!settings || !settings.enabled) {
    return { success: false, error: "2FA is not enabled." };
  }

  // Verify current code before disabling
  const verification = await verifyCode(userId, code);
  if (!verification.success) {
    return verification;
  }

  // Disable 2FA
  await db
    .update(twoFactorSettings)
    .set({
      enabled: false,
      verified: false,
      backupCodes: null,
      backupCodesUsed: 0,
    })
    .where(eq(twoFactorSettings.userId, userId));

  // Remove all trusted devices
  await db
    .delete(trustedDevices)
    .where(eq(trustedDevices.userId, userId));

  return { success: true };
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const settings = await getTwoFactorSettings(userId);
  
  if (!settings || !settings.enabled) {
    return { success: false, error: "2FA is not enabled." };
  }

  // Verify current code
  const verification = await verifyCode(userId, code);
  if (!verification.success) {
    return { success: false, error: verification.error };
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

  await db
    .update(twoFactorSettings)
    .set({
      backupCodes: hashedBackupCodes,
      backupCodesUsed: 0,
    })
    .where(eq(twoFactorSettings.userId, userId));

  return {
    success: true,
    backupCodes,
  };
}

/**
 * Get 2FA settings for a user
 */
export async function getTwoFactorSettings(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const [settings] = await db
    .select()
    .from(twoFactorSettings)
    .where(eq(twoFactorSettings.userId, userId))
    .limit(1);

  return settings || null;
}

/**
 * Check if 2FA is required for a user
 */
export async function is2FARequired(userId: string): Promise<boolean> {
  const settings = await getTwoFactorSettings(userId);
  return settings?.enabled === true;
}

/**
 * Get 2FA status for a user (public info only)
 */
export async function get2FAStatus(userId: string): Promise<{
  enabled: boolean;
  verified: boolean;
  backupCodesRemaining: number;
  lastVerifiedAt: Date | null;
}> {
  const settings = await getTwoFactorSettings(userId);
  
  if (!settings) {
    return {
      enabled: false,
      verified: false,
      backupCodesRemaining: 0,
      lastVerifiedAt: null,
    };
  }

  return {
    enabled: settings.enabled,
    verified: settings.verified,
    backupCodesRemaining: settings.backupCodes?.length || 0,
    lastVerifiedAt: settings.lastVerifiedAt,
  };
}

/**
 * Add a trusted device
 */
export async function addTrustedDevice(
  userId: string,
  deviceInfo: {
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const deviceId = uuidv4();
  const deviceHash = crypto
    .createHash("sha256")
    .update(`${userId}-${deviceId}`)
    .digest("hex");

  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(trustedDevices).values({
    id: deviceId,
    userId,
    deviceHash,
    deviceName: parseDeviceName(deviceInfo.userAgent),
    userAgent: deviceInfo.userAgent,
    ipAddress: deviceInfo.ipAddress,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return deviceHash;
}

/**
 * Check if a device is trusted
 */
export async function isDeviceTrusted(
  userId: string,
  deviceHash: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [device] = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceHash, deviceHash),
        gt(trustedDevices.expiresAt, new Date())
      )
    )
    .limit(1);

  if (device) {
    // Update last used
    await db
      .update(trustedDevices)
      .set({ lastUsedAt: new Date() })
      .where(eq(trustedDevices.id, device.id));
    return true;
  }

  return false;
}

/**
 * Get trusted devices for a user
 */
export async function getTrustedDevices(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: trustedDevices.id,
      deviceName: trustedDevices.deviceName,
      ipAddress: trustedDevices.ipAddress,
      lastUsedAt: trustedDevices.lastUsedAt,
      expiresAt: trustedDevices.expiresAt,
      createdAt: trustedDevices.createdAt,
    })
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        gt(trustedDevices.expiresAt, new Date())
      )
    );
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.id, deviceId)
      )
    );

  return true;
}

/**
 * Remove all trusted devices for a user
 */
export async function removeAllTrustedDevices(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(trustedDevices)
    .where(eq(trustedDevices.userId, userId));
}

/**
 * Clean up expired trusted devices (scheduled job)
 */
export async function cleanupExpiredDevices(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .delete(trustedDevices)
    .where(lt(trustedDevices.expiresAt, new Date()));

  return 0; // Drizzle doesn't return affected rows easily
}

// Helper functions

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto
      .randomBytes(BACKUP_CODE_LENGTH / 2)
      .toString("hex")
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

function hashBackupCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.replace(/\s/g, "").toUpperCase())
    .digest("hex");
}

function parseDeviceName(userAgent?: string): string {
  if (!userAgent) return "Unknown Device";
  
  // Simple parsing - could be enhanced with a proper UA parser
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Mac")) return "Mac";
  if (userAgent.includes("Linux")) return "Linux PC";
  
  return "Unknown Device";
}

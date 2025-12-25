/**
 * Export Sharing Service
 * Handles creating and managing shareable links for exports
 */

import { getDb } from "../db";
import { exportShares, importExportHistory } from "../../drizzle/schema";
import { eq, and, desc, gt, or, isNull } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

// Generate a random share code
function generateShareCode(): string {
  return randomBytes(12).toString("base64url");
}

// Hash password for storage
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export interface CreateShareOptions {
  exportHistoryId: string;
  userId: string;
  organizationId?: string;
  password?: string;
  maxDownloads?: number;
  expiresInDays?: number;
  allowPreview?: boolean;
  allowDownload?: boolean;
}

export interface ShareInfo {
  id: string;
  shareCode: string;
  shareUrl: string;
  exportHistoryId: string;
  hasPassword: boolean;
  maxDownloads: number | null;
  downloadCount: number;
  expiresAt: Date | null;
  allowPreview: boolean;
  allowDownload: boolean;
  isActive: boolean;
  createdAt: Date | null;
  lastAccessedAt: Date | null;
}

export interface AccessShareResult {
  success: boolean;
  error?: string;
  exportUrl?: string;
  fileName?: string;
  promptCount?: number;
  exportedAt?: Date;
  requiresPassword?: boolean;
}

/**
 * Create a shareable link for an export
 */
export async function createExportShare(options: CreateShareOptions): Promise<ShareInfo> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    exportHistoryId,
    userId,
    organizationId,
    password,
    maxDownloads,
    expiresInDays,
    allowPreview = true,
    allowDownload = true,
  } = options;

  // Verify the export exists and belongs to the user
  const exportRecord = await db
    .select()
    .from(importExportHistory)
    .where(
      and(
        eq(importExportHistory.id, exportHistoryId),
        eq(importExportHistory.operationType, "export"),
        eq(importExportHistory.status, "completed")
      )
    )
    .limit(1);

  if (exportRecord.length === 0) {
    throw new Error("Export not found or not completed");
  }

  // Generate unique share code
  const shareCode = generateShareCode();
  const id = `share_${randomBytes(16).toString("hex")}`;

  // Calculate expiration date
  let expiresAt: Date | null = null;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Hash password if provided
  const hashedPassword = password ? hashPassword(password) : null;

  await db.insert(exportShares).values({
    id,
    userId,
    organizationId: organizationId || null,
    shareCode,
    exportHistoryId,
    password: hashedPassword,
    maxDownloads: maxDownloads || null,
    downloadCount: 0,
    expiresAt,
    allowPreview,
    allowDownload,
    isActive: true,
    accessLog: [],
  });

  // Get the base URL from environment or use a default
  const baseUrl = process.env.VITE_APP_URL || "";
  const shareUrl = `${baseUrl}/shared-export/${shareCode}`;

  return {
    id,
    shareCode,
    shareUrl,
    exportHistoryId,
    hasPassword: !!password,
    maxDownloads: maxDownloads || null,
    downloadCount: 0,
    expiresAt,
    allowPreview,
    allowDownload,
    isActive: true,
    createdAt: new Date(),
    lastAccessedAt: null,
  };
}

/**
 * Get all shares for a user
 */
export async function getUserShares(
  userId: string,
  organizationId?: string
): Promise<ShareInfo[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = organizationId
    ? eq(exportShares.organizationId, organizationId)
    : eq(exportShares.userId, userId);

  const shares = await db
    .select()
    .from(exportShares)
    .where(conditions)
    .orderBy(desc(exportShares.createdAt));

  const baseUrl = process.env.VITE_APP_URL || "";

  return shares.map((share) => ({
    id: share.id,
    shareCode: share.shareCode,
    shareUrl: `${baseUrl}/shared-export/${share.shareCode}`,
    exportHistoryId: share.exportHistoryId,
    hasPassword: !!share.password,
    maxDownloads: share.maxDownloads,
    downloadCount: share.downloadCount,
    expiresAt: share.expiresAt,
    allowPreview: share.allowPreview,
    allowDownload: share.allowDownload,
    isActive: share.isActive,
    createdAt: share.createdAt,
    lastAccessedAt: share.lastAccessedAt,
  }));
}

/**
 * Get a specific share by ID
 */
export async function getShareById(
  shareId: string,
  userId: string
): Promise<ShareInfo | null> {
  const db = await getDb();
  if (!db) return null;

  const shares = await db
    .select()
    .from(exportShares)
    .where(
      and(
        eq(exportShares.id, shareId),
        eq(exportShares.userId, userId)
      )
    )
    .limit(1);

  if (shares.length === 0) return null;

  const share = shares[0];
  const baseUrl = process.env.VITE_APP_URL || "";

  return {
    id: share.id,
    shareCode: share.shareCode,
    shareUrl: `${baseUrl}/shared-export/${share.shareCode}`,
    exportHistoryId: share.exportHistoryId,
    hasPassword: !!share.password,
    maxDownloads: share.maxDownloads,
    downloadCount: share.downloadCount,
    expiresAt: share.expiresAt,
    allowPreview: share.allowPreview,
    allowDownload: share.allowDownload,
    isActive: share.isActive,
    createdAt: share.createdAt,
    lastAccessedAt: share.lastAccessedAt,
  };
}

/**
 * Access a shared export (public endpoint)
 */
export async function accessSharedExport(
  shareCode: string,
  password?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AccessShareResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Find the share
  const shares = await db
    .select()
    .from(exportShares)
    .where(eq(exportShares.shareCode, shareCode))
    .limit(1);

  if (shares.length === 0) {
    return { success: false, error: "Share not found" };
  }

  const share = shares[0];

  // Check if share is active
  if (!share.isActive) {
    return { success: false, error: "This share has been deactivated" };
  }

  // Check expiration
  if (share.expiresAt && new Date() > share.expiresAt) {
    return { success: false, error: "This share has expired" };
  }

  // Check download limit
  if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
    return { success: false, error: "Download limit reached" };
  }

  // Check password
  if (share.password) {
    if (!password) {
      return { success: false, requiresPassword: true, error: "Password required" };
    }
    if (!verifyPassword(password, share.password)) {
      return { success: false, error: "Invalid password" };
    }
  }

  // Get the export record
  const exports = await db
    .select()
    .from(importExportHistory)
    .where(eq(importExportHistory.id, share.exportHistoryId))
    .limit(1);

  if (exports.length === 0 || !exports[0].exportUrl) {
    return { success: false, error: "Export file not found" };
  }

  const exportRecord = exports[0];

  // Update access log and download count
  const accessLog = share.accessLog || [];
  accessLog.push({
    ip: ipAddress || "unknown",
    userAgent: userAgent || "unknown",
    timestamp: new Date().toISOString(),
  });

  // Keep only last 100 access logs
  const trimmedLog = accessLog.slice(-100);

  await db
    .update(exportShares)
    .set({
      downloadCount: share.downloadCount + 1,
      lastAccessedAt: new Date(),
      accessLog: trimmedLog,
    })
    .where(eq(exportShares.id, share.id));

  return {
    success: true,
    exportUrl: exportRecord.exportUrl || undefined,
    fileName: exportRecord.exportFileName || "export.json",
    promptCount: exportRecord.exportPromptCount || 0,
    exportedAt: exportRecord.startedAt || undefined,
  };
}

/**
 * Update share settings
 */
export async function updateShare(
  shareId: string,
  userId: string,
  updates: {
    password?: string | null;
    maxDownloads?: number | null;
    expiresInDays?: number | null;
    allowPreview?: boolean;
    allowDownload?: boolean;
    isActive?: boolean;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Verify ownership
  const shares = await db
    .select()
    .from(exportShares)
    .where(
      and(
        eq(exportShares.id, shareId),
        eq(exportShares.userId, userId)
      )
    )
    .limit(1);

  if (shares.length === 0) return false;

  const updateData: any = {};

  if (updates.password !== undefined) {
    updateData.password = updates.password ? hashPassword(updates.password) : undefined;
  }

  if (updates.maxDownloads !== undefined) {
    updateData.maxDownloads = updates.maxDownloads;
  }

  if (updates.expiresInDays !== undefined) {
    if (updates.expiresInDays === null) {
      updateData.expiresAt = null;
    } else {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + updates.expiresInDays);
      updateData.expiresAt = expiresAt;
    }
  }

  if (updates.allowPreview !== undefined) {
    updateData.allowPreview = updates.allowPreview;
  }

  if (updates.allowDownload !== undefined) {
    updateData.allowDownload = updates.allowDownload;
  }

  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }

  if (Object.keys(updateData).length === 0) return true;

  await db
    .update(exportShares)
    .set(updateData)
    .where(eq(exportShares.id, shareId));

  return true;
}

/**
 * Delete a share
 */
export async function deleteShare(shareId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(exportShares)
    .where(
      and(
        eq(exportShares.id, shareId),
        eq(exportShares.userId, userId)
      )
    );

  return true;
}

/**
 * Revoke a share (soft delete)
 */
export async function revokeShare(shareId: string, userId: string): Promise<boolean> {
  return updateShare(shareId, userId, { isActive: false });
}

/**
 * Get share statistics
 */
export async function getShareStats(
  userId: string,
  organizationId?: string
): Promise<{
  totalShares: number;
  activeShares: number;
  totalDownloads: number;
  passwordProtected: number;
}> {
  const db = await getDb();
  if (!db) {
    return { totalShares: 0, activeShares: 0, totalDownloads: 0, passwordProtected: 0 };
  }

  const conditions = organizationId
    ? eq(exportShares.organizationId, organizationId)
    : eq(exportShares.userId, userId);

  const shares = await db
    .select()
    .from(exportShares)
    .where(conditions);

  return {
    totalShares: shares.length,
    activeShares: shares.filter((s) => s.isActive).length,
    totalDownloads: shares.reduce((sum, s) => sum + s.downloadCount, 0),
    passwordProtected: shares.filter((s) => s.password).length,
  };
}

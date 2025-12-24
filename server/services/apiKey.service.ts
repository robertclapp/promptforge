import { randomBytes, createHash } from "crypto";
import { nanoid } from "nanoid";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { apiKeys, apiUsage, type InsertAPIKey } from "../../drizzle/schema";

/**
 * Generate a new API key
 * Format: pk_live_xxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
 */
export function generateAPIKey(): { key: string; hash: string; prefix: string } {
  const randomPart = randomBytes(24).toString("base64url"); // URL-safe base64
  const key = `pk_live_${randomPart}`;
  const hash = hashAPIKey(key);
  const prefix = key.substring(0, 15) + "..."; // pk_live_abc...
  
  return { key, hash, prefix };
}

/**
 * Hash an API key for secure storage
 */
export function hashAPIKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Create a new API key for a user
 */
export async function createAPIKey(userId: string, name: string, rateLimit?: number): Promise<{ id: string; key: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { key, hash, prefix } = generateAPIKey();
  const id = nanoid();

  await db.insert(apiKeys).values({
    id,
    userId,
    name,
    keyHash: hash,
    keyPrefix: prefix,
    isActive: true,
    rateLimit: rateLimit || 1000, // Default 1000 requests/hour
  });

  return { id, key }; // Return the plain key ONLY once
}

/**
 * Validate an API key and return user ID
 */
export async function validateAPIKey(key: string): Promise<{ userId: string; keyId: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const hash = hashAPIKey(key);
  
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;

  const apiKey = result[0];

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));

  return { userId: apiKey.userId, keyId: apiKey.id };
}

/**
 * Check rate limit for an API key
 * Returns true if within limit, false if exceeded
 */
export async function checkRateLimit(apiKeyId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the API key to check rate limit
  const keyResult = await db.select().from(apiKeys).where(eq(apiKeys.id, apiKeyId)).limit(1);
  if (keyResult.length === 0) return false;

  const key = keyResult[0];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count requests in the last hour
  const usageResult = await db
    .select()
    .from(apiUsage)
    .where(and(eq(apiUsage.apiKeyId, apiKeyId), gt(apiUsage.timestamp, oneHourAgo)));

  return usageResult.length < key.rateLimit;
}

/**
 * Log API usage
 */
export async function logAPIUsage(
  apiKeyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(apiUsage).values({
    id: nanoid(),
    apiKeyId,
    userId,
    endpoint,
    method,
    statusCode,
    responseTime,
  });
}

/**
 * Get all API keys for a user
 */
export async function getUserAPIKeys(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeAPIKey(keyId: string, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

/**
 * Delete an API key
 */
export async function deleteAPIKey(keyId: string, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(apiKeys).where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

/**
 * Get API usage statistics
 */
export async function getAPIUsageStats(userId: string, hours: number = 24) {
  const db = await getDb();
  if (!db) return { totalRequests: 0, byEndpoint: {}, byStatus: {} };

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const usage = await db
    .select()
    .from(apiUsage)
    .where(and(eq(apiUsage.userId, userId), gt(apiUsage.timestamp, since)));

  const byEndpoint: Record<string, number> = {};
  const byStatus: Record<number, number> = {};

  usage.forEach((u) => {
    byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] || 0) + 1;
    byStatus[u.statusCode] = (byStatus[u.statusCode] || 0) + 1;
  });

  return {
    totalRequests: usage.length,
    byEndpoint,
    byStatus,
  };
}

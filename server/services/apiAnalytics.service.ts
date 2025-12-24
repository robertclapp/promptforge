import { getDb } from "../db";
import { apiKeys, apiUsage, rateLimitHits } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Get API usage statistics for a user
 */
export async function getApiUsageStats(userId: string, days: number = 30) {
  const db = await getDb();
  if (!db) return null;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get total requests
  const [totalRequests] = await db
    .select({ count: count() })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ));

  // Get requests by status code
  const statusBreakdown = await db
    .select({
      statusCode: apiUsage.statusCode,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ))
    .groupBy(apiUsage.statusCode);

  // Get requests by endpoint
  const endpointBreakdown = await db
    .select({
      endpoint: apiUsage.endpoint,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ))
    .groupBy(apiUsage.endpoint)
    .orderBy(desc(count()))
    .limit(10);

  // Get average response time
  const [avgResponseTime] = await db
    .select({
      avg: sql<number>`AVG(${apiUsage.responseTime})`,
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ));

  // Get daily usage trend
  const dailyUsage = await db
    .select({
      date: sql<string>`DATE(${apiUsage.timestamp})`,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ))
    .groupBy(sql`DATE(${apiUsage.timestamp})`)
    .orderBy(sql`DATE(${apiUsage.timestamp})`);

  // Calculate success rate
  const successCount = statusBreakdown.find(s => s.statusCode >= 200 && s.statusCode < 300)?.count || 0;
  const errorCount = statusBreakdown.filter(s => s.statusCode >= 400).reduce((sum, s) => sum + s.count, 0);
  const successRate = totalRequests.count > 0 
    ? Math.round((successCount / totalRequests.count) * 100) 
    : 100;

  return {
    totalRequests: totalRequests.count,
    successRate,
    errorCount,
    avgResponseTime: Math.round(avgResponseTime?.avg || 0),
    statusBreakdown: statusBreakdown.map(s => ({
      statusCode: s.statusCode,
      count: s.count,
    })),
    endpointBreakdown: endpointBreakdown.map(e => ({
      endpoint: e.endpoint,
      count: e.count,
    })),
    dailyUsage: dailyUsage.map(d => ({
      date: d.date,
      count: d.count,
    })),
    period: `${days} days`,
  };
}

/**
 * Get rate limit statistics
 */
export async function getRateLimitStats(userId: string, days: number = 7) {
  const db = await getDb();
  if (!db) return null;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get total rate limit hits
  const [totalHits] = await db
    .select({ 
      count: count(),
      totalHitCount: sql<number>`SUM(${rateLimitHits.hitCount})`,
    })
    .from(rateLimitHits)
    .where(and(
      eq(rateLimitHits.userId, userId),
      gte(rateLimitHits.createdAt, startDate)
    ));

  // Get rate limit hits by API key
  const hitsByKey = await db
    .select({
      apiKeyId: rateLimitHits.apiKeyId,
      hitCount: sql<number>`SUM(${rateLimitHits.hitCount})`,
    })
    .from(rateLimitHits)
    .where(and(
      eq(rateLimitHits.userId, userId),
      gte(rateLimitHits.createdAt, startDate)
    ))
    .groupBy(rateLimitHits.apiKeyId)
    .orderBy(desc(sql`SUM(${rateLimitHits.hitCount})`));

  // Get daily rate limit hits
  const dailyHits = await db
    .select({
      date: sql<string>`DATE(${rateLimitHits.createdAt})`,
      hitCount: sql<number>`SUM(${rateLimitHits.hitCount})`,
    })
    .from(rateLimitHits)
    .where(and(
      eq(rateLimitHits.userId, userId),
      gte(rateLimitHits.createdAt, startDate)
    ))
    .groupBy(sql`DATE(${rateLimitHits.createdAt})`)
    .orderBy(sql`DATE(${rateLimitHits.createdAt})`);

  // Get API key details for the hits
  const keyIds = hitsByKey.map(h => h.apiKeyId);
  let keyDetails: { id: string; name: string; keyPrefix: string; rateLimit: number }[] = [];
  
  if (keyIds.length > 0) {
    keyDetails = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        rateLimit: apiKeys.rateLimit,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId));
  }

  const hitsByKeyWithDetails = hitsByKey.map(h => {
    const key = keyDetails.find(k => k.id === h.apiKeyId);
    return {
      apiKeyId: h.apiKeyId,
      keyName: key?.name || "Unknown",
      keyPrefix: key?.keyPrefix || "unknown",
      rateLimit: key?.rateLimit || 1000,
      hitCount: h.hitCount,
    };
  });

  return {
    totalHits: totalHits.totalHitCount || 0,
    hitsByKey: hitsByKeyWithDetails,
    dailyHits: dailyHits.map(d => ({
      date: d.date,
      hitCount: d.hitCount,
    })),
    period: `${days} days`,
  };
}

/**
 * Get top API consumers (by request count)
 */
export async function getTopConsumers(userId: string, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get usage by API key
  const usageByKey = await db
    .select({
      apiKeyId: apiUsage.apiKeyId,
      requestCount: count(),
      avgResponseTime: sql<number>`AVG(${apiUsage.responseTime})`,
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ))
    .groupBy(apiUsage.apiKeyId)
    .orderBy(desc(count()))
    .limit(10);

  // Get API key details
  const keyDetails = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      rateLimit: apiKeys.rateLimit,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return usageByKey.map(u => {
    const key = keyDetails.find(k => k.id === u.apiKeyId);
    return {
      apiKeyId: u.apiKeyId,
      keyName: key?.name || "Unknown",
      keyPrefix: key?.keyPrefix || "unknown",
      rateLimit: key?.rateLimit || 1000,
      requestCount: u.requestCount,
      avgResponseTime: Math.round(u.avgResponseTime || 0),
      lastUsedAt: key?.lastUsedAt,
    };
  });
}

/**
 * Get hourly usage pattern
 */
export async function getHourlyPattern(userId: string, days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const hourlyPattern = await db
    .select({
      hour: sql<number>`HOUR(${apiUsage.timestamp})`,
      count: count(),
    })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, startDate)
    ))
    .groupBy(sql`HOUR(${apiUsage.timestamp})`)
    .orderBy(sql`HOUR(${apiUsage.timestamp})`);

  // Fill in missing hours with 0
  const fullPattern = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyPattern.find(h => h.hour === i);
    return {
      hour: i,
      count: found?.count || 0,
    };
  });

  return fullPattern;
}

/**
 * Record a rate limit hit
 */
export async function recordRateLimitHit(
  apiKeyId: string,
  userId: string,
  endpoint?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

  // Check if there's an existing record for this window
  const [existing] = await db
    .select()
    .from(rateLimitHits)
    .where(and(
      eq(rateLimitHits.apiKeyId, apiKeyId),
      eq(rateLimitHits.windowStart, windowStart)
    ))
    .limit(1);

  if (existing) {
    await db
      .update(rateLimitHits)
      .set({ hitCount: existing.hitCount + 1 })
      .where(eq(rateLimitHits.id, existing.id));
  } else {
    await db.insert(rateLimitHits).values({
      id: uuidv4(),
      apiKeyId,
      userId,
      endpoint,
      hitCount: 1,
      windowStart,
      windowEnd,
    });
  }
}

/**
 * Get API usage summary for dashboard widget
 */
export async function getApiUsageSummary(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Today's requests
  const [todayRequests] = await db
    .select({ count: count() })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, today)
    ));

  // Yesterday's requests
  const [yesterdayRequests] = await db
    .select({ count: count() })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, yesterday),
      lte(apiUsage.timestamp, today)
    ));

  // This week's requests
  const [weekRequests] = await db
    .select({ count: count() })
    .from(apiUsage)
    .where(and(
      eq(apiUsage.userId, userId),
      gte(apiUsage.timestamp, weekAgo)
    ));

  // Today's rate limit hits
  const [todayHits] = await db
    .select({ count: sql<number>`SUM(${rateLimitHits.hitCount})` })
    .from(rateLimitHits)
    .where(and(
      eq(rateLimitHits.userId, userId),
      gte(rateLimitHits.createdAt, today)
    ));

  // Active API keys count
  const [activeKeys] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(and(
      eq(apiKeys.userId, userId),
      eq(apiKeys.isActive, true)
    ));

  // Calculate trend
  const trend = yesterdayRequests.count > 0
    ? Math.round(((todayRequests.count - yesterdayRequests.count) / yesterdayRequests.count) * 100)
    : 0;

  return {
    todayRequests: todayRequests.count,
    weekRequests: weekRequests.count,
    todayRateLimitHits: todayHits.count || 0,
    activeApiKeys: activeKeys.count,
    trend,
    trendDirection: trend >= 0 ? "up" : "down",
  };
}

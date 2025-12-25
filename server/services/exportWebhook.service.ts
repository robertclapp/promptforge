/**
 * Export Webhook Service
 * Manages webhooks for export events with retry logic
 */

import { eq, and, desc, sql, lt } from "drizzle-orm";
import { getDb } from "../db";
import { exportWebhooks, exportWebhookDeliveries } from "../../drizzle/importExport_schema";
import crypto from "crypto";

type EventType = "export_complete" | "export_failed" | "import_complete" | "import_failed" | "scheduled_export" | "share_access";

/**
 * Create a new webhook
 */
export async function createWebhook(params: {
  userId: string;
  name: string;
  description?: string;
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  triggerOnExportComplete?: boolean;
  triggerOnExportFailed?: boolean;
  triggerOnImportComplete?: boolean;
  triggerOnImportFailed?: boolean;
  triggerOnScheduledExport?: boolean;
  triggerOnShareAccess?: boolean;
  maxRetries?: number;
  retryDelaySeconds?: number;
}): Promise<{ id: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();

  await db.insert(exportWebhooks).values({
    id,
    userId: params.userId,
    name: params.name,
    description: params.description,
    url: params.url,
    secret: params.secret,
    headers: params.headers,
    triggerOnExportComplete: params.triggerOnExportComplete ?? true,
    triggerOnExportFailed: params.triggerOnExportFailed ?? true,
    triggerOnImportComplete: params.triggerOnImportComplete ?? false,
    triggerOnImportFailed: params.triggerOnImportFailed ?? false,
    triggerOnScheduledExport: params.triggerOnScheduledExport ?? true,
    triggerOnShareAccess: params.triggerOnShareAccess ?? false,
    maxRetries: params.maxRetries ?? 3,
    retryDelaySeconds: params.retryDelaySeconds ?? 60,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id };
}

/**
 * List webhooks for a user
 */
export async function listWebhooks(params: {
  userId: string;
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}): Promise<{
  webhooks: Array<typeof exportWebhooks.$inferSelect>;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  const conditions = [eq(exportWebhooks.userId, params.userId)];
  
  if (params.activeOnly) {
    conditions.push(eq(exportWebhooks.isActive, true));
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exportWebhooks)
    .where(and(...conditions));

  const webhooks = await db
    .select()
    .from(exportWebhooks)
    .where(and(...conditions))
    .orderBy(desc(exportWebhooks.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    webhooks,
    total: countResult?.count || 0,
  };
}

/**
 * Get a specific webhook
 */
export async function getWebhook(params: {
  id: string;
  userId: string;
}): Promise<typeof exportWebhooks.$inferSelect | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [webhook] = await db
    .select()
    .from(exportWebhooks)
    .where(
      and(
        eq(exportWebhooks.id, params.id),
        eq(exportWebhooks.userId, params.userId)
      )
    )
    .limit(1);

  return webhook || null;
}

/**
 * Update a webhook
 */
export async function updateWebhook(params: {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  url?: string;
  secret?: string;
  headers?: Record<string, string>;
  triggerOnExportComplete?: boolean;
  triggerOnExportFailed?: boolean;
  triggerOnImportComplete?: boolean;
  triggerOnImportFailed?: boolean;
  triggerOnScheduledExport?: boolean;
  triggerOnShareAccess?: boolean;
  maxRetries?: number;
  retryDelaySeconds?: number;
  isActive?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<typeof exportWebhooks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.url !== undefined) updateData.url = params.url;
  if (params.secret !== undefined) updateData.secret = params.secret;
  if (params.headers !== undefined) updateData.headers = params.headers;
  if (params.triggerOnExportComplete !== undefined) updateData.triggerOnExportComplete = params.triggerOnExportComplete;
  if (params.triggerOnExportFailed !== undefined) updateData.triggerOnExportFailed = params.triggerOnExportFailed;
  if (params.triggerOnImportComplete !== undefined) updateData.triggerOnImportComplete = params.triggerOnImportComplete;
  if (params.triggerOnImportFailed !== undefined) updateData.triggerOnImportFailed = params.triggerOnImportFailed;
  if (params.triggerOnScheduledExport !== undefined) updateData.triggerOnScheduledExport = params.triggerOnScheduledExport;
  if (params.triggerOnShareAccess !== undefined) updateData.triggerOnShareAccess = params.triggerOnShareAccess;
  if (params.maxRetries !== undefined) updateData.maxRetries = params.maxRetries;
  if (params.retryDelaySeconds !== undefined) updateData.retryDelaySeconds = params.retryDelaySeconds;
  if (params.isActive !== undefined) updateData.isActive = params.isActive;

  await db
    .update(exportWebhooks)
    .set(updateData)
    .where(
      and(
        eq(exportWebhooks.id, params.id),
        eq(exportWebhooks.userId, params.userId)
      )
    );
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(params: {
  id: string;
  userId: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(exportWebhooks)
    .where(
      and(
        eq(exportWebhooks.id, params.id),
        eq(exportWebhooks.userId, params.userId)
      )
    );
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(params: {
  userId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}): Promise<{ triggered: number; deliveryIds: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get active webhooks for this user that match the event type
  const webhooks = await db
    .select()
    .from(exportWebhooks)
    .where(
      and(
        eq(exportWebhooks.userId, params.userId),
        eq(exportWebhooks.isActive, true)
      )
    );

  const matchingWebhooks = webhooks.filter((webhook) => {
    switch (params.eventType) {
      case "export_complete":
        return webhook.triggerOnExportComplete;
      case "export_failed":
        return webhook.triggerOnExportFailed;
      case "import_complete":
        return webhook.triggerOnImportComplete;
      case "import_failed":
        return webhook.triggerOnImportFailed;
      case "scheduled_export":
        return webhook.triggerOnScheduledExport;
      case "share_access":
        return webhook.triggerOnShareAccess;
      default:
        return false;
    }
  });

  const deliveryIds: string[] = [];

  for (const webhook of matchingWebhooks) {
    const deliveryId = crypto.randomUUID();
    deliveryIds.push(deliveryId);

    // Create delivery record
    await db.insert(exportWebhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      userId: params.userId,
      eventType: params.eventType,
      eventPayload: params.payload,
      status: "pending",
      attemptCount: 0,
      createdAt: new Date(),
    });

    // Update webhook stats
    await db
      .update(exportWebhooks)
      .set({
        totalTriggers: sql`${exportWebhooks.totalTriggers} + 1`,
        lastTriggeredAt: new Date(),
      })
      .where(eq(exportWebhooks.id, webhook.id));

    // Attempt delivery asynchronously
    deliverWebhook(deliveryId, webhook, params.payload).catch(console.error);
  }

  return { triggered: matchingWebhooks.length, deliveryIds };
}

/**
 * Deliver a webhook
 */
async function deliverWebhook(
  deliveryId: string,
  webhook: typeof exportWebhooks.$inferSelect,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Delivery-Id": deliveryId,
    "X-Webhook-Event": (payload.event as string) || "unknown",
    ...(webhook.headers || {}),
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    headers["X-Webhook-Signature"] = generateSignature(payloadString, webhook.secret);
  }

  const startTime = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      // Success
      await db
        .update(exportWebhookDeliveries)
        .set({
          status: "success",
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          responseTimeMs,
          attemptCount: sql`${exportWebhookDeliveries.attemptCount} + 1`,
          deliveredAt: new Date(),
        })
        .where(eq(exportWebhookDeliveries.id, deliveryId));

      await db
        .update(exportWebhooks)
        .set({
          successCount: sql`${exportWebhooks.successCount} + 1`,
          lastSuccessAt: new Date(),
        })
        .where(eq(exportWebhooks.id, webhook.id));
    } else {
      // HTTP error
      await handleDeliveryFailure(
        deliveryId,
        webhook,
        `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
        response.status,
        responseBody.substring(0, 1000),
        responseTimeMs
      );
    }
  } catch (error) {
    // Network or other error
    const responseTimeMs = Date.now() - startTime;
    await handleDeliveryFailure(
      deliveryId,
      webhook,
      error instanceof Error ? error.message : "Unknown error",
      undefined,
      undefined,
      responseTimeMs
    );
  }
}

/**
 * Handle delivery failure with retry logic
 */
async function handleDeliveryFailure(
  deliveryId: string,
  webhook: typeof exportWebhooks.$inferSelect,
  errorMessage: string,
  responseStatus?: number,
  responseBody?: string,
  responseTimeMs?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get current delivery record
  const [delivery] = await db
    .select()
    .from(exportWebhookDeliveries)
    .where(eq(exportWebhookDeliveries.id, deliveryId))
    .limit(1);

  if (!delivery) return;

  const newAttemptCount = delivery.attemptCount + 1;
  const shouldRetry = newAttemptCount < webhook.maxRetries;

  if (shouldRetry) {
    // Schedule retry
    const nextRetryAt = new Date(Date.now() + webhook.retryDelaySeconds * 1000 * newAttemptCount);
    
    await db
      .update(exportWebhookDeliveries)
      .set({
        status: "retrying",
        responseStatus,
        responseBody,
        responseTimeMs,
        attemptCount: newAttemptCount,
        nextRetryAt,
        errorMessage,
      })
      .where(eq(exportWebhookDeliveries.id, deliveryId));
  } else {
    // Max retries reached
    await db
      .update(exportWebhookDeliveries)
      .set({
        status: "failed",
        responseStatus,
        responseBody,
        responseTimeMs,
        attemptCount: newAttemptCount,
        errorMessage,
      })
      .where(eq(exportWebhookDeliveries.id, deliveryId));

    await db
      .update(exportWebhooks)
      .set({
        failureCount: sql`${exportWebhooks.failureCount} + 1`,
        lastFailureAt: new Date(),
        lastErrorMessage: errorMessage,
      })
      .where(eq(exportWebhooks.id, webhook.id));
  }
}

/**
 * Get webhook deliveries
 */
export async function getWebhookDeliveries(params: {
  webhookId: string;
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<{
  deliveries: Array<typeof exportWebhookDeliveries.$inferSelect>;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  // Verify webhook belongs to user
  const webhook = await getWebhook({ id: params.webhookId, userId: params.userId });
  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(exportWebhookDeliveries)
    .where(eq(exportWebhookDeliveries.webhookId, params.webhookId));

  const deliveries = await db
    .select()
    .from(exportWebhookDeliveries)
    .where(eq(exportWebhookDeliveries.webhookId, params.webhookId))
    .orderBy(desc(exportWebhookDeliveries.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    deliveries,
    total: countResult?.count || 0,
  };
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(params: {
  deliveryId: string;
  userId: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [delivery] = await db
    .select()
    .from(exportWebhookDeliveries)
    .where(
      and(
        eq(exportWebhookDeliveries.id, params.deliveryId),
        eq(exportWebhookDeliveries.userId, params.userId)
      )
    )
    .limit(1);

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  const webhook = await getWebhook({ id: delivery.webhookId, userId: params.userId });
  if (!webhook) {
    throw new Error("Webhook not found");
  }

  // Reset status and attempt delivery
  await db
    .update(exportWebhookDeliveries)
    .set({
      status: "pending",
      nextRetryAt: null,
    })
    .where(eq(exportWebhookDeliveries.id, params.deliveryId));

  deliverWebhook(params.deliveryId, webhook, (delivery.eventPayload || {}) as Record<string, unknown>).catch(console.error);
}

/**
 * Test a webhook
 */
export async function testWebhook(params: {
  id: string;
  userId: string;
}): Promise<{ success: boolean; message: string }> {
  const webhook = await getWebhook(params);
  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    message: "This is a test webhook delivery from PromptForge",
    webhookId: webhook.id,
    webhookName: webhook.name,
  };

  const deliveryId = crypto.randomUUID();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create test delivery record
  await db.insert(exportWebhookDeliveries).values({
    id: deliveryId,
    webhookId: webhook.id,
    userId: params.userId,
    eventType: "export_complete", // Use a valid event type for test
    eventPayload: testPayload,
    status: "pending",
    attemptCount: 0,
    createdAt: new Date(),
  });

  // Attempt delivery synchronously for test
  try {
    const payloadString = JSON.stringify(testPayload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Delivery-Id": deliveryId,
      "X-Webhook-Event": "test",
      ...(webhook.headers || {}),
    };

    if (webhook.secret) {
      headers["X-Webhook-Signature"] = generateSignature(payloadString, webhook.secret);
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      await db
        .update(exportWebhookDeliveries)
        .set({
          status: "success",
          responseStatus: response.status,
          attemptCount: 1,
          deliveredAt: new Date(),
        })
        .where(eq(exportWebhookDeliveries.id, deliveryId));

      return { success: true, message: `Webhook test successful (HTTP ${response.status})` };
    } else {
      const body = await response.text().catch(() => "");
      await db
        .update(exportWebhookDeliveries)
        .set({
          status: "failed",
          responseStatus: response.status,
          responseBody: body.substring(0, 1000),
          attemptCount: 1,
          errorMessage: `HTTP ${response.status}`,
        })
        .where(eq(exportWebhookDeliveries.id, deliveryId));

      return { success: false, message: `Webhook test failed: HTTP ${response.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(exportWebhookDeliveries)
      .set({
        status: "failed",
        attemptCount: 1,
        errorMessage,
      })
      .where(eq(exportWebhookDeliveries.id, deliveryId));

    return { success: false, message: `Webhook test failed: ${errorMessage}` };
  }
}

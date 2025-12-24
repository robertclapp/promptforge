import { getDb } from "../db";
import { webhooks, webhookDeliveries } from "../../drizzle/api_schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

// Webhook event types
export type WebhookEventType = 
  | "evaluation.completed"
  | "evaluation.failed"
  | "budget.threshold_50"
  | "budget.threshold_75"
  | "budget.threshold_90"
  | "budget.exceeded"
  | "security.login_new_device"
  | "security.login_new_location"
  | "security.permission_denied"
  | "security.2fa_disabled"
  | "prompt.created"
  | "prompt.updated"
  | "prompt.deleted"
  | "test_suite.passed"
  | "test_suite.failed";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Generate a unique webhook ID
 */
function generateId(): string {
  return `whd_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Deliver webhook to a single endpoint
 */
async function deliverToEndpoint(
  webhook: typeof webhooks.$inferSelect,
  payload: WebhookPayload,
  deliveryId: string
): Promise<{ success: boolean; statusCode?: number; response?: string }> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-ID": deliveryId,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
        "User-Agent": "PromptForge-Webhooks/1.0",
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text().catch(() => "");
    
    return {
      success: response.ok,
      statusCode: response.status,
      response: responseText.slice(0, 1000), // Limit response storage
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      response: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ triggered: number; delivered: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all active webhooks for this user that subscribe to this event
  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.userId, userId), eq(webhooks.isActive, true)));

  // Filter webhooks that subscribe to this event
  const subscribedWebhooks = userWebhooks.filter((wh: typeof webhooks.$inferSelect) => {
    const events = wh.events as string[];
    return events.includes(event) || events.includes("*");
  });

  if (subscribedWebhooks.length === 0) {
    return { triggered: 0, delivered: 0 };
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  let delivered = 0;

  // Deliver to each webhook
  for (const webhook of subscribedWebhooks) {
    const deliveryId = generateId();

    // Create delivery record
    await db!.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      event,
      payload: payload as unknown as Record<string, unknown>,
      attempts: 1,
      createdAt: new Date(),
    });

    // Attempt delivery
    const result = await deliverToEndpoint(webhook, payload, deliveryId);

    // Update delivery record
    await db!
      .update(webhookDeliveries)
      .set({
        statusCode: result.statusCode,
        response: result.response,
        deliveredAt: result.success ? new Date() : null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    // Update webhook last triggered
    await db!
      .update(webhooks)
      .set({ lastTriggeredAt: new Date() })
      .where(eq(webhooks.id, webhook.id));

    if (result.success) {
      delivered++;
    } else {
      // Schedule retry for failed deliveries
      scheduleRetry(deliveryId, webhook, payload, 1);
    }
  }

  return { triggered: subscribedWebhooks.length, delivered };
}

/**
 * Schedule retry with exponential backoff
 */
async function scheduleRetry(
  deliveryId: string,
  webhook: typeof webhooks.$inferSelect,
  payload: WebhookPayload,
  attempt: number
): Promise<void> {
  const maxAttempts = 5;
  if (attempt >= maxAttempts) {
    return; // Give up after max attempts
  }

  // Exponential backoff: 1min, 5min, 15min, 60min
  const delays = [60000, 300000, 900000, 3600000];
  const delay = delays[attempt - 1] || delays[delays.length - 1];

  setTimeout(async () => {
    const db = await getDb();
    if (!db) return;
    const result = await deliverToEndpoint(webhook, payload, deliveryId);

    await db
      .update(webhookDeliveries)
      .set({
        attempts: attempt + 1,
        statusCode: result.statusCode,
        response: result.response,
        deliveredAt: result.success ? new Date() : null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    if (!result.success) {
      scheduleRetry(deliveryId, webhook, payload, attempt + 1);
    }
  }, delay);
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  userId: string,
  url: string,
  events: string[],
  name?: string
): Promise<{ id: string; secret: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = `wh_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  await db.insert(webhooks).values({
    id,
    userId,
    url,
    events,
    secret,
    isActive: true,
    createdAt: new Date(),
  });

  return { id, secret };
}

/**
 * Get user's webhooks
 */
export async function getUserWebhooks(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      createdAt: webhooks.createdAt,
      lastTriggeredAt: webhooks.lastTriggeredAt,
    })
    .from(webhooks)
    .where(eq(webhooks.userId, userId));
}

/**
 * Get webhook by ID
 */
export async function getWebhook(webhookId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)));
  return results[0] || null;
}

/**
 * Update webhook
 */
export async function updateWebhook(
  webhookId: string,
  userId: string,
  updates: { url?: string; events?: string[]; isActive?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(webhooks)
    .set(updates)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)));
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)));
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookDeliveries(
  webhookId: string,
  userId: string,
  limit: number = 50
) {
  // First verify the webhook belongs to the user
  const webhook = await getWebhook(webhookId, userId);
  if (!webhook) {
    return [];
  }

  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(webhookDeliveries.createdAt)
    .limit(limit);
}

/**
 * Test webhook by sending a test event
 */
export async function testWebhook(webhookId: string, userId: string) {
  const webhook = await getWebhook(webhookId, userId);
  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const deliveryId = generateId();
  const payload: WebhookPayload = {
    event: "evaluation.completed" as WebhookEventType,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook delivery from PromptForge",
      webhookId,
    },
  };

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create delivery record
  await db.insert(webhookDeliveries).values({
    id: deliveryId,
    webhookId,
    event: "test",
    payload: payload as unknown as Record<string, unknown>,
    attempts: 1,
    createdAt: new Date(),
  });

  // Attempt delivery
  const result = await deliverToEndpoint(webhook, payload, deliveryId);

  // Update delivery record
  await db!
    .update(webhookDeliveries)
    .set({
      statusCode: result.statusCode,
      response: result.response,
      deliveredAt: result.success ? new Date() : null,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  return {
    success: result.success,
    statusCode: result.statusCode,
    response: result.response,
    deliveryId,
  };
}

/**
 * Get available webhook event types
 */
export function getAvailableEvents(): { event: WebhookEventType; description: string }[] {
  return [
    { event: "evaluation.completed", description: "When an evaluation finishes successfully" },
    { event: "evaluation.failed", description: "When an evaluation fails" },
    { event: "budget.threshold_50", description: "When budget reaches 50%" },
    { event: "budget.threshold_75", description: "When budget reaches 75%" },
    { event: "budget.threshold_90", description: "When budget reaches 90%" },
    { event: "budget.exceeded", description: "When budget is exceeded" },
    { event: "security.login_new_device", description: "When login from a new device is detected" },
    { event: "security.login_new_location", description: "When login from a new location is detected" },
    { event: "security.permission_denied", description: "When a permission denied event occurs" },
    { event: "security.2fa_disabled", description: "When 2FA is disabled on an account" },
    { event: "prompt.created", description: "When a new prompt is created" },
    { event: "prompt.updated", description: "When a prompt is updated" },
    { event: "prompt.deleted", description: "When a prompt is deleted" },
    { event: "test_suite.passed", description: "When a test suite passes" },
    { event: "test_suite.failed", description: "When a test suite fails" },
  ];
}

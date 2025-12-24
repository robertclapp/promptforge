import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createWebhook,
  getUserWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  testWebhook,
  getAvailableEvents,
} from "../services/webhookDelivery.service";

export const webhooksRouter = router({
  /**
   * Get available webhook event types
   */
  getAvailableEvents: protectedProcedure.query(() => {
    return getAvailableEvents();
  }),

  /**
   * Create a new webhook
   */
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createWebhook(ctx.user.id, input.url, input.events, input.name);
    }),

  /**
   * List user's webhooks
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserWebhooks(ctx.user.id);
  }),

  /**
   * Get webhook by ID
   */
  get: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getWebhook(input.webhookId, ctx.user.id);
    }),

  /**
   * Update webhook
   */
  update: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { webhookId, ...updates } = input;
      await updateWebhook(webhookId, ctx.user.id, updates);
      return { success: true };
    }),

  /**
   * Delete webhook
   */
  delete: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteWebhook(input.webhookId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get webhook delivery logs
   */
  getDeliveries: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return getWebhookDeliveries(input.webhookId, ctx.user.id, input.limit);
    }),

  /**
   * Test webhook by sending a test event
   */
  test: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return testWebhook(input.webhookId, ctx.user.id);
    }),
});

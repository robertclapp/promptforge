/**
 * Export Webhook Router
 * Handles webhook management for export events
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  retryDelivery,
  testWebhook,
} from "../services/exportWebhook.service";

export const exportWebhookRouter = router({
  /**
   * Create a new webhook
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        url: z.string().url(),
        secret: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        triggerOnExportComplete: z.boolean().default(true),
        triggerOnExportFailed: z.boolean().default(true),
        triggerOnImportComplete: z.boolean().default(false),
        triggerOnImportFailed: z.boolean().default(false),
        triggerOnScheduledExport: z.boolean().default(true),
        triggerOnShareAccess: z.boolean().default(false),
        maxRetries: z.number().min(0).max(10).default(3),
        retryDelaySeconds: z.number().min(10).max(3600).default(60),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createWebhook({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * List webhooks
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        activeOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return listWebhooks({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Get a specific webhook
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getWebhook({
        id: input.id,
        userId: ctx.user.id,
      });
    }),

  /**
   * Update a webhook
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        url: z.string().url().optional(),
        secret: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        triggerOnExportComplete: z.boolean().optional(),
        triggerOnExportFailed: z.boolean().optional(),
        triggerOnImportComplete: z.boolean().optional(),
        triggerOnImportFailed: z.boolean().optional(),
        triggerOnScheduledExport: z.boolean().optional(),
        triggerOnShareAccess: z.boolean().optional(),
        maxRetries: z.number().min(0).max(10).optional(),
        retryDelaySeconds: z.number().min(10).max(3600).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateWebhook({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  /**
   * Delete a webhook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteWebhook({
        id: input.id,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  /**
   * Get webhook deliveries
   */
  deliveries: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return getWebhookDeliveries({
        webhookId: input.webhookId,
        userId: ctx.user.id,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Retry a failed delivery
   */
  retry: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await retryDelivery({
        deliveryId: input.deliveryId,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  /**
   * Test a webhook
   */
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return testWebhook({
        id: input.id,
        userId: ctx.user.id,
      });
    }),
});

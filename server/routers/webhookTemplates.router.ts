/**
 * Webhook Templates Router
 * Provides endpoints for webhook template management
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getWebhookTemplates,
  getWebhookTemplate,
  generatePayloadPreview,
  validateWebhookUrl,
  formatPayloadForService,
  WebhookPayload,
} from "../services/webhookTemplates.service";

export const webhookTemplatesRouter = router({
  // List all available templates
  list: protectedProcedure.query(async () => {
    const templates = getWebhookTemplates();
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      service: t.service,
      icon: t.icon,
      urlPlaceholder: t.urlPlaceholder,
      documentation: t.documentation,
    }));
  }),

  // Get a specific template by ID
  get: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      const template = getWebhookTemplate(input.templateId);
      if (!template) {
        throw new Error("Template not found");
      }
      return template;
    }),

  // Generate a preview of the webhook payload
  preview: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        sampleData: z
          .object({
            eventType: z.string().optional(),
            exportName: z.string().optional(),
            promptCount: z.number().optional(),
            fileSize: z.number().optional(),
            status: z.enum(["success", "failed"]).optional(),
            errorMessage: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const preview = generatePayloadPreview(input.templateId, input.sampleData);
        return {
          success: true,
          payload: preview,
          payloadJson: JSON.stringify(preview, null, 2),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate preview",
        };
      }
    }),

  // Validate a webhook URL for a specific template
  validateUrl: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        url: z.string(),
      })
    )
    .query(async ({ input }) => {
      return validateWebhookUrl(input.templateId, input.url);
    }),

  // Format a payload for a specific service
  formatPayload: protectedProcedure
    .input(
      z.object({
        service: z.enum(["slack", "discord", "teams", "generic"]),
        payload: z.object({
          eventType: z.string(),
          timestamp: z.date(),
          userId: z.string(),
          userName: z.string().optional(),
          exportId: z.string().optional(),
          exportName: z.string().optional(),
          promptCount: z.number().optional(),
          fileSize: z.number().optional(),
          fileUrl: z.string().optional(),
          status: z.enum(["success", "failed"]).optional(),
          errorMessage: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const formattedPayload = formatPayloadForService(
        input.service,
        input.payload as WebhookPayload
      );
      return {
        payload: formattedPayload,
        payloadJson: JSON.stringify(formattedPayload, null, 2),
      };
    }),
});

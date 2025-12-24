/**
 * Export Template Router
 * Handles CRUD operations for reusable export configurations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissions";
import {
  createExportTemplate,
  getUserExportTemplates,
  getExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  duplicateExportTemplate,
  getTemplateStats,
  incrementTemplateUsage,
} from "../services/exportTemplate.service";

export const exportTemplateRouter = router({
  // List all export templates for the user
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    const templates = await getUserExportTemplates(ctx.user.id, organizationId ?? undefined);
    return templates;
  }),

  // Get a single export template
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await getExportTemplate(input.id, ctx.user.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      return template;
    }),

  // Create a new export template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        exportAll: z.boolean().default(true),
        promptIds: z.array(z.string()).optional(),
        includeVersions: z.boolean().default(true),
        includeVariables: z.boolean().default(true),
        enableCompression: z.boolean().default(false),
        // Schedule configuration
        frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hour: z.number().min(0).max(23).default(0),
        minute: z.number().min(0).max(59).default(0),
        // Notification preferences
        notifyOnSuccess: z.boolean().default(true),
        notifyOnFailure: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;

      // Check permission if in a workspace
      if (organizationId) {
        await requirePermission(ctx.user.id, organizationId, "VIEW_PROMPTS");
      }

      const result = await createExportTemplate({
        userId: ctx.user.id,
        organizationId: organizationId ?? undefined,
        ...input,
      });

      return result;
    }),

  // Update an export template
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        exportAll: z.boolean().optional(),
        promptIds: z.array(z.string()).optional(),
        includeVersions: z.boolean().optional(),
        includeVariables: z.boolean().optional(),
        enableCompression: z.boolean().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
        dayOfWeek: z.number().min(0).max(6).nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).nullable().optional(),
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        notifyOnSuccess: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const result = await updateExportTemplate(id, ctx.user.id, updates);
      return result;
    }),

  // Delete an export template
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExportTemplate(input.id, ctx.user.id);
      return { success: true };
    }),

  // Duplicate an export template
  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await duplicateExportTemplate(input.id, ctx.user.id, input.newName);
      return result;
    }),

  // Get template statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    const stats = await getTemplateStats(ctx.user.id, organizationId ?? undefined);
    return stats;
  }),

  // Mark template as used (increment usage count)
  markUsed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership first
      const template = await getExportTemplate(input.id, ctx.user.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      
      await incrementTemplateUsage(input.id);
      return { success: true };
    }),
});

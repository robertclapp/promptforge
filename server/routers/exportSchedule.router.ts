/**
 * Export Schedule Router
 * Handles scheduled export operations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissions";
import {
  createExportSchedule,
  getUserExportSchedules,
  getExportSchedule,
  updateExportSchedule,
  deleteExportSchedule,
  toggleExportSchedule,
  executeScheduledExport,
} from "../services/exportSchedule.service";

export const exportScheduleRouter = router({
  // List all export schedules for the user
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    const schedules = await getUserExportSchedules(ctx.user.id, organizationId ?? undefined);
    return schedules;
  }),

  // Get a single export schedule
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const schedule = await getExportSchedule(input.id, ctx.user.id);
      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }
      return schedule;
    }),

  // Create a new export schedule
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hour: z.number().min(0).max(23).default(0),
        minute: z.number().min(0).max(59).default(0),
        exportAll: z.boolean().default(true),
        promptIds: z.array(z.string()).optional(),
        includeVersions: z.boolean().default(true),
        includeVariables: z.boolean().default(true),
        notifyOnSuccess: z.boolean().default(true),
        notifyOnFailure: z.boolean().default(true),
        enableCompression: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;

      // Check permission if in a workspace
      if (organizationId) {
        await requirePermission(ctx.user.id, organizationId, "VIEW_PROMPTS");
      }

      const result = await createExportSchedule({
        userId: ctx.user.id,
        organizationId: organizationId ?? undefined,
        ...input,
      });

      return result;
    }),

  // Update an export schedule
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        exportAll: z.boolean().optional(),
        promptIds: z.array(z.string()).optional(),
        includeVersions: z.boolean().optional(),
        includeVariables: z.boolean().optional(),
        notifyOnSuccess: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
        enableCompression: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const result = await updateExportSchedule(id, ctx.user.id, updates);
      return result;
    }),

  // Delete an export schedule
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExportSchedule(input.id, ctx.user.id);
      return { success: true };
    }),

  // Toggle an export schedule's active status
  toggle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await toggleExportSchedule(input.id, ctx.user.id);
      return result;
    }),

  // Manually run a scheduled export
  runNow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const schedule = await getExportSchedule(input.id, ctx.user.id);
      if (!schedule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      const result = await executeScheduledExport(input.id);
      return result;
    }),
});

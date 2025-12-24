import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as auditRetentionService from "../services/auditRetention.service";
import { requirePermission } from "../_core/permissions";
import { TRPCError } from "@trpc/server";
import { logResourceOperation } from "../services/audit.service";

export const auditRetentionRouter = router({
  /**
   * Get retention settings for the current workspace
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    // Only owners can view retention settings
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    return auditRetentionService.getRetentionSettings(ctx.activeTeamId);
  }),

  /**
   * Update retention settings
   */
  updateSettings: protectedProcedure
    .input(z.object({
      retentionDays: z.number().min(0).max(365).optional(),
      archiveBeforeDelete: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can modify retention settings
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      const oldSettings = await auditRetentionService.getRetentionSettings(ctx.activeTeamId);
      const newSettings = await auditRetentionService.updateRetentionSettings(ctx.activeTeamId, input);

      // Log the change
      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "retention_settings",
        resourceId: ctx.activeTeamId,
        resourceName: "Audit Log Retention",
        status: "success",
        previousValue: { ...oldSettings } as Record<string, unknown>,
        newValue: { ...newSettings } as Record<string, unknown>,
      });

      return newSettings;
    }),

  /**
   * Get retention statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Only admins and owners can view retention stats
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    return auditRetentionService.getRetentionStats(ctx.activeTeamId);
  }),

  /**
   * Manually run cleanup
   */
  runCleanup: protectedProcedure.mutation(async ({ ctx }) => {
    // Only owners can run cleanup
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    const result = await auditRetentionService.runCleanup(ctx.activeTeamId);

    // Log the cleanup
    await logResourceOperation({
      userId: ctx.user.id,
      userName: ctx.user.name || undefined,
      userEmail: ctx.user.email || undefined,
      organizationId: ctx.activeTeamId,
      eventType: "settings_changed",
      resourceType: "audit_cleanup",
      resourceId: ctx.activeTeamId,
      resourceName: "Manual Audit Cleanup",
      status: "success",
      details: result,
    });

    return result;
  }),

  /**
   * Get archived logs
   */
  getArchives: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view archives
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return auditRetentionService.getArchivedLogs(ctx.activeTeamId, input.limit, input.offset);
    }),

  /**
   * Get a specific archive with its data
   */
  getArchive: protectedProcedure
    .input(z.object({
      archiveId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view archives
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      const archive = await auditRetentionService.getArchiveById(ctx.activeTeamId, input.archiveId);
      
      if (!archive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Archive not found",
        });
      }

      return archive;
    }),

  /**
   * Delete an archive
   */
  deleteArchive: protectedProcedure
    .input(z.object({
      archiveId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can delete archives
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await auditRetentionService.deleteArchive(ctx.activeTeamId, input.archiveId);

      // Log the deletion
      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "audit_archive",
        resourceId: input.archiveId,
        resourceName: "Audit Archive",
        status: "success",
        details: { action: "delete" },
      });

      return { success: true };
    }),
});

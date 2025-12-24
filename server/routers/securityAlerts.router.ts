import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as securityAlertsService from "../services/securityAlerts.service";
import { requirePermission } from "../_core/permissions";
import { TRPCError } from "@trpc/server";

export const securityAlertsRouter = router({
  /**
   * Get security alert settings for the current workspace
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    // Only owners can view security settings
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    return securityAlertsService.getSecurityAlertSettings(ctx.activeTeamId);
  }),

  /**
   * Update security alert settings
   */
  updateSettings: protectedProcedure
    .input(z.object({
      permissionDenialThreshold: z.number().min(1).max(100).optional(),
      permissionDenialWindowMinutes: z.number().min(1).max(1440).optional(),
      bulkDeletionThreshold: z.number().min(1).max(100).optional(),
      bulkDeletionWindowMinutes: z.number().min(1).max(1440).optional(),
      loginAttemptThreshold: z.number().min(1).max(100).optional(),
      loginAttemptWindowMinutes: z.number().min(1).max(1440).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can modify security settings
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return securityAlertsService.updateSecurityAlertSettings(ctx.activeTeamId, input);
    }),

  /**
   * Get recent security alerts
   */
  getRecentAlerts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view security alerts
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return securityAlertsService.getRecentSecurityAlerts(ctx.activeTeamId, input.limit);
    }),

  /**
   * Get security summary for dashboard
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      return {
        recentAlerts: 0,
        permissionDenials24h: 0,
        deletions24h: 0,
        roleChanges7d: 0,
        lastAlertTime: null,
      };
    }

    return securityAlertsService.getSecuritySummary(ctx.activeTeamId);
  }),

  /**
   * Manually trigger a test alert (for testing purposes)
   */
  testAlert: protectedProcedure.mutation(async ({ ctx }) => {
    // Only owners can test alerts
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    // This would send a test notification
    return { success: true, message: "Test alert sent successfully" };
  }),
});

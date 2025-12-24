import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as workspaceAnalyticsService from "../services/workspaceAnalytics.service";

export const workspaceAnalyticsRouter = router({
  /**
   * Get comprehensive metrics for the active workspace
   */
  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return await workspaceAnalyticsService.getWorkspaceMetrics(ctx.activeTeamId);
  }),

  /**
   * Get top contributors in the workspace
   */
  getTopContributors: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.activeTeamId) {
        throw new Error("No active workspace selected");
      }
      return await workspaceAnalyticsService.getTopContributors(
        ctx.activeTeamId,
        input?.limit || 5
      );
    }),

  /**
   * Get activity timeline for the workspace
   */
  getActivityTimeline: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return await workspaceAnalyticsService.getActivityTimeline(ctx.activeTeamId);
  }),

  /**
   * Get growth metrics for the workspace
   */
  getGrowthMetrics: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return await workspaceAnalyticsService.getGrowthMetrics(ctx.activeTeamId);
  }),
});

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Analytics Router
 * Handles usage analytics and metrics
 */
export const analyticsRouter = router({
  /**
   * Get dashboard metrics summary
   */
  getDashboard: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get actual counts from database
      const prompts = await db.getUserPrompts(ctx.user.id);
      const evaluations = await db.getUserEvaluations(ctx.user.id);
      const providers = await db.getUserAIProviders(ctx.user.id);
      const events = await db.getUserAnalytics(ctx.user.id);
      
      const stats = {
        totalPrompts: prompts.length,
        totalEvaluations: evaluations.length,
        totalProviders: providers.length,
        totalEvents: events.length,
      };
      return stats;
    }),

  /**
   * Get usage over time
   */
  getUsageOverTime: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement time-series analytics query
      const events = await db.getUserAnalytics(ctx.user.id);
      
      // Group by time period
      // This is a simplified version - in production, use SQL GROUP BY
      return events;
    }),

  /**
   * Get event breakdown by type
   */
  getEventBreakdown: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const events = await db.getUserAnalytics(ctx.user.id);
      
      // Count events by type
      const breakdown = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(breakdown).map(([type, count]) => ({
        eventType: type,
        count,
      }));
    }),

  /**
   * Track a custom analytics event
   */
  trackEvent: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
        eventData: z.record(z.string(), z.any()).optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        eventType: input.eventType,
        eventData: input.eventData || {},
      });

      return { success: true };
    }),
});

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getApiUsageStats,
  getRateLimitStats,
  getTopConsumers,
  getHourlyPattern,
  getApiUsageSummary,
} from "../services/apiAnalytics.service";

export const apiAnalyticsRouter = router({
  /**
   * Get API usage statistics
   */
  getUsageStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getApiUsageStats(ctx.user.id, input?.days || 30);
    }),

  /**
   * Get rate limit statistics
   */
  getRateLimitStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getRateLimitStats(ctx.user.id, input?.days || 7);
    }),

  /**
   * Get top API consumers
   */
  getTopConsumers: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getTopConsumers(ctx.user.id, input?.days || 30);
    }),

  /**
   * Get hourly usage pattern
   */
  getHourlyPattern: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getHourlyPattern(ctx.user.id, input?.days || 7);
    }),

  /**
   * Get API usage summary for dashboard
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      return getApiUsageSummary(ctx.user.id);
    }),
});

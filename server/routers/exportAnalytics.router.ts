/**
 * Export Analytics Router
 * Provides analytics endpoints for export operations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getExportFrequency,
  getFileSizeTrends,
  getTemplateUsage,
  getExportTypeBreakdown,
  getAnalyticsSummary,
  getHourlyDistribution,
} from "../services/exportAnalytics.service";

export const exportAnalyticsRouter = router({
  // Get export/import frequency over time
  frequency: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getExportFrequency(ctx.user.id, organizationId || undefined, input.days);
    }),

  // Get file size trends over time
  fileSizeTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getFileSizeTrends(ctx.user.id, organizationId || undefined, input.days);
    }),

  // Get most used templates
  templateUsage: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getTemplateUsage(ctx.user.id, organizationId || undefined, input.limit);
    }),

  // Get export type breakdown (manual vs scheduled)
  typeBreakdown: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getExportTypeBreakdown(ctx.user.id, organizationId || undefined, input.days);
    }),

  // Get analytics summary
  summary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getAnalyticsSummary(ctx.user.id, organizationId || undefined, input.days);
    }),

  // Get hourly distribution of exports
  hourlyDistribution: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      
      return getHourlyDistribution(ctx.user.id, organizationId || undefined, input.days);
    }),
});

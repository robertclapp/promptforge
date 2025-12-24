/**
 * Prompt Performance Router
 * Analytics endpoints for response times, token usage, and cost comparisons
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { promptPerformanceService } from "../services/promptPerformance.service";
import { requirePermission } from "../_core/permissions";

export const promptPerformanceRouter = router({
  // Get performance metrics for a specific prompt
  getPromptMetrics: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      promptId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.workspaceId, 'VIEW_PROMPTS');
      
      return promptPerformanceService.getPromptMetrics(
        input.workspaceId,
        input.promptId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),

  // Get workspace-wide performance summary
  getWorkspaceSummary: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.workspaceId, 'VIEW_ANALYTICS');
      
      return promptPerformanceService.getWorkspaceSummary(
        input.workspaceId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    }),

  // Get token usage trends over time
  getTokenUsageTrends: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      days: z.number().min(1).max(365).default(30)
    }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.user.id, input.workspaceId, 'VIEW_ANALYTICS');
      
      return promptPerformanceService.getTokenUsageTrends(
        input.workspaceId,
        input.days
      );
    })
});

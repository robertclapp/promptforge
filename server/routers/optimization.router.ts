import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as optimizationService from "../services/promptOptimization.service";
import { requirePermission } from "../_core/permissions";

export const optimizationRouter = router({
  /**
   * Optimize a prompt using AI
   */
  optimize: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check create permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'CREATE_OPTIMIZATIONS');
      }

      const suggestion = await optimizationService.optimizePrompt(input.promptId, ctx.user.id);
      return suggestion;
    }),

  /**
   * Apply an optimization to a prompt
   */
  applyOptimization: protectedProcedure
    .input(z.object({ optimizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check create permission (applying optimization creates a new prompt version)
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'CREATE_PROMPTS');
      }

      const versionId = await optimizationService.applyOptimization(
        input.optimizationId,
        ctx.user.id
      );
      return { versionId };
    }),

  /**
   * Get optimization history for a prompt
   */
  getPromptHistory: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return await optimizationService.getPromptOptimizations(input.promptId);
    }),

  /**
   * Get optimization by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await optimizationService.getOptimization(input.id);
    }),

  /**
   * Get all optimizations for current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await optimizationService.getUserOptimizations(ctx.user.id);
  }),
});

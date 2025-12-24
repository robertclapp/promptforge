import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as apiKeyService from "../services/apiKey.service";

export const apiKeysRouter = router({
  /**
   * Get all API keys for current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await apiKeyService.getUserAPIKeys(ctx.user.id);
  }),

  /**
   * Create a new API key
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        rateLimit: z.number().int().min(100).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await apiKeyService.createAPIKey(
        ctx.user.id,
        input.name,
        input.rateLimit
      );
      return result;
    }),

  /**
   * Revoke (deactivate) an API key
   */
  revoke: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await apiKeyService.revokeAPIKey(input.keyId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Delete an API key
   */
  deleteKey: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await apiKeyService.deleteAPIKey(input.keyId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get API usage statistics
   */
  getUsageStats: protectedProcedure
    .input(
      z.object({
        hours: z.number().int().min(1).max(168).optional(), // Max 1 week
      })
    )
    .query(async ({ ctx, input }) => {
      return await apiKeyService.getAPIUsageStats(ctx.user.id, input.hours || 24);
    }),
});

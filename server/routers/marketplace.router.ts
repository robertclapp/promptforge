import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as marketplaceService from "../services/marketplace.service";
import { requirePermission } from "../_core/permissions";

export const marketplaceRouter = router({
  /**
   * Get all public templates (optionally filtered by category)
   */
  getTemplates: publicProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await marketplaceService.getPublicTemplates(input?.categoryId);
    }),

  /**
   * Search templates by name or description
   */
  searchTemplates: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return await marketplaceService.searchTemplates(input.query);
    }),

  /**
   * Get template statistics
   */
  getTemplateStats: publicProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return await marketplaceService.getTemplateStats(input.promptId);
    }),

  /**
   * Get template ratings/reviews
   */
  getTemplateRatings: publicProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return await marketplaceService.getTemplateRatings(input.promptId);
    }),

  /**
   * Publish a prompt as a public template
   */
  publishTemplate: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        categoryIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check publish permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'PUBLISH_TEMPLATES');
      }

      return await marketplaceService.publishTemplate(
        input.promptId,
        ctx.user.id,
        input.categoryIds
      );
    }),

  /**
   * Unpublish a template
   */
  unpublishTemplate: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check unpublish permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'UNPUBLISH_TEMPLATES');
      }

      return await marketplaceService.unpublishTemplate(input.promptId, ctx.user.id);
    }),

  /**
   * Rate a template
   */
  rateTemplate: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        rating: z.number().int().min(1).max(5),
        review: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await marketplaceService.rateTemplate(
        input.promptId,
        ctx.user.id,
        input.rating,
        input.review
      );
    }),

  /**
   * Use a template (copy to user's prompts)
   */
  useTemplate: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await marketplaceService.useTemplate(input.promptId, ctx.user.id);
    }),

  /**
   * Get all categories
   */
  getCategories: publicProcedure.query(async () => {
    return await marketplaceService.getCategories();
  }),
});

/**
 * Template Ratings Router
 * API endpoints for rating and reviewing templates
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  rateTemplate,
  getTemplateRatings,
  getTemplateRatingStats,
  getUserRating,
  deleteRating,
  voteHelpful,
  hasVotedHelpful,
  getTopRatedTemplates,
} from "../services/templateRatings.service";

export const templateRatingsRouter = router({
  // Rate a template
  rate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        templateType: z.enum(["builtin", "user"]).default("builtin"),
        rating: z.number().min(1).max(5),
        review: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return rateTemplate({
        templateId: input.templateId,
        templateType: input.templateType,
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        rating: input.rating,
        review: input.review,
      });
    }),

  // Get ratings for a template
  getByTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.string(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return getTemplateRatings(input.templateId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get rating statistics for a template
  getStats: publicProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      return getTemplateRatingStats(input.templateId);
    }),

  // Get user's rating for a template
  getUserRating: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getUserRating(input.templateId, ctx.user.id);
    }),

  // Delete a rating
  delete: protectedProcedure
    .input(z.object({ ratingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteRating(input.ratingId, ctx.user.id);
    }),

  // Vote a review as helpful
  voteHelpful: protectedProcedure
    .input(z.object({ ratingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return voteHelpful(input.ratingId, ctx.user.id);
    }),

  // Check if user voted helpful
  hasVotedHelpful: protectedProcedure
    .input(z.object({ ratingId: z.string() }))
    .query(async ({ ctx, input }) => {
      return hasVotedHelpful(input.ratingId, ctx.user.id);
    }),

  // Get top-rated templates
  getTopRated: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return getTopRatedTemplates(input.limit);
    }),
});

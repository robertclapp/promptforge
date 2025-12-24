/**
 * Templates Router
 * Provides access to the curated prompt templates library
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { templatesService } from "../services/templates.service";

export const templatesRouter = router({
  // Get all template categories
  getCategories: publicProcedure.query(() => {
    return templatesService.getCategories();
  }),

  // Get all templates
  getAll: publicProcedure.query(() => {
    return templatesService.getAllTemplates();
  }),

  // Get templates by category
  getByCategory: publicProcedure
    .input(z.object({
      category: z.enum([
        "customer_support",
        "code_review", 
        "content_writing",
        "data_analysis",
        "translation",
        "summarization",
        "creative",
        "business"
      ])
    }))
    .query(({ input }) => {
      return templatesService.getByCategory(input.category);
    }),

  // Get a single template by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return templatesService.getById(input.id);
    }),

  // Search templates
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(({ input }) => {
      return templatesService.search(input.query);
    }),

  // Get templates by difficulty
  getByDifficulty: publicProcedure
    .input(z.object({
      difficulty: z.enum(["beginner", "intermediate", "advanced"])
    }))
    .query(({ input }) => {
      return templatesService.getByDifficulty(input.difficulty);
    }),

  // Get featured templates for new users
  getFeatured: publicProcedure.query(() => {
    return templatesService.getFeatured();
  }),

  // Get template statistics
  getStats: publicProcedure.query(() => {
    return templatesService.getStats();
  }),

  // Import a template into user's prompts
  import: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      workspaceId: z.number(),
      customName: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      return templatesService.importTemplate(
        input.templateId,
        ctx.user.id,
        input.workspaceId,
        input.customName
      );
    })
});

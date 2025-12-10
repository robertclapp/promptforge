import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { withTransaction } from "../utils/transaction";

/**
 * Prompts Router
 * Handles all prompt-related operations including CRUD and versioning
 */
export const promptsRouter = router({
  /**
   * List prompts with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isTemplate: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const prompts = await db.getUserPrompts(ctx.user.id, input);
      return prompts;
    }),

  /**
   * Get a single prompt by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const prompt = await db.getPrompt(input.id);
      
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      // Check access permissions
      if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return prompt;
    }),

  /**
   * Get version history for a prompt
   */
  getVersions: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ ctx, input }) => {
      const prompt = await db.getPrompt(input.promptId);
      
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const versions = await db.getPromptVersions(input.promptId);
      return versions;
    }),

  /**
   * Create a new prompt with initial version
   * Uses transaction to ensure atomicity
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        content: z.string().min(1),
        variables: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        folderPath: z.string().default("/"),
        isTemplate: z.boolean().default(false),
        isPublic: z.boolean().default(false),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use transaction to ensure prompt and version are created atomically
      const promptId = await withTransaction(async () => {
        const id = await db.createPrompt({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          content: input.content,
          variables: input.variables || [],
          tags: input.tags || [],
          folderPath: input.folderPath,
          isTemplate: input.isTemplate,
          isPublic: input.isPublic,
          organizationId: input.organizationId,
        });

        // Create initial version
        await db.createPromptVersion({
          promptId: id,
          version: 1,
          content: input.content,
          variables: input.variables || [],
          changeMessage: "Initial version",
          createdBy: ctx.user.id,
        });

        return id;
      });

      // Track analytics (outside transaction)
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        eventType: "prompt_created",
        eventData: { promptId, name: input.name },
      });

      return { id: promptId };
    }),

  /**
   * Update an existing prompt
   * Creates new version if content changes
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        content: z.string().min(1).optional(),
        variables: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        folderPath: z.string().optional(),
        isTemplate: z.boolean().optional(),
        isPublic: z.boolean().optional(),
        changeMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prompt = await db.getPrompt(input.id);
      
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      if (prompt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const { id, changeMessage, ...updates } = input;

      // Use transaction for version creation and update
      await withTransaction(async () => {
        // If content changed, create new version
        if (updates.content && updates.content !== prompt.content) {
          const newVersion = prompt.version + 1;
          await db.createPromptVersion({
            promptId: id,
            version: newVersion,
            content: updates.content,
            variables: updates.variables || prompt.variables || [],
            changeMessage: changeMessage || `Version ${newVersion}`,
            createdBy: ctx.user.id,
          });
          (updates as any).version = newVersion;
        }

        await db.updatePrompt(id, updates);
      });

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: prompt.organizationId,
        eventType: "prompt_updated",
        eventData: { promptId: id },
      });

      return { success: true };
    }),

  /**
   * Delete a prompt
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prompt = await db.getPrompt(input.id);
      
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      if (prompt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await db.deletePrompt(input.id);

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: prompt.organizationId,
        eventType: "prompt_deleted",
        eventData: { promptId: input.id },
      });

      return { success: true };
    }),
});

/**
 * Collections Router
 * API endpoints for managing prompt collections/folders
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as collectionsService from "../services/collections.service";

export const collectionsRouter = router({
  /**
   * Create a new collection
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        color: z.string().max(20).optional(),
        icon: z.string().max(50).optional(),
        parentId: z.string().optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.createCollection({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        parentId: input.parentId,
      });
    }),

  /**
   * Get all collections for the current user
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await collectionsService.getUserCollections(
        ctx.user.id,
        input?.organizationId
      );
    }),

  /**
   * Get a single collection with its prompts
   */
  getById: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await collectionsService.getCollectionWithPrompts(
        input.collectionId,
        ctx.user.id
      );
    }),

  /**
   * Update a collection
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        color: z.string().max(20).optional(),
        icon: z.string().max(50).optional(),
        parentId: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.updateCollection({
        id: input.id,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        parentId: input.parentId ?? undefined,
        sortOrder: input.sortOrder,
      });
    }),

  /**
   * Delete a collection
   */
  delete: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.deleteCollection(
        input.collectionId,
        ctx.user.id
      );
    }),

  /**
   * Add a prompt to a collection
   */
  addPrompt: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        collectionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.addPromptToCollection(
        input.promptId,
        input.collectionId,
        ctx.user.id
      );
    }),

  /**
   * Remove a prompt from a collection
   */
  removePrompt: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        collectionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.removePromptFromCollection(
        input.promptId,
        input.collectionId
      );
    }),

  /**
   * Reorder a prompt within a collection
   */
  reorderPrompt: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        collectionId: z.string(),
        newSortOrder: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.reorderPromptInCollection(
        input.promptId,
        input.collectionId,
        input.newSortOrder
      );
    }),

  /**
   * Share a collection
   */
  share: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        sharedWithUserId: z.string().optional(),
        sharedWithOrgId: z.string().optional(),
        permission: z.enum(["view", "edit"]).default("view"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await collectionsService.shareCollection(
        input.collectionId,
        ctx.user.id,
        input.sharedWithUserId,
        input.sharedWithOrgId,
        input.permission
      );
    }),

  /**
   * Get collections containing a specific prompt
   */
  getForPrompt: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await collectionsService.getCollectionsForPrompt(
        input.promptId,
        ctx.user.id
      );
    }),

  /**
   * Get collection count
   */
  getCount: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await collectionsService.getCollectionCount(
        ctx.user.id,
        input?.organizationId
      );
    }),
});

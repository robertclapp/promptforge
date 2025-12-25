/**
 * Export Versioning Router
 * Handles version management for exports
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createExportVersion,
  listExportVersions,
  getExportVersion,
  compareExportVersions,
  updateExportVersion,
  deleteExportVersion,
  getVersionStats,
  restoreFromVersion,
} from "../services/exportVersioning.service";

export const exportVersioningRouter = router({
  /**
   * Create a new export version
   */
  create: protectedProcedure
    .input(
      z.object({
        exportHistoryId: z.string(),
        versionName: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createExportVersion({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * List export versions
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        includeArchived: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return listExportVersions({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Get a specific version
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getExportVersion({
        id: input.id,
        userId: ctx.user.id,
      });
    }),

  /**
   * Compare two versions
   */
  compare: protectedProcedure
    .input(
      z.object({
        versionId1: z.string(),
        versionId2: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return compareExportVersions({
        userId: ctx.user.id,
        versionId1: input.versionId1,
        versionId2: input.versionId2,
      });
    }),

  /**
   * Update a version
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        versionName: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isArchived: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateExportVersion({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  /**
   * Delete a version
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExportVersion({
        id: input.id,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  /**
   * Get version statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    return getVersionStats({
      userId: ctx.user.id,
    });
  }),

  /**
   * Restore from a version
   */
  restore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return restoreFromVersion({
        id: input.id,
        userId: ctx.user.id,
      });
    }),
});

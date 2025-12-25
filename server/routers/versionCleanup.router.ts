/**
 * Version Cleanup Router
 * Manages retention policies and automatic cleanup of old export versions
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getRetentionSettings,
  upsertRetentionSettings,
  runCleanup,
  getCleanupHistory,
  getCleanupStats,
  previewCleanup,
} from "../services/versionCleanup.service";

export const versionCleanupRouter = router({
  // Get retention settings for current user
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return getRetentionSettings(ctx.user.id);
  }),

  // Update retention settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        maxVersionsPerExport: z.number().min(1).max(100).nullable().optional(),
        maxAgeDays: z.number().min(1).max(365).nullable().optional(),
        minVersionsToKeep: z.number().min(1).max(10).optional(),
        maxTotalSizeMb: z.number().min(1).max(10000).nullable().optional(),
        archiveBeforeDelete: z.boolean().optional(),
        archiveLocation: z.string().max(500).nullable().optional(),
        cleanupFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return upsertRetentionSettings({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Run cleanup manually
  runCleanup: protectedProcedure.mutation(async ({ ctx }) => {
    return runCleanup(ctx.user.id);
  }),

  // Preview what would be deleted
  preview: protectedProcedure.query(async ({ ctx }) => {
    return previewCleanup(ctx.user.id);
  }),

  // Get cleanup history
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return getCleanupHistory(ctx.user.id, input.limit, input.offset);
    }),

  // Get cleanup statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return getCleanupStats(ctx.user.id);
  }),
});

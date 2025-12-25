/**
 * Export Sharing Router
 * Handles creating and managing shareable links for exports
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createExportShare,
  getUserShares,
  getShareById,
  accessSharedExport,
  updateShare,
  deleteShare,
  revokeShare,
  getShareStats,
} from "../services/exportSharing.service";

export const exportSharingRouter = router({
  // Create a new share
  create: protectedProcedure
    .input(
      z.object({
        exportHistoryId: z.string(),
        password: z.string().optional(),
        maxDownloads: z.number().min(1).optional(),
        expiresInDays: z.number().min(1).max(365).optional(),
        allowPreview: z.boolean().default(true),
        allowDownload: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;

      try {
        const share = await createExportShare({
          exportHistoryId: input.exportHistoryId,
          userId: ctx.user.id,
          organizationId: organizationId || undefined,
          password: input.password,
          maxDownloads: input.maxDownloads,
          expiresInDays: input.expiresInDays,
          allowPreview: input.allowPreview,
          allowDownload: input.allowDownload,
        });

        return share;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to create share",
        });
      }
    }),

  // List user's shares
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    return getUserShares(ctx.user.id, organizationId || undefined);
  }),

  // Get a specific share
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const share = await getShareById(input.id, ctx.user.id);
      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }
      return share;
    }),

  // Update share settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().nullable().optional(),
        maxDownloads: z.number().min(1).nullable().optional(),
        expiresInDays: z.number().min(1).max(365).nullable().optional(),
        allowPreview: z.boolean().optional(),
        allowDownload: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const success = await updateShare(id, ctx.user.id, updates);
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found or update failed",
        });
      }
      return { success: true };
    }),

  // Delete a share
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await deleteShare(input.id, ctx.user.id);
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }
      return { success: true };
    }),

  // Revoke a share (soft delete)
  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await revokeShare(input.id, ctx.user.id);
      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }
      return { success: true };
    }),

  // Get share statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    return getShareStats(ctx.user.id, organizationId || undefined);
  }),

  // Access a shared export (public endpoint)
  access: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
        password: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await accessSharedExport(
        input.shareCode,
        input.password,
        ctx.req.ip || ctx.req.socket.remoteAddress,
        ctx.req.headers["user-agent"]
      );

      if (!result.success && !result.requiresPassword) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: result.error || "Share not found",
        });
      }

      return result;
    }),
});

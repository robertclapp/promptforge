/**
 * Prompt Sharing Router
 * API endpoints for sharing prompts publicly
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  createShare,
  getSharedPrompt,
  recordView,
  forkPrompt,
  getUserShares,
  deleteShare,
  updateShare,
  generateEmbedCode,
} from "../services/promptSharing.service";

export const promptSharingRouter = router({
  // Create a new share link
  create: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        accessLevel: z.enum(["view", "fork"]),
        password: z.string().optional(),
        expiresInDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createShare({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // Get a shared prompt (public)
  get: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
        password: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getSharedPrompt(input.shareCode, input.password);
    }),

  // Record a view
  recordView: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
        viewerIp: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordView(
        input.shareCode,
        input.viewerIp,
        ctx.user?.id
      );
      return { success: true };
    }),

  // Fork a shared prompt
  fork: protectedProcedure
    .input(
      z.object({
        shareCode: z.string(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return forkPrompt(input.shareCode, ctx.user.id, input.organizationId);
    }),

  // Get user's shares
  myShares: protectedProcedure.query(async ({ ctx }) => {
    return getUserShares(ctx.user.id);
  }),

  // Delete a share
  delete: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteShare(input.shareId, ctx.user.id);
    }),

  // Update share settings
  update: protectedProcedure
    .input(
      z.object({
        shareId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        accessLevel: z.enum(["view", "fork"]).optional(),
        password: z.string().nullable().optional(),
        expiresInDays: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { shareId, ...updates } = input;
      return updateShare(shareId, ctx.user.id, updates);
    }),

  // Get embed code
  getEmbedCode: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
        baseUrl: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        embedCode: generateEmbedCode(input.shareCode, input.baseUrl),
      };
    }),
});

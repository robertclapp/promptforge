import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as commentsService from "../services/comments.service";

export const commentsRouter = router({
  /**
   * Get all comments for a prompt (threaded)
   */
  getByPrompt: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return await commentsService.getCommentsByPrompt(input.promptId);
    }),

  /**
   * Get comment count for a prompt
   */
  getCount: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return await commentsService.getCommentCount(input.promptId);
    }),

  /**
   * Create a comment (with threading support)
   */
  create: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        content: z.string().min(1).max(5000),
        parentId: z.string().optional(),
        mentions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await commentsService.createComment({
        promptId: input.promptId,
        userId: ctx.user.id,
        userName: ctx.user.name || "Anonymous",
        content: input.content,
        parentId: input.parentId,
        mentions: input.mentions,
      });
    }),

  /**
   * Update a comment
   */
  update: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        content: z.string().min(1).max(5000),
        mentions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await commentsService.updateComment({
        commentId: input.commentId,
        userId: ctx.user.id,
        content: input.content,
        mentions: input.mentions,
      });
    }),

  /**
   * Delete a comment (soft delete)
   */
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await commentsService.deleteComment(input.commentId, ctx.user.id);
    }),

  /**
   * Add/toggle reaction on a comment
   */
  addReaction: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        emoji: z.string().max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await commentsService.addReaction(input.commentId, ctx.user.id, input.emoji);
    }),

  /**
   * Get user notifications
   */
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await commentsService.getUserNotifications(ctx.user.id, input.limit);
    }),

  /**
   * Mark notification as read
   */
  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await commentsService.markNotificationRead(input.notificationId, ctx.user.id);
    }),

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await commentsService.markAllNotificationsRead(ctx.user.id);
    }),

  /**
   * Search users for @mention autocomplete
   */
  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await commentsService.searchUsersForMention(input.query, input.limit);
    }),
});

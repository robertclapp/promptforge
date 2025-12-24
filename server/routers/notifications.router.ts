import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as notificationService from "../services/notification.service";

export const notificationsRouter = router({
  /**
   * List notifications for the current user
   */
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 50;
      return await notificationService.getUserNotifications(ctx.user.id, limit);
    }),

  /**
   * Get unread notification count
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await notificationService.getUnreadCount(ctx.user.id);
  }),

  /**
   * Mark a notification as read
   */
  markAsRead: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: notificationId }) => {
      return await notificationService.markAsRead(notificationId, ctx.user.id);
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return await notificationService.markAllAsRead(ctx.user.id);
  }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: notificationId }) => {
      return await notificationService.deleteNotification(notificationId, ctx.user.id);
    }),
});

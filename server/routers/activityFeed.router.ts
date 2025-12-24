import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as activityFeedService from "../services/activityFeed.service";

export const activityFeedRouter = router({
  /**
   * Get current user's activity
   */
  getMyActivity: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await activityFeedService.getUserActivity(ctx.user.id, input?.limit);
    }),

  /**
   * Get global activity feed
   */
  getGlobalActivity: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await activityFeedService.getGlobalActivity(input?.limit);
    }),
});

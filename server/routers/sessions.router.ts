import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as sessionsService from "../services/sessions.service";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const sessionsRouter = router({
  /**
   * Get all active sessions for the current user
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await sessionsService.getUserSessions(ctx.user.id);
      return { sessions };
    }),

  /**
   * Get session statistics
   */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const stats = await sessionsService.getSessionStats(ctx.user.id);
      return stats;
    }),

  /**
   * Revoke a specific session
   */
  revoke: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await sessionsService.revokeSession(input.sessionId, ctx.user.id);

      if (success) {
        await logResourceOperation({
          userId: ctx.user.id,
          userName: ctx.user.name || undefined,
          userEmail: ctx.user.email || undefined,
          organizationId: ctx.activeTeamId || undefined,
          eventType: "settings_changed",
          resourceType: "session",
          resourceId: input.sessionId,
          resourceName: "User Session",
          status: "success",
          details: { action: "revoke" },
        });
      }

      return { success };
    }),

  /**
   * Revoke all other sessions (keep current session active)
   */
  revokeAllOther: protectedProcedure
    .input(z.object({
      currentSessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const count = await sessionsService.revokeAllOtherSessions(
        ctx.user.id,
        input.currentSessionId
      );

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: "settings_changed",
        resourceType: "session",
        resourceId: "all",
        resourceName: "All Other Sessions",
        status: "success",
        details: { action: "revoke_all_other", count },
      });

      return { success: true, revokedCount: count };
    }),

  /**
   * Revoke all sessions (logout everywhere)
   */
  revokeAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const count = await sessionsService.revokeAllSessions(ctx.user.id);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: "settings_changed",
        resourceType: "session",
        resourceId: "all",
        resourceName: "All Sessions",
        status: "success",
        details: { action: "revoke_all", count },
      });

      return { success: true, revokedCount: count };
    }),
});

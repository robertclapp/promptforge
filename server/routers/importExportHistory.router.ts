/**
 * Import/Export History Router
 * Handles history tracking for import/export operations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getUserHistory,
  getHistoryEntry,
  getHistoryStats,
} from "../services/importExportHistory.service";

export const importExportHistoryRouter = router({
  // List import/export history
  list: protectedProcedure
    .input(
      z.object({
        operationType: z.enum(["export", "import"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      const history = await getUserHistory(ctx.user.id, {
        organizationId: organizationId ?? undefined,
        operationType: input.operationType,
        limit: input.limit,
        offset: input.offset,
      });
      return history;
    }),

  // Get a single history entry
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entry = await getHistoryEntry(input.id, ctx.user.id);
      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "History entry not found",
        });
      }
      return entry;
    }),

  // Get history statistics
  stats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.activeTeamId;
    const stats = await getHistoryStats(ctx.user.id, organizationId ?? undefined);
    return stats;
  }),
});

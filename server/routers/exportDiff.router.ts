import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  compareExportVersions,
  getVersionsForComparison,
  generateInlineDiff,
  getPromptDiffStats,
} from "../services/exportDiff.service";

export const exportDiffRouter = router({
  // Get available versions for comparison
  getVersions: protectedProcedure
    .input(z.object({
      exportHistoryId: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      return getVersionsForComparison(ctx.user.id, undefined);
    }),

  // Compare two export versions
  compare: protectedProcedure
    .input(z.object({
      version1Id: z.string(),
      version2Id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return compareExportVersions(ctx.user.id, input.version1Id, input.version2Id);
    }),

  // Generate inline diff for specific content
  inlineDiff: protectedProcedure
    .input(z.object({
      oldText: z.string(),
      newText: z.string(),
    }))
    .query(async ({ input }) => {
      return generateInlineDiff(input.oldText, input.newText);
    }),
});

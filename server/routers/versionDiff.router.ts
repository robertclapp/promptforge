/**
 * Version Diff Router
 * API endpoints for comparing prompt versions
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getPromptVersions,
  getVersion,
  compareVersions,
} from "../services/versionDiff.service";

export const versionDiffRouter = router({
  // Get all versions for a prompt
  getVersions: protectedProcedure
    .input(z.object({ promptId: z.string() }))
    .query(async ({ input }) => {
      return getPromptVersions(input.promptId);
    }),

  // Get a specific version
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ input }) => {
      return getVersion(input.versionId);
    }),

  // Compare two versions
  compare: protectedProcedure
    .input(
      z.object({
        leftVersionId: z.string(),
        rightVersionId: z.string(),
        includeMetrics: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      return compareVersions(
        input.leftVersionId,
        input.rightVersionId,
        input.includeMetrics
      );
    }),
});

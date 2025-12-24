/**
 * Prompt Import/Export Router
 * Handles bulk import and export of prompts in JSON format
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissions";
import {
  exportPrompts,
  importPrompts,
  getExportHistory,
} from "../services/promptImportExport.service";

export const promptImportExportRouter = router({
  // Export prompts to JSON file (stored in S3)
  export: protectedProcedure
    .input(
      z.object({
        promptIds: z.array(z.string()).optional(),
        enableCompression: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active workspace selected",
        });
      }

      // Check permission
      await requirePermission(ctx.user.id, organizationId, "VIEW_PROMPTS");

      const result = await exportPrompts({
        organizationId,
        promptIds: input.promptIds,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown User",
        workspaceName: "Workspace", // TODO: Get actual workspace name
        enableCompression: input.enableCompression,
      });

      return result;
    }),

  // Import prompts from JSON data
  import: protectedProcedure
    .input(
      z.object({
        jsonContent: z.string(),
        overwriteExisting: z.boolean().default(false),
        prefix: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active workspace selected",
        });
      }

      // Check permission
      await requirePermission(ctx.user.id, organizationId, "CREATE_PROMPTS");

      const result = await importPrompts(
        organizationId,
        ctx.user.id,
        input.jsonContent,
        {
          overwriteExisting: input.overwriteExisting,
          prefix: input.prefix,
        }
      );

      return result;
    }),

  // Get export history
  getExportHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const organizationId = ctx.activeTeamId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active workspace selected",
        });
      }

      const history = await getExportHistory(organizationId, input.limit);

      return history;
    }),
});

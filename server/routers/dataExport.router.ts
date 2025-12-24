import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createExportRequest,
  getExportRequest,
  getExportHistory,
  getExportDownloadUrl,
  createDeletionRequest,
  confirmDeletion,
  getDeletionHistory,
  getDataSummary,
} from "../services/dataExport.service";

export const dataExportRouter = router({
  /**
   * Get data summary for export preview
   */
  getDataSummary: protectedProcedure
    .query(async ({ ctx }) => {
      return getDataSummary(ctx.user.id);
    }),

  /**
   * Create a new data export request
   */
  createExport: protectedProcedure
    .input(z.object({
      exportType: z.enum(["full", "prompts", "evaluations", "settings", "activity"]),
      format: z.enum(["json", "csv", "zip"]).default("zip"),
    }))
    .mutation(async ({ ctx, input }) => {
      return createExportRequest(ctx.user.id, input.exportType, input.format);
    }),

  /**
   * Get export request status
   */
  getExportStatus: protectedProcedure
    .input(z.object({
      requestId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return getExportRequest(input.requestId, ctx.user.id);
    }),

  /**
   * Get export history
   */
  getExportHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getExportHistory(ctx.user.id, input?.limit || 20);
    }),

  /**
   * Get download URL for completed export
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({
      requestId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const url = await getExportDownloadUrl(input.requestId, ctx.user.id);
      if (!url) {
        throw new Error("Export not found or expired");
      }
      return { url };
    }),

  /**
   * Create a data deletion request
   */
  createDeletionRequest: protectedProcedure
    .input(z.object({
      deletionType: z.enum(["full", "prompts", "evaluations", "activity"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return createDeletionRequest(ctx.user.id, input.deletionType);
    }),

  /**
   * Confirm and execute deletion
   */
  confirmDeletion: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      confirmationCode: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return confirmDeletion(input.requestId, ctx.user.id, input.confirmationCode);
    }),

  /**
   * Get deletion history
   */
  getDeletionHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getDeletionHistory(ctx.user.id, input?.limit || 20);
    }),
});

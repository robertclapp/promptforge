/**
 * Export Audit Log Router
 * Handles audit log queries and settings
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getAuditLogs,
  getAuditStats,
  exportAuditLogs,
  getAuditSettings,
  updateAuditSettings,
  cleanupOldAuditLogs,
  getAuditLogEntry,
} from "../services/exportAuditLog.service";

const actionEnum = z.enum([
  "export_created",
  "export_downloaded",
  "export_shared",
  "export_share_accessed",
  "export_share_downloaded",
  "export_deleted",
  "export_encrypted",
  "export_decrypted",
  "import_started",
  "import_completed",
  "import_failed",
  "version_created",
  "version_restored",
  "version_compared",
  "webhook_triggered",
  "schedule_created",
  "schedule_updated",
  "schedule_deleted",
  "schedule_triggered",
  "template_used",
]);

const resourceTypeEnum = z.enum([
  "export",
  "import",
  "share",
  "version",
  "webhook",
  "schedule",
  "template",
]);

export const exportAuditLogRouter = router({
  /**
   * Get audit logs
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        action: actionEnum.optional(),
        resourceType: resourceTypeEnum.optional(),
        resourceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getAuditLogs({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Get a specific audit log entry
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getAuditLogEntry({
        id: input.id,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get audit statistics
   */
  stats: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getAuditStats({
        userId: ctx.user.id,
        days: input?.days,
      });
    }),

  /**
   * Export audit logs
   */
  export: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        format: z.enum(["json", "csv"]).default("json"),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      return exportAuditLogs({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Get audit settings
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return getAuditSettings({
      userId: ctx.user.id,
    });
  }),

  /**
   * Update audit settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        retentionDays: z.number().min(7).max(365).optional(),
        logExports: z.boolean().optional(),
        logImports: z.boolean().optional(),
        logShares: z.boolean().optional(),
        logVersions: z.boolean().optional(),
        logWebhooks: z.boolean().optional(),
        logSchedules: z.boolean().optional(),
        logIpAddresses: z.boolean().optional(),
        logUserAgents: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateAuditSettings({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  /**
   * Clean up old audit logs
   */
  cleanup: protectedProcedure.mutation(async ({ ctx }) => {
    return cleanupOldAuditLogs({
      userId: ctx.user.id,
    });
  }),
});

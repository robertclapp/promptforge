import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as auditService from "../services/audit.service";
import { requirePermission } from "../_core/permissions";
import { TRPCError } from "@trpc/server";

export const auditRouter = router({
  /**
   * Get audit logs for the current workspace
   */
  list: protectedProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        eventCategory: z.enum(["permission", "resource", "team", "billing", "api", "security"]).optional(),
        resourceType: z.string().optional(),
        resourceId: z.string().optional(),
        status: z.enum(["success", "failure", "denied"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return auditService.getAuditLogs({
        organizationId: ctx.activeTeamId,
        ...input,
      });
    }),

  /**
   * Get audit logs for a specific resource
   */
  getResourceLogs: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      return auditService.getResourceAuditLogs(
        input.resourceType,
        input.resourceId,
        input.limit,
        input.offset
      );
    }),

  /**
   * Get permission denied events
   */
  getPermissionDenied: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      // Get permission denied events for the organization
      const { logs } = await auditService.getAuditLogs({
        organizationId: ctx.activeTeamId,
        eventType: "permission_denied",
        limit: input?.limit || 50,
        offset: input?.offset || 0,
      });

      return logs;
    }),

  /**
   * Get sensitive operations (deletions, role changes, billing)
   */
  getSensitiveOperations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return auditService.getSensitiveOperations(
        ctx.activeTeamId,
        input?.limit || 50,
        input?.offset || 0
      );
    }),

  /**
   * Get audit log statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Only admins and owners can view audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return auditService.getAuditLogStats(
        ctx.activeTeamId,
        input?.startDate,
        input?.endDate
      );
    }),

  /**
   * Export audit logs as JSON
   */
  exportJson: protectedProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        eventCategory: z.enum(["permission", "resource", "team", "billing", "api", "security"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      // Only owners can export audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      const json = await auditService.exportAuditLogsJson({
        organizationId: ctx.activeTeamId,
        ...input,
      });

      return { data: json, filename: `audit-logs-${new Date().toISOString().split("T")[0]}.json` };
    }),

  /**
   * Export audit logs as CSV
   */
  exportCsv: protectedProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        eventCategory: z.enum(["permission", "resource", "team", "billing", "api", "security"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      // Only owners can export audit logs
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      const csv = await auditService.exportAuditLogsCsv({
        organizationId: ctx.activeTeamId,
        ...input,
      });

      return { data: csv, filename: `audit-logs-${new Date().toISOString().split("T")[0]}.csv` };
    }),
});

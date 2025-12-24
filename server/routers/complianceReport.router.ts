import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as complianceReportService from "../services/complianceReport.service";
import { requirePermission } from "../_core/permissions";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const complianceReportRouter = router({
  /**
   * Create a new compliance report
   */
  create: protectedProcedure
    .input(z.object({
      reportType: z.enum(["security_audit", "access_patterns", "compliance_summary"]),
      format: z.enum(["pdf", "csv", "json"]),
      periodStart: z.date(),
      periodEnd: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      const result = await complianceReportService.createReport(
        ctx.activeTeamId,
        ctx.user.id,
        {
          reportType: input.reportType,
          format: input.format,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        }
      );

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "compliance_report",
        resourceId: result.id,
        resourceName: `${input.reportType} Report`,
        status: "success",
        details: { 
          action: "create",
          reportType: input.reportType,
          format: input.format,
        },
      });

      return result;
    }),

  /**
   * Get a compliance report by ID
   */
  get: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      const report = await complianceReportService.getReport(input.id);
      
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      // Verify the report belongs to the user's workspace
      if (ctx.activeTeamId && report.organizationId !== ctx.activeTeamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return report;
    }),

  /**
   * List compliance reports
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
      }

      if (!ctx.activeTeamId) {
        return { reports: [], total: 0 };
      }

      return complianceReportService.listReports(ctx.activeTeamId, {
        limit: input?.limit,
        offset: input?.offset,
      });
    }),

  /**
   * Delete a compliance report
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await complianceReportService.deleteReport(ctx.activeTeamId, input.id);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "compliance_report",
        resourceId: input.id,
        resourceName: "Compliance Report",
        status: "success",
        details: { action: "delete" },
      });

      return { success: true };
    }),
});

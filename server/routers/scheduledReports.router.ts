import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createScheduledReport,
  getUserScheduledReports,
  getScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getReportDeliveries,
  sendTestReport,
  getEmailPreferences,
  updateEmailPreferences,
  generateReportData,
} from "../services/scheduledReports.service";

export const scheduledReportsRouter = router({
  /**
   * Create a new scheduled report
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        reportType: z.enum([
          "api_usage",
          "security_summary",
          "evaluation_metrics",
          "budget_status",
          "team_activity",
          "comprehensive",
        ]),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hour: z.number().min(0).max(23).optional(),
        timezone: z.string().optional(),
        emailRecipients: z.array(z.string().email()).min(1),
        includeAttachment: z.boolean().optional(),
        attachmentFormat: z.enum(["pdf", "csv", "json"]).optional(),
        workspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createScheduledReport(ctx.user.id, input);
    }),

  /**
   * List user's scheduled reports
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserScheduledReports(ctx.user.id);
  }),

  /**
   * Get scheduled report by ID
   */
  get: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getScheduledReport(input.reportId, ctx.user.id);
    }),

  /**
   * Update scheduled report
   */
  update: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        name: z.string().min(1).max(255).optional(),
        reportType: z
          .enum([
            "api_usage",
            "security_summary",
            "evaluation_metrics",
            "budget_status",
            "team_activity",
            "comprehensive",
          ])
          .optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hour: z.number().min(0).max(23).optional(),
        timezone: z.string().optional(),
        emailRecipients: z.array(z.string().email()).optional(),
        includeAttachment: z.boolean().optional(),
        attachmentFormat: z.enum(["pdf", "csv", "json"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reportId, ...updates } = input;
      await updateScheduledReport(reportId, ctx.user.id, updates);
      return { success: true };
    }),

  /**
   * Delete scheduled report
   */
  delete: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteScheduledReport(input.reportId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get report delivery history
   */
  getDeliveries: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership first
      const report = await getScheduledReport(input.reportId, ctx.user.id);
      if (!report) return [];
      return getReportDeliveries(input.reportId, input.limit);
    }),

  /**
   * Send a test report immediately
   */
  sendTest: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return sendTestReport(input.reportId, ctx.user.id);
    }),

  /**
   * Preview report data without sending
   */
  preview: protectedProcedure
    .input(
      z.object({
        reportType: z.enum([
          "api_usage",
          "security_summary",
          "evaluation_metrics",
          "budget_status",
          "team_activity",
          "comprehensive",
        ]),
        workspaceId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return generateReportData(ctx.user.id, input.reportType, input.workspaceId);
    }),

  /**
   * Get email preferences
   */
  getEmailPreferences: protectedProcedure.query(async ({ ctx }) => {
    return getEmailPreferences(ctx.user.id);
  }),

  /**
   * Update email preferences
   */
  updateEmailPreferences: protectedProcedure
    .input(
      z.object({
        securityAlerts: z.boolean().optional(),
        evaluationComplete: z.boolean().optional(),
        budgetWarnings: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
        monthlyReport: z.boolean().optional(),
        teamUpdates: z.boolean().optional(),
        emailAddress: z.string().email().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateEmailPreferences(ctx.user.id, input);
      return { success: true };
    }),
});

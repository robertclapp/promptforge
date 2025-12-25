import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Import domain-specific routers
import { promptsRouter } from "./routers/prompts.router";
import { aiProvidersRouter } from "./routers/aiProviders.router";
import { evaluationsRouter } from "./routers/evaluations.router";
import { contextPackagesRouter } from "./routers/contextPackages.router";
import { analyticsRouter } from "./routers/analytics.router";
import { playgroundRouter } from "./routers/playground.router";
import { budgetsRouter } from "./routers/budgets.router";
import { testSuitesRouter } from "./routers/testSuites.router";
import { optimizationRouter } from "./routers/optimization.router";
import { apiKeysRouter } from "./routers/apiKeys.router";
import { marketplaceRouter } from "./routers/marketplace.router";
import { commentsRouter } from "./routers/comments.router";
import { activityFeedRouter } from "./routers/activityFeed.router";
import { notificationsRouter } from "./routers/notifications.router";
import { teamsRouter } from "./routers/teams.router";
import { invitationsRouter } from "./routers/invitations.router";
import { workspaceAnalyticsRouter } from "./routers/workspaceAnalytics.router";
import { workspaceBillingRouter } from "./routers/workspaceBilling.router";
import { auditRouter } from "./routers/audit.router";
import { workspacePermissionsRouter } from "./routers/workspacePermissions.router";
import { securityAlertsRouter } from "./routers/securityAlerts.router";
import { auditRetentionRouter } from "./routers/auditRetention.router";
import { twoFactorRouter } from "./routers/twoFactor.router";
import { ipAllowlistRouter } from "./routers/ipAllowlist.router";
import { complianceReportRouter } from "./routers/complianceReport.router";
import { sessionsRouter } from "./routers/sessions.router";
import { passwordPolicyRouter } from "./routers/passwordPolicy.router";
import { securityOnboardingRouter } from "./routers/securityOnboarding.router";
import { loginActivityRouter } from "./routers/loginActivity.router";
import { apiAnalyticsRouter } from "./routers/apiAnalytics.router";
import { dataExportRouter } from "./routers/dataExport.router";
import { webhooksRouter } from "./routers/webhooks.router";
import { scheduledReportsRouter } from "./routers/scheduledReports.router";
import { onboardingRouter } from "./routers/onboarding.router";
import { templatesRouter } from "./routers/templates.router";
import { presenceRouter } from "./routers/presence.router";
import { promptPerformanceRouter } from "./routers/promptPerformance.router";
import { templateRatingsRouter } from "./routers/templateRatings.router";
import { versionDiffRouter } from "./routers/versionDiff.router";
import { promptSharingRouter } from "./routers/promptSharing.router";
import { collectionsRouter } from "./routers/collections.router";
import { promptImportExportRouter } from "./routers/promptImportExport.router";
import { exportScheduleRouter } from "./routers/exportSchedule.router";
import { importExportHistoryRouter } from "./routers/importExportHistory.router";
import { exportTemplateRouter } from "./routers/exportTemplate.router";
import { exportAnalyticsRouter } from "./routers/exportAnalytics.router";
import { exportSharingRouter } from "./routers/exportSharing.router";

/**
 * Main Application Router
 * Combines all domain-specific routers into a single API
 */
export const appRouter = router({
  // System router (health checks, notifications, etc.)
  system: systemRouter,

  // Authentication router
  auth: router({
    /**
     * Get current user
     */
    me: publicProcedure.query((opts) => opts.ctx.user),

    /**
     * Logout user
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Domain-specific routers
  prompts: promptsRouter,
  aiProviders: aiProvidersRouter,
  evaluations: evaluationsRouter,
  contextPackages: contextPackagesRouter,
  analytics: analyticsRouter,
  playground: playgroundRouter,
  budgets: budgetsRouter,
  testSuites: testSuitesRouter,
  optimization: optimizationRouter,
  apiKeys: apiKeysRouter,
  marketplace: marketplaceRouter,
  comments: commentsRouter,
  activityFeed: activityFeedRouter,
  notifications: notificationsRouter,
  teams: teamsRouter,
  invitations: invitationsRouter,
  workspaceAnalytics: workspaceAnalyticsRouter,
  workspaceBilling: workspaceBillingRouter,
  audit: auditRouter,
  workspacePermissions: workspacePermissionsRouter,
  securityAlerts: securityAlertsRouter,
  auditRetention: auditRetentionRouter,
  twoFactor: twoFactorRouter,
  ipAllowlist: ipAllowlistRouter,
  complianceReport: complianceReportRouter,
  sessions: sessionsRouter,
  passwordPolicy: passwordPolicyRouter,
  securityOnboarding: securityOnboardingRouter,
  loginActivity: loginActivityRouter,
  apiAnalytics: apiAnalyticsRouter,
  dataExport: dataExportRouter,
  webhooks: webhooksRouter,
  scheduledReports: scheduledReportsRouter,
  onboarding: onboardingRouter,
  templates: templatesRouter,
  presence: presenceRouter,
  promptPerformance: promptPerformanceRouter,
  templateRatings: templateRatingsRouter,
  versionDiff: versionDiffRouter,
  promptSharing: promptSharingRouter,
  collections: collectionsRouter,
  promptImportExport: promptImportExportRouter,
  exportSchedules: exportScheduleRouter,
  importExportHistory: importExportHistoryRouter,
  exportTemplates: exportTemplateRouter,
  exportAnalytics: exportAnalyticsRouter,
  exportSharing: exportSharingRouter,
});

export type AppRouter = typeof appRouter;

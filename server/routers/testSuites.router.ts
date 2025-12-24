import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as testSuiteService from "../services/testSuite.service";
import { requirePermission } from "../_core/permissions";

export const testSuitesRouter = router({
  /**
   * Create a new test suite
   */
  create: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        testCases: z.array(
          z.object({
            input: z.record(z.string(), z.string()),
            expectedOutput: z.string().optional(),
            minQuality: z.number().min(0).max(100).optional(),
          })
        ),
        qualityThreshold: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check create permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'CREATE_TEST_SUITES');
      }

      const id = await testSuiteService.createTestSuite({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  /**
   * Get all test suites for current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await testSuiteService.getUserTestSuites(ctx.user.id);
  }),

  /**
   * Get test suite by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await testSuiteService.getTestSuite(input.id);
    }),

  /**
   * Delete test suite
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check delete permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'DELETE_TEST_SUITES');
      }

      await testSuiteService.deleteTestSuite(input.id);
      return { success: true };
    }),

  /**
   * Run a test suite
   */
  run: protectedProcedure
    .input(
      z.object({
        suiteId: z.string(),
        gitCommit: z.string().optional(),
        gitBranch: z.string().optional(),
        providerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check run permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'RUN_TEST_SUITES');
      }

      const runId = await testSuiteService.runTestSuite(input.suiteId, ctx.user.id, {
        gitCommit: input.gitCommit,
        gitBranch: input.gitBranch,
        providerId: input.providerId,
      });
      return { runId };
    }),

  /**
   * Get test run by ID
   */
  getRun: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await testSuiteService.getTestRun(input.id);
    }),

  /**
   * Get all test runs for a suite
   */
  getRunsForSuite: protectedProcedure
    .input(z.object({ suiteId: z.string() }))
    .query(async ({ input }) => {
      return await testSuiteService.getTestRunsForSuite(input.suiteId);
    }),

  /**
   * Get all test runs for current user
   */
  listRuns: protectedProcedure.query(async ({ ctx }) => {
    return await testSuiteService.getUserTestRuns(ctx.user.id);
  }),

  /**
   * Webhook endpoint for CI/CD integration
   */
  ciWebhook: protectedProcedure
    .input(
      z.object({
        suiteId: z.string(),
        gitCommit: z.string(),
        gitBranch: z.string(),
        providerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const runId = await testSuiteService.runTestSuite(input.suiteId, ctx.user.id, {
        gitCommit: input.gitCommit,
        gitBranch: input.gitBranch,
        providerId: input.providerId,
      });
      
      // Wait for test run to complete (with timeout)
      const maxWait = 300000; // 5 minutes
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWait) {
        const run = await testSuiteService.getTestRun(runId);
        if (run && (run.status === "passed" || run.status === "failed" || run.status === "error")) {
          return {
            runId,
            status: run.status,
            passed: run.status === "passed",
            passedTests: run.passedTests,
            failedTests: run.failedTests,
            averageQuality: run.averageQuality,
          };
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      
      throw new Error("Test run timed out");
    }),
});

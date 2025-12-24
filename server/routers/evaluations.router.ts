import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { queueEvaluation, getEvaluationJobStatus, getQueueStats } from "../services/evaluationExecution.service";
import { requirePermission } from "../_core/permissions";

/**
 * Evaluations Router
 * Handles prompt evaluation and comparison across AI providers
 */
export const evaluationsRouter = router({
  /**
   * List evaluations with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        promptId: z.string().optional(),
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Filter evaluations by active workspace
      const evaluations = await db.getUserEvaluations(ctx.user.id);
      // Apply workspace filter if activeTeamId is set
      if (ctx.activeTeamId) {
        return evaluations.filter(e => e.organizationId === ctx.activeTeamId);
      }
      return evaluations;
    }),

  /**
   * Get a single evaluation with results
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const evaluation = await db.getEvaluation(input.id);
      
      if (!evaluation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
      }

      if (evaluation.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Get results for this evaluation
      const results = await db.getEvaluationResults(input.id);

      return {
        ...evaluation,
        results,
      };
    }),

  /**
   * Create a new evaluation
   */
  create: protectedProcedure
    .input(
      z.object({
        promptId: z.string(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        testCases: z.array(
          z.object({
            input: z.record(z.string(), z.string()),
            expectedOutput: z.string().optional(),
          })
        ),
        providerIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check write permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'CREATE_EVALUATIONS');
      }

      // Verify prompt exists and user has access
      const prompt = await db.getPrompt(input.promptId);
      
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to prompt" });
      }

      // Verify all providers exist and user has access
      for (const providerId of input.providerIds) {
        const provider = await db.getAIProvider(providerId);
        if (!provider || provider.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Access denied to provider ${providerId}`,
          });
        }
      }

      // Create evaluation with workspace isolation
      const evaluationId = await db.createEvaluation({
        userId: ctx.user.id,
        promptId: input.promptId,
        name: input.name,
        description: input.description,
        testCases: input.testCases,
        status: "pending",
        organizationId: ctx.activeTeamId || undefined,
      });

      // Queue evaluation for async execution
      const jobId = await queueEvaluation({
        evaluationId,
        promptId: input.promptId,
        promptContent: prompt.content,
        promptVariables: prompt.variables || [],
        testCases: input.testCases,
        providerIds: input.providerIds,
        userId: ctx.user.id,
      });

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        eventType: "evaluation_created",
        eventData: {
          evaluationId,
          promptId: input.promptId,
          testCaseCount: input.testCases.length,
          providerCount: input.providerIds.length,
        },
      });

      return { id: evaluationId, jobId };
    }),

  /**
   * Run an evaluation (execute test cases across providers)
   */
  run: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check run permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'RUN_EVALUATIONS');
      }

      const evaluation = await db.getEvaluation(input.id);
      
      if (!evaluation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
      }

      if (evaluation.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (evaluation.status === "running") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Evaluation is already running",
        });
      }

      // Update status to running
      await db.updateEvaluation(input.id, { status: "running" });

      // TODO: Queue evaluation job to run asynchronously
      // This would:
      // 1. Get prompt template
      // 2. For each test case:
      //    - Substitute variables
      //    - Call each AI provider
      //    - Record results (output, tokens, latency, cost)
      // 3. Update status to completed

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        eventType: "evaluation_run",
        eventData: { evaluationId: input.id },
      });

      return { success: true, message: "Evaluation started" };
    }),

  /**
   * Delete an evaluation
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check delete permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'DELETE_EVALUATIONS');
      }

      const evaluation = await db.getEvaluation(input.id);
      
      if (!evaluation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
      }

      if (evaluation.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // TODO: Implement deleteEvaluation in db.ts
      // await db.deleteEvaluation(input.id);

      return { success: true };
    }),

  /**
   * Get results for an evaluation
   */
  getResults: protectedProcedure
    .input(z.object({ evaluationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const evaluation = await db.getEvaluation(input.evaluationId);
      
      if (!evaluation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
      }

      if (evaluation.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const results = await db.getEvaluationResults(input.evaluationId);
      return results;
    }),
});

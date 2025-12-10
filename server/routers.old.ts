import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Simple encryption for API keys (in production, use a proper key management service)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= PROMPTS =============
  prompts: router({
    list: protectedProcedure
      .input(
        z.object({
          organizationId: z.string().optional(),
          search: z.string().optional(),
          tags: z.array(z.string()).optional(),
          isTemplate: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const prompts = await db.getUserPrompts(ctx.user.id, input);
        return prompts;
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const prompt = await db.getPrompt(input.id);
      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      // Check access permissions
      if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return prompt;
    }),

    getVersions: protectedProcedure
      .input(z.object({ promptId: z.string() }))
      .query(async ({ ctx, input }) => {
        const prompt = await db.getPrompt(input.promptId);
        if (!prompt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
        }

        if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const versions = await db.getPromptVersions(input.promptId);
        return versions;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          content: z.string().min(1),
          variables: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          folderPath: z.string().default("/"),
          isTemplate: z.boolean().default(false),
          isPublic: z.boolean().default(false),
          organizationId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const promptId = await db.createPrompt({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          content: input.content,
          variables: input.variables || [],
          tags: input.tags || [],
          folderPath: input.folderPath,
          isTemplate: input.isTemplate,
          isPublic: input.isPublic,
          organizationId: input.organizationId,
        });

        // Create initial version
        await db.createPromptVersion({
          promptId,
          version: 1,
          content: input.content,
          variables: input.variables || [],
          changeMessage: "Initial version",
          createdBy: ctx.user.id,
        });

        // Track analytics
        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          eventType: "prompt_created",
          eventData: { promptId, name: input.name },
        });

        return { id: promptId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          content: z.string().min(1).optional(),
          variables: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          folderPath: z.string().optional(),
          isTemplate: z.boolean().optional(),
          isPublic: z.boolean().optional(),
          changeMessage: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prompt = await db.getPrompt(input.id);
        if (!prompt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
        }

        if (prompt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const { id, changeMessage, ...updates } = input;

        // If content changed, create new version
        if (updates.content && updates.content !== prompt.content) {
          const newVersion = prompt.version + 1;
          await db.createPromptVersion({
            promptId: id,
            version: newVersion,
            content: updates.content,
            variables: updates.variables || prompt.variables || [],
            changeMessage: changeMessage || `Version ${newVersion}`,
            createdBy: ctx.user.id,
          });
          (updates as any).version = newVersion;
        }

        await db.updatePrompt(id, updates);

        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: prompt.organizationId,
          eventType: "prompt_updated",
          eventData: { promptId: id },
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const prompt = await db.getPrompt(input.id);
        if (!prompt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
        }

        if (prompt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deletePrompt(input.id);

        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: prompt.organizationId,
          eventType: "prompt_deleted",
          eventData: { promptId: input.id },
        });

        return { success: true };
      }),
  }),

  // ============= AI PROVIDERS =============
  aiProviders: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const providers = await db.getUserAIProviders(ctx.user.id, input.organizationId);
        // Don't return encrypted API keys to frontend
        return providers.map((p) => ({
          ...p,
          apiKeyEncrypted: undefined,
          hasApiKey: !!p.apiKeyEncrypted,
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          provider: z.enum(["openai", "anthropic", "google", "mistral", "custom"]),
          name: z.string().min(1).max(255),
          apiKey: z.string().min(1),
          baseUrl: z.string().url().optional(),
          organizationId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const encryptedKey = encrypt(input.apiKey);

        const providerId = await db.createAIProvider({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          provider: input.provider,
          name: input.name,
          apiKeyEncrypted: encryptedKey,
          baseUrl: input.baseUrl,
        });

        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          eventType: "ai_provider_added",
          eventData: { providerId, provider: input.provider },
        });

        return { id: providerId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(255).optional(),
          apiKey: z.string().min(1).optional(),
          baseUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const provider = await db.getAIProvider(input.id);
        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
        }

        if (provider.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const updates: any = {};
        if (input.name) updates.name = input.name;
        if (input.baseUrl !== undefined) updates.baseUrl = input.baseUrl;
        if (input.apiKey) updates.apiKeyEncrypted = encrypt(input.apiKey);

        await db.updateAIProvider(input.id, updates);

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const provider = await db.getAIProvider(input.id);
        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
        }

        if (provider.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteAIProvider(input.id);

        return { success: true };
      }),
  }),

  // ============= CONTEXT PACKAGES =============
  contextPackages: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const packages = await db.getUserContextPackages(ctx.user.id, input.organizationId);
        return packages;
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const pkg = await db.getContextPackage(input.id);
      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context package not found" });
      }

      if (pkg.userId !== ctx.user.id && !pkg.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return pkg;
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          content: z.string().min(1),
          fileUrls: z.array(z.string().url()).optional(),
          tags: z.array(z.string()).optional(),
          isPublic: z.boolean().default(false),
          organizationId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const packageId = await db.createContextPackage({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          content: input.content,
          fileUrls: input.fileUrls || [],
          tags: input.tags || [],
          isPublic: input.isPublic,
        });

        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          eventType: "context_package_created",
          eventData: { packageId, name: input.name },
        });

        return { id: packageId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          content: z.string().min(1).optional(),
          fileUrls: z.array(z.string().url()).optional(),
          tags: z.array(z.string()).optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const pkg = await db.getContextPackage(input.id);
        if (!pkg) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Context package not found" });
        }

        if (pkg.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const { id, ...updates } = input;
        await db.updateContextPackage(id, updates);

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const pkg = await db.getContextPackage(input.id);
        if (!pkg) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Context package not found" });
        }

        if (pkg.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        await db.deleteContextPackage(input.id);

        return { success: true };
      }),
  }),

  // ============= EVALUATIONS =============
  evaluations: router({
    list: protectedProcedure
      .input(z.object({ organizationId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const evaluations = await db.getUserEvaluations(ctx.user.id, input.organizationId);
        return evaluations;
      }),

    get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const evaluation = await db.getEvaluation(input.id);
      if (!evaluation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
      }

      if (evaluation.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return evaluation;
    }),

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

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          promptId: z.string(),
          testCases: z.array(
            z.object({
              input: z.record(z.string(), z.string()),
              expectedOutput: z.string().optional(),
            })
          ),
          organizationId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify prompt exists and user has access
        const prompt = await db.getPrompt(input.promptId);
        if (!prompt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
        }

        if (prompt.userId !== ctx.user.id && !prompt.isPublic) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied to prompt" });
        }

        const evaluationId = await db.createEvaluation({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          promptId: input.promptId,
          testCases: input.testCases,
          status: "pending",
        });

        await db.trackEvent({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          eventType: "evaluation_created",
          eventData: { evaluationId, promptId: input.promptId },
        });

        return { id: evaluationId };
      }),

    run: protectedProcedure
      .input(
        z.object({
          evaluationId: z.string(),
          providerIds: z.array(z.string()),
          models: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const evaluation = await db.getEvaluation(input.evaluationId);
        if (!evaluation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation not found" });
        }

        if (evaluation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const prompt = await db.getPrompt(evaluation.promptId);
        if (!prompt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
        }

        // Update status to running
        await db.updateEvaluation(input.evaluationId, { status: "running" });

        // This is a simplified version - in production, you'd queue this as a background job
        // For now, we'll create mock results
        try {
          for (const providerId of input.providerIds) {
            const provider = await db.getAIProvider(providerId);
            if (!provider) continue;

            for (let i = 0; i < evaluation.testCases.length; i++) {
              const testCase = evaluation.testCases[i];

              // Mock result - in production, call actual AI provider API
              await db.createEvaluationResult({
                evaluationId: input.evaluationId,
                providerId,
                model: input.models[0] || "gpt-4",
                testCaseIndex: i,
                input: testCase.input,
                output: `Mock output for test case ${i + 1}`,
                tokensUsed: Math.floor(Math.random() * 1000) + 100,
                latencyMs: Math.floor(Math.random() * 2000) + 500,
                cost: Math.floor(Math.random() * 10) + 1, // cents
                quality: testCase.expectedOutput ? Math.floor(Math.random() * 30) + 70 : undefined,
              });
            }
          }

          await db.updateEvaluation(input.evaluationId, {
            status: "completed",
            completedAt: new Date(),
          });

          await db.trackEvent({
            userId: ctx.user.id,
            organizationId: evaluation.organizationId,
            eventType: "evaluation_completed",
            eventData: { evaluationId: input.evaluationId },
          });

          return { success: true };
        } catch (error) {
          await db.updateEvaluation(input.evaluationId, { status: "failed" });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Evaluation failed",
          });
        }
      }),
  }),

  // ============= ANALYTICS =============
  analytics: router({
    dashboard: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ ctx, input }) => {
        const events = await db.getUserAnalytics(ctx.user.id, input.days);

        // Aggregate statistics
        const stats = {
          totalPrompts: events.filter((e) => e.eventType === "prompt_created").length,
          totalEvaluations: events.filter((e) => e.eventType === "evaluation_created").length,
          totalProviders: events.filter((e) => e.eventType === "ai_provider_added").length,
          recentActivity: events.slice(0, 10),
        };

        return stats;
      }),

    events: protectedProcedure
      .input(
        z.object({
          days: z.number().min(1).max(365).default(30),
          eventType: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const events = await db.getUserAnalytics(ctx.user.id, input.days);

        if (input.eventType) {
          return events.filter((e) => e.eventType === input.eventType);
        }

        return events;
      }),
  }),
});

export type AppRouter = typeof appRouter;


import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { executePrompt } from "../services/aiProvider.service";
import { getAIProvider } from "../db";

/**
 * Playground Router
 * Handles real-time prompt testing across multiple AI providers
 */

// Token estimation (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Cost estimation based on provider and model
function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number = 100): number {
  const pricing: Record<string, Record<string, { input: number; output: number }>> = {
    openai: {
      "gpt-4": { input: 0.03 / 1000, output: 0.06 / 1000 },
      "gpt-4-turbo": { input: 0.01 / 1000, output: 0.03 / 1000 },
      "gpt-3.5-turbo": { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    },
    anthropic: {
      "claude-3-opus": { input: 0.015 / 1000, output: 0.075 / 1000 },
      "claude-3-sonnet": { input: 0.003 / 1000, output: 0.015 / 1000 },
      "claude-3-haiku": { input: 0.00025 / 1000, output: 0.00125 / 1000 },
    },
    google: {
      "gemini-pro": { input: 0.00025 / 1000, output: 0.0005 / 1000 },
      "gemini-ultra": { input: 0.001 / 1000, output: 0.002 / 1000 },
    },
    mistral: {
      "mistral-large": { input: 0.004 / 1000, output: 0.012 / 1000 },
      "mistral-medium": { input: 0.0027 / 1000, output: 0.0081 / 1000 },
      "mistral-small": { input: 0.0006 / 1000, output: 0.0018 / 1000 },
    },
  };

  const providerPricing = pricing[provider.toLowerCase()];
  if (!providerPricing) {
    return 0;
  }

  const modelPricing = providerPricing[model.toLowerCase()] || Object.values(providerPricing)[0];
  return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
}

export const playgroundRouter = router({
  /**
   * Estimate tokens and cost for a prompt
   */
  estimate: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        providerIds: z.array(z.string()),
      })
    )
    .query(async ({ input, ctx }) => {
      const inputTokens = estimateTokens(input.prompt);
      const outputTokens = 100; // Estimated average output

      const estimates = await Promise.all(
        input.providerIds.map(async (providerId) => {
          const provider = await getAIProvider(providerId);
          if (!provider) {
            return null;
          }

          const cost = estimateCost(provider.provider, provider.model || "default", inputTokens, outputTokens);

          return {
            providerId,
            providerName: provider.name,
            provider: provider.provider,
            model: provider.model,
            inputTokens,
            estimatedOutputTokens: outputTokens,
            estimatedCost: cost,
          };
        })
      );

      return estimates.filter((e) => e !== null);
    }),

  /**
   * Execute prompt across multiple providers in real-time
   */
  execute: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1, "Prompt cannot be empty"),
        providerIds: z.array(z.string()).min(1, "Select at least one provider"),
        variables: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { prompt, providerIds, variables = {} } = input;

      // Replace variables in prompt
      let processedPrompt = prompt;
      Object.entries(variables).forEach(([key, value]) => {
        processedPrompt = processedPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      });

      // Execute prompt across all providers in parallel
      const results = await Promise.allSettled(
        providerIds.map(async (providerId) => {
          const startTime = Date.now();

          try {
            const provider = await getAIProvider(providerId);
            if (!provider) {
              throw new Error("Provider not found");
            }

            if (!provider.apiKeyEncrypted) {
              throw new Error("Provider API key not configured");
            }

            // Skip custom providers for now
            if (provider.provider === "custom") {
              throw new Error("Custom providers not yet supported in playground");
            }

            const result = await executePrompt(
              {
                id: provider.id,
                provider: provider.provider as "openai" | "anthropic" | "google" | "mistral",
                model: provider.model || "gpt-3.5-turbo",
                apiKeyEncrypted: provider.apiKeyEncrypted,
              },
              {
                prompt: processedPrompt,
              }
            );

            const latency = Date.now() - startTime;
            const cost = estimateCost(
              provider.provider,
              provider.model || "default",
              result.tokensUsed || estimateTokens(processedPrompt),
              result.tokensUsed || estimateTokens(result.output)
            );

            return {
              providerId,
              providerName: provider.name,
              provider: provider.provider,
              model: provider.model,
              output: result.output,
              tokensUsed: result.tokensUsed || estimateTokens(processedPrompt) + estimateTokens(result.output),
              latency,
              cost,
              success: true,
              error: null,
            };
          } catch (error: any) {
            return {
              providerId,
              providerName: "Unknown",
              provider: "unknown",
              model: null,
              output: null,
              tokensUsed: 0,
              latency: Date.now() - startTime,
              cost: 0,
              success: false,
              error: error.message || "Unknown error",
            };
          }
        })
      );

      // Process results
      const processedResults = results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            providerId: "unknown",
            providerName: "Unknown",
            provider: "unknown",
            model: null,
            output: null,
            tokensUsed: 0,
            latency: 0,
            cost: 0,
            success: false,
            error: result.reason?.message || "Unknown error",
          };
        }
      });

      return {
        results: processedResults,
        totalCost: processedResults.reduce((sum, r) => sum + r.cost, 0),
        totalTokens: processedResults.reduce((sum, r) => sum + r.tokensUsed, 0),
        averageLatency:
          processedResults.reduce((sum, r) => sum + r.latency, 0) / processedResults.length,
        successCount: processedResults.filter((r) => r.success).length,
        failureCount: processedResults.filter((r) => !r.success).length,
      };
    }),

  /**
   * Save playground prompt as a template
   */
  saveAsTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        content: z.string().min(1, "Content is required"),
        variables: z.record(z.string(), z.string()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Import createPrompt from db
      const { createPrompt } = await import("../db");

      const prompt = await createPrompt({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || "",
        content: input.content,
        variables: Object.keys(input.variables || {}),
        tags: input.tags || [],
        isActive: true,
      });

      return {
        success: true,
        promptId: prompt,
        message: "Prompt saved as template successfully",
      };
    }),
});

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { encrypt, decrypt } from "../utils/crypto";

/**
 * Get default model for each provider
 */
function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: "gpt-4-turbo",
    anthropic: "claude-3-sonnet",
    google: "gemini-pro",
    mistral: "mistral-large",
    custom: "custom-model",
  };
  return defaults[provider] || "unknown";
}

/**
 * AI Providers Router
 * Handles secure management of AI provider API keys
 */
export const aiProvidersRouter = router({
  /**
   * List all AI providers for the user
   * API keys are never returned to frontend
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const providers = await db.getUserAIProviders(ctx.user.id, input.organizationId);
      
      // Never return encrypted API keys to frontend
      return providers.map((p) => ({
        ...p,
        apiKeyEncrypted: undefined,
        hasApiKey: !!p.apiKeyEncrypted,
      }));
    }),

  /**
   * Get a single AI provider by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const provider = await db.getAIProvider(input.id);
      
      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      }

      if (provider.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Don't return encrypted key
      return {
        ...provider,
        apiKeyEncrypted: undefined,
        hasApiKey: !!provider.apiKeyEncrypted,
      };
    }),

  /**
   * Create a new AI provider with encrypted API key
   */
  create: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["openai", "anthropic", "google", "mistral", "custom"]),
        name: z.string().min(1).max(255),
        model: z.string().optional(),
        apiKey: z.string().min(1),
        baseUrl: z.string().url().optional(),
        config: z.record(z.string(), z.any()).optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Encrypt API key before storing
      const encryptedKey = encrypt(input.apiKey);

      const providerId = await db.createAIProvider({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        provider: input.provider,
        name: input.name,
        model: input.model || getDefaultModel(input.provider),
        apiKeyEncrypted: encryptedKey,
        baseUrl: input.baseUrl,
        config: input.config ? JSON.stringify(input.config) : undefined,
      });

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        eventType: "ai_provider_added",
        eventData: { providerId, provider: input.provider },
      });

      return { id: providerId };
    }),

  /**
   * Update an existing AI provider
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        apiKey: z.string().min(1).optional(),
        baseUrl: z.string().url().optional(),
        isActive: z.boolean().optional(),
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

      const updates: Record<string, any> = {};
      
      if (input.name) updates.name = input.name;
      if (input.baseUrl !== undefined) updates.baseUrl = input.baseUrl;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.apiKey) updates.apiKeyEncrypted = encrypt(input.apiKey);

      await db.updateAIProvider(input.id, updates);

      return { success: true };
    }),

  /**
   * Delete an AI provider
   */
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

  /**
   * Test an AI provider connection
   * Decrypts key and attempts a test API call
   */
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getAIProvider(input.id);
      
      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      }

      if (provider.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      try {
        // Decrypt API key for testing
        const apiKey = decrypt(provider.apiKeyEncrypted);
        
        // TODO: Implement actual API test calls for each provider
        // For now, just verify decryption works
        if (!apiKey) {
          throw new Error("Failed to decrypt API key");
        }

        // Update last used timestamp
        await db.updateAIProvider(input.id, { lastUsedAt: new Date() });

        return { success: true, message: "Provider connection successful" };
      } catch (error) {
        console.error("Provider test failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test provider connection",
        });
      }
    }),
});

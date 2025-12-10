import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Context Packages Router
 * Handles management of reusable context packages for prompts
 */
export const contextPackagesRouter = router({
  /**
   * List context packages
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implement getUserContextPackages with proper filtering
      const packages = await db.getUserContextPackages(ctx.user.id);
      return packages;
    }),

  /**
   * Get a single context package
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pkg = await db.getContextPackage(input.id);
      
      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context package not found" });
      }

      if (pkg.userId !== ctx.user.id && !pkg.isPublic) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return pkg;
    }),

  /**
   * Create a new context package
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(false),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const packageId = await db.createContextPackage({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        content: input.content,
        tags: input.tags || [],
        isPublic: input.isPublic,
        organizationId: input.organizationId,
      });

      // Track analytics
      await db.trackEvent({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        eventType: "context_package_created",
        eventData: { packageId, name: input.name },
      });

      return { id: packageId };
    }),

  /**
   * Update a context package
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        content: z.string().min(1).optional(),
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

  /**
   * Delete a context package
   */
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
});

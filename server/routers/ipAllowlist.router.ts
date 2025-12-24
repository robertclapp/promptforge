import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as ipAllowlistService from "../services/ipAllowlist.service";
import { requirePermission } from "../_core/permissions";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const ipAllowlistRouter = router({
  /**
   * Get IP allowlist settings
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    return ipAllowlistService.getIpAllowlistSettings(ctx.activeTeamId);
  }),

  /**
   * Update IP allowlist settings
   */
  updateSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      enforceForApi: z.boolean().optional(),
      enforceForWeb: z.boolean().optional(),
      ownersBypass: z.boolean().optional(),
      violationAction: z.enum(["block", "log"]).optional(),
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

      const oldSettings = await ipAllowlistService.getIpAllowlistSettings(ctx.activeTeamId);
      const newSettings = await ipAllowlistService.updateIpAllowlistSettings(ctx.activeTeamId, input);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "ip_allowlist_settings",
        resourceId: ctx.activeTeamId,
        resourceName: "IP Allowlist Settings",
        status: "success",
        previousValue: { ...oldSettings } as Record<string, unknown>,
        newValue: { ...newSettings } as Record<string, unknown>,
      });

      return newSettings;
    }),

  /**
   * Get all IP allowlist entries
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "VIEW_BILLING");
    }

    if (!ctx.activeTeamId) {
      return [];
    }

    return ipAllowlistService.getIpAllowlistEntries(ctx.activeTeamId);
  }),

  /**
   * Add an IP address to the allowlist
   */
  add: protectedProcedure
    .input(z.object({
      ipAddress: z.string().min(1),
      description: z.string().optional(),
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

      const result = await ipAllowlistService.addIpAllowlistEntry(ctx.activeTeamId, {
        ipAddress: input.ipAddress,
        description: input.description,
        createdBy: ctx.user.id,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to add IP address",
        });
      }

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "ip_allowlist",
        resourceId: result.id,
        resourceName: input.ipAddress,
        status: "success",
        details: { action: "add", ipAddress: input.ipAddress },
      });

      return { id: result.id, success: true };
    }),

  /**
   * Update an IP allowlist entry
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
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

      await ipAllowlistService.updateIpAllowlistEntry(ctx.activeTeamId, input.id, {
        description: input.description,
        enabled: input.enabled,
      });

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "ip_allowlist",
        resourceId: input.id,
        resourceName: "IP Allowlist Entry",
        status: "success",
        details: { action: "update" },
      });

      return { success: true };
    }),

  /**
   * Remove an IP address from the allowlist
   */
  remove: protectedProcedure
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

      await ipAllowlistService.removeIpAllowlistEntry(ctx.activeTeamId, input.id);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "ip_allowlist",
        resourceId: input.id,
        resourceName: "IP Allowlist Entry",
        status: "success",
        details: { action: "remove" },
      });

      return { success: true };
    }),

  /**
   * Validate an IP address or CIDR
   */
  validate: protectedProcedure
    .input(z.object({
      ipAddress: z.string(),
    }))
    .query(({ input }) => {
      const result = ipAllowlistService.validateIpOrCidr(input.ipAddress);
      return result;
    }),

  /**
   * Check if current IP is allowed (for testing)
   */
  checkCurrentIp: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      return { allowed: true, ip: "unknown" };
    }

    // In a real implementation, you'd get the IP from the request
    // For now, return a placeholder
    return { 
      allowed: true, 
      ip: "Current IP check requires request context" 
    };
  }),
});

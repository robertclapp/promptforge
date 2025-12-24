import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as workspacePermissionsService from "../services/workspacePermissions.service";
import { requirePermission, type Permission } from "../_core/permissions";
import { TRPCError } from "@trpc/server";
import { logResourceOperation } from "../services/audit.service";

export const workspacePermissionsRouter = router({
  /**
   * Get all permission overrides for the current workspace
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Only owners can view permission settings
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    return workspacePermissionsService.getWorkspacePermissionOverrides(ctx.activeTeamId);
  }),

  /**
   * Get all available permissions with their default roles
   */
  getAvailablePermissions: protectedProcedure.query(async () => {
    return workspacePermissionsService.getAllPermissions();
  }),

  /**
   * Get effective permissions for a role in the current workspace
   */
  getEffectivePermissions: protectedProcedure
    .input(z.object({
      role: z.enum(["viewer", "member", "admin", "owner"]),
    }))
    .query(async ({ ctx, input }) => {
      // Only owners can view permission settings
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      return workspacePermissionsService.getEffectivePermissions(ctx.activeTeamId, input.role);
    }),

  /**
   * Set a permission override for a role
   */
  setOverride: protectedProcedure
    .input(z.object({
      role: z.enum(["viewer", "member", "admin"]),
      permission: z.string(),
      granted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can modify permission settings
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      // Validate the override is allowed
      const validation = workspacePermissionsService.isOverrideAllowed(
        input.role,
        input.permission as Permission,
        input.granted
      );

      if (!validation.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: validation.reason || "This permission override is not allowed",
        });
      }

      const result = await workspacePermissionsService.setPermissionOverride(
        ctx.activeTeamId,
        input.role,
        input.permission,
        input.granted,
        ctx.user.id
      );

      // Log the permission change
      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "permission_override",
        resourceId: result.id,
        resourceName: `${input.role}:${input.permission}`,
        status: "success",
        previousValue: { granted: !input.granted },
        newValue: { granted: input.granted },
        details: {
          role: input.role,
          permission: input.permission,
          granted: input.granted,
        },
      });

      return result;
    }),

  /**
   * Remove a permission override (revert to default)
   */
  removeOverride: protectedProcedure
    .input(z.object({
      role: z.enum(["viewer", "member", "admin"]),
      permission: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only owners can modify permission settings
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await workspacePermissionsService.removePermissionOverride(
        ctx.activeTeamId,
        input.role,
        input.permission
      );

      // Log the permission change
      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "permission_override",
        resourceId: `${input.role}:${input.permission}`,
        resourceName: `${input.role}:${input.permission}`,
        status: "success",
        details: {
          role: input.role,
          permission: input.permission,
          action: "reverted_to_default",
        },
      });

      return { success: true };
    }),

  /**
   * Reset all permission overrides for the workspace
   */
  resetAll: protectedProcedure.mutation(async ({ ctx }) => {
    // Only owners can modify permission settings
    if (ctx.activeTeamId) {
      await requirePermission(ctx.user.id, ctx.activeTeamId, "MANAGE_BILLING");
    }

    if (!ctx.activeTeamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No workspace selected",
      });
    }

    await workspacePermissionsService.clearWorkspacePermissionOverrides(ctx.activeTeamId);

    // Log the permission reset
    await logResourceOperation({
      userId: ctx.user.id,
      userName: ctx.user.name || undefined,
      userEmail: ctx.user.email || undefined,
      organizationId: ctx.activeTeamId,
      eventType: "settings_changed",
      resourceType: "permission_overrides",
      resourceId: ctx.activeTeamId,
      resourceName: "all_permissions",
      status: "success",
      details: {
        action: "reset_all_to_defaults",
      },
    });

    return { success: true };
  }),
});

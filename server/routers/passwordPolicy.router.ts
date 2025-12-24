import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as passwordPolicyService from "../services/passwordPolicy.service";
import { requirePermission } from "../_core/permissions";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const passwordPolicyRouter = router({
  /**
   * Get password policy for current workspace
   */
  get: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.activeTeamId) {
        return passwordPolicyService.getPasswordPolicy("");
      }

      const policy = await passwordPolicyService.getPasswordPolicy(ctx.activeTeamId);
      const requirements = passwordPolicyService.getPasswordRequirements(policy);

      return { policy, requirements };
    }),

  /**
   * Update password policy
   */
  update: protectedProcedure
    .input(z.object({
      minLength: z.number().min(6).max(128).optional(),
      maxLength: z.number().min(8).max(256).optional(),
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
      expirationDays: z.number().min(0).max(365).optional(),
      warningDays: z.number().min(1).max(30).optional(),
      historyCount: z.number().min(0).max(24).optional(),
      maxFailedAttempts: z.number().min(3).max(10).optional(),
      lockoutDurationMinutes: z.number().min(5).max(60).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "INVITE_MEMBERS");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      // Validate min/max length relationship
      if (input.minLength && input.maxLength && input.minLength > input.maxLength) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum length cannot be greater than maximum length",
        });
      }

      const policy = await passwordPolicyService.updatePasswordPolicy(
        ctx.activeTeamId,
        input
      );

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "password_policy",
        resourceId: ctx.activeTeamId,
        resourceName: "Password Policy",
        status: "success",
        details: { action: "update", changes: input },
      });

      return { policy };
    }),

  /**
   * Validate a password against the policy
   */
  validate: protectedProcedure
    .input(z.object({
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const policy = await passwordPolicyService.getPasswordPolicy(
        ctx.activeTeamId || ""
      );

      const result = passwordPolicyService.validatePassword(input.password, policy);

      // Check password history if policy requires it
      if (result.valid && policy.historyCount > 0) {
        const inHistory = await passwordPolicyService.isPasswordInHistory(
          ctx.user.id,
          input.password,
          policy.historyCount
        );

        if (inHistory) {
          result.valid = false;
          result.errors.push(
            `Password was used recently. Please choose a different password.`
          );
        }
      }

      return result;
    }),

  /**
   * Calculate password strength (for UI feedback)
   */
  strength: protectedProcedure
    .input(z.object({
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      return passwordPolicyService.calculatePasswordStrength(input.password);
    }),
});

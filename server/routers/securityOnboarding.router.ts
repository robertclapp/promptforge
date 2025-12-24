import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as onboardingService from "../services/securityOnboarding.service";
import { requirePermission } from "../_core/permissions";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const securityOnboardingRouter = router({
  /**
   * Get onboarding progress for current workspace
   */
  getProgress: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.activeTeamId) {
        return null;
      }

      return onboardingService.getOnboardingProgress(
        ctx.activeTeamId,
        ctx.user.id
      );
    }),

  /**
   * Mark a step as completed
   */
  markStepCompleted: protectedProcedure
    .input(z.object({
      stepId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await onboardingService.markStepCompleted(ctx.activeTeamId, input.stepId);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "security_onboarding",
        resourceId: input.stepId,
        resourceName: `Onboarding Step: ${input.stepId}`,
        status: "success",
        details: { action: "complete_step" },
      });

      return { success: true };
    }),

  /**
   * Dismiss the onboarding checklist
   */
  dismiss: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "INVITE_MEMBERS");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await onboardingService.dismissOnboarding(ctx.activeTeamId);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId,
        eventType: "settings_changed",
        resourceType: "security_onboarding",
        resourceId: ctx.activeTeamId,
        resourceName: "Security Onboarding",
        status: "success",
        details: { action: "dismiss" },
      });

      return { success: true };
    }),

  /**
   * Reset the onboarding checklist (show it again)
   */
  reset: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, "INVITE_MEMBERS");
      }

      if (!ctx.activeTeamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workspace selected",
        });
      }

      await onboardingService.resetOnboarding(ctx.activeTeamId);

      return { success: true };
    }),
});

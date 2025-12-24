import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOrCreateOnboarding,
  updateOnboardingStep,
  dismissWizard,
  resetOnboarding,
  syncOnboardingWithData
} from "../services/onboarding.service";

export const onboardingRouter = router({
  // Get current onboarding progress
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreateOnboarding(ctx.user.id);
  }),

  // Sync onboarding with actual user data
  syncProgress: protectedProcedure.mutation(async ({ ctx }) => {
    return syncOnboardingWithData(ctx.user.id);
  }),

  // Mark a step as completed
  completeStep: protectedProcedure
    .input(z.object({
      stepId: z.string(),
      completed: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      return updateOnboardingStep(ctx.user.id, input.stepId, input.completed);
    }),

  // Dismiss the wizard
  dismissWizard: protectedProcedure.mutation(async ({ ctx }) => {
    await dismissWizard(ctx.user.id);
    return { success: true };
  }),

  // Reset onboarding (for testing/demo)
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    return resetOnboarding(ctx.user.id);
  })
});

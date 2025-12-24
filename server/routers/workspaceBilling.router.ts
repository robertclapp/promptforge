import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as billingService from "../services/workspaceBilling.service";

export const workspaceBillingRouter = router({
  /**
   * Get current workspace subscription
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return billingService.getWorkspaceSubscription(ctx.activeTeamId);
  }),

  /**
   * Get current workspace usage
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return billingService.getWorkspaceUsage(ctx.activeTeamId);
  }),

  /**
   * Check usage limits
   */
  checkLimits: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.activeTeamId) {
      throw new Error("No active workspace selected");
    }
    return billingService.checkUsageLimits(ctx.activeTeamId);
  }),

  /**
   * Get subscription plans
   */
  getPlans: protectedProcedure.query(async () => {
    return billingService.getSubscriptionPlans();
  }),

  /**
   * Create Stripe checkout session
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["pro", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.activeTeamId) {
        throw new Error("No active workspace selected");
      }
      if (!ctx.user?.email) {
        throw new Error("User email not found");
      }

      const session = await billingService.createCheckoutSession(
        ctx.activeTeamId,
        input.tier,
        ctx.user.id,
        ctx.user.email
      );

      return { url: session.url };
    }),
});

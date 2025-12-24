import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createBudget,
  getUserBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  trackSpending,
} from "../services/budget.service";
import { requirePermission } from "../_core/permissions";

/**
 * Budgets Router
 * Manages cost budgets and spending alerts
 */
export const budgetsRouter = router({
  /**
   * Create a new budget
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Budget name is required"),
        amount: z.number().min(1, "Budget amount must be greater than 0"), // In cents
        period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
        startDate: z.date(),
        endDate: z.date().optional(),
        providers: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check create permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'CREATE_BUDGETS');
      }

      const budget = await createBudget({
        ...input,
        userId: ctx.user.id,
        organizationId: ctx.activeTeamId || null,
        isActive: true,
        currentSpend: 0,
        lastResetAt: new Date(),
      });

      return budget;
    }),

  /**
   * Get user's budgets
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const budgets = await getUserBudgets(ctx.user.id);
    // Filter by active workspace
    if (ctx.activeTeamId) {
      return budgets.filter(b => b.organizationId === ctx.activeTeamId);
    }
    return budgets;
  }),

  /**
   * Get budget by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const budget = await getBudgetById(input.id);
      if (!budget) {
        throw new Error("Budget not found");
      }
      return budget;
    }),

  /**
   * Update budget
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        amount: z.number().optional(),
        period: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        providers: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check edit permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'EDIT_BUDGETS');
      }

      const { id, ...data } = input;
      const budget = await updateBudget(id, data);
      if (!budget) {
        throw new Error("Budget not found");
      }
      return budget;
    }),

  /**
   * Delete budget
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check delete permission
      if (ctx.activeTeamId) {
        await requirePermission(ctx.user.id, ctx.activeTeamId, 'DELETE_BUDGETS');
      }

      const success = await deleteBudget(input.id);
      if (!success) {
        throw new Error("Failed to delete budget");
      }
      return { success: true };
    }),

  /**
   * Get budget summary
   */
  summary: protectedProcedure.query(async ({ ctx }) => {
    const budgets = await getUserBudgets(ctx.user.id);

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpend = budgets.reduce((sum, b) => sum + b.currentSpend, 0);
    const percentageUsed = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    // Count triggered alerts
    const triggeredAlerts = budgets.reduce((count, b) => {
      return count + b.alerts.filter((a) => a.isTriggered).length;
    }, 0);

    // Find budgets at risk (>75% used)
    const budgetsAtRisk = budgets.filter((b) => b.percentageUsed >= 75);

    return {
      totalBudget,
      totalSpend,
      percentageUsed,
      activeBudgets: budgets.length,
      triggeredAlerts,
      budgetsAtRisk: budgetsAtRisk.length,
    };
  }),
});

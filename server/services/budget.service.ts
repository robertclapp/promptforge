import { eq, and, gte, lte, sql } from "drizzle-orm";
import { budgets, budgetAlerts, type Budget, type InsertBudget, type BudgetAlert } from "../../drizzle/schema";
import { getDb } from "../db";
import { nanoid } from "nanoid";

/**
 * Budget Service
 * Manages user budgets, tracks spending, and triggers alerts
 */

export interface BudgetWithAlerts extends Budget {
  alerts: BudgetAlert[];
  percentageUsed: number;
  remainingAmount: number;
}

/**
 * Create a new budget
 */
export async function createBudget(data: Omit<InsertBudget, "id" | "createdAt" | "updatedAt">): Promise<Budget> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const budgetId = nanoid();
  const budget: InsertBudget = {
    ...data,
    id: budgetId,
  };

  await db.insert(budgets).values(budget);

  // Create default alert thresholds (50%, 75%, 90%, 100%)
  const alertThresholds = [50, 75, 90, 100];
  const alertsToCreate = alertThresholds.map((threshold) => ({
    id: nanoid(),
    budgetId,
    threshold,
  }));

  await db.insert(budgetAlerts).values(alertsToCreate);

  const result = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
  return result[0];
}

/**
 * Get user's budgets with alerts
 */
export async function getUserBudgets(userId: string): Promise<BudgetWithAlerts[]> {
  const db = await getDb();
  if (!db) return [];

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.isActive, true)));

  const budgetsWithAlerts: BudgetWithAlerts[] = [];

  for (const budget of userBudgets) {
    const alerts = await db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.budgetId, budget.id));

    const percentageUsed = budget.amount > 0 ? (budget.currentSpend / budget.amount) * 100 : 0;
    const remainingAmount = budget.amount - budget.currentSpend;

    budgetsWithAlerts.push({
      ...budget,
      alerts,
      percentageUsed,
      remainingAmount,
    });
  }

  return budgetsWithAlerts;
}

/**
 * Get a specific budget by ID
 */
export async function getBudgetById(budgetId: string): Promise<BudgetWithAlerts | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
  if (result.length === 0) return null;

  const budget = result[0];
  const alerts = await db.select().from(budgetAlerts).where(eq(budgetAlerts.budgetId, budgetId));

  const percentageUsed = budget.amount > 0 ? (budget.currentSpend / budget.amount) * 100 : 0;
  const remainingAmount = budget.amount - budget.currentSpend;

  return {
    ...budget,
    alerts,
    percentageUsed,
    remainingAmount,
  };
}

/**
 * Update budget
 */
export async function updateBudget(
  budgetId: string,
  data: Partial<Omit<InsertBudget, "id" | "createdAt">>
): Promise<Budget | null> {
  const db = await getDb();
  if (!db) return null;

  await db.update(budgets).set(data).where(eq(budgets.id, budgetId));

  const result = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Delete budget
 */
export async function deleteBudget(budgetId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Delete associated alerts first
  await db.delete(budgetAlerts).where(eq(budgetAlerts.budgetId, budgetId));

  // Delete budget
  await db.delete(budgets).where(eq(budgets.id, budgetId));

  return true;
}

/**
 * Track spending and check for alert triggers
 */
export async function trackSpending(
  userId: string,
  amount: number, // Amount in cents
  providerId?: string
): Promise<{ triggeredAlerts: BudgetAlert[] }> {
  const db = await getDb();
  if (!db) return { triggeredAlerts: [] };

  // Get active budgets for this user
  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.isActive, true)));

  const triggeredAlerts: BudgetAlert[] = [];

  for (const budget of userBudgets) {
    // Check if budget applies to this provider
    if (budget.providers && budget.providers.length > 0 && providerId) {
      if (!budget.providers.includes(providerId)) {
        continue; // Skip this budget if provider doesn't match
      }
    }

    // Update current spend
    const newSpend = budget.currentSpend + amount;
    await db
      .update(budgets)
      .set({ currentSpend: newSpend })
      .where(eq(budgets.id, budget.id));

    // Check alert thresholds
    const percentageUsed = (newSpend / budget.amount) * 100;
    const alerts = await db
      .select()
      .from(budgetAlerts)
      .where(and(eq(budgetAlerts.budgetId, budget.id), eq(budgetAlerts.isTriggered, false)));

    for (const alert of alerts) {
      if (percentageUsed >= alert.threshold) {
        // Trigger alert
        await db
          .update(budgetAlerts)
          .set({
            isTriggered: true,
            triggeredAt: new Date(),
          })
          .where(eq(budgetAlerts.id, alert.id));

        triggeredAlerts.push({
          ...alert,
          isTriggered: true,
          triggeredAt: new Date(),
        });
      }
    }
  }

  return { triggeredAlerts };
}

/**
 * Reset budget spending (called periodically based on budget period)
 */
export async function resetBudgetSpending(budgetId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Reset current spend
  await db
    .update(budgets)
    .set({
      currentSpend: 0,
      lastResetAt: new Date(),
    })
    .where(eq(budgets.id, budgetId));

  // Reset all alerts
  await db
    .update(budgetAlerts)
    .set({
      isTriggered: false,
      triggeredAt: null,
      notificationSent: false,
    })
    .where(eq(budgetAlerts.budgetId, budgetId));
}

/**
 * Check and reset budgets that have reached their period end
 */
export async function checkAndResetBudgets(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Get all active budgets
  const activeBudgets = await db.select().from(budgets).where(eq(budgets.isActive, true));

  for (const budget of activeBudgets) {
    let shouldReset = false;
    const lastReset = budget.lastResetAt || budget.createdAt;

    if (!lastReset) continue;

    switch (budget.period) {
      case "daily":
        const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
        shouldReset = daysSinceReset >= 1;
        break;
      case "weekly":
        const weeksSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24 * 7));
        shouldReset = weeksSinceReset >= 1;
        break;
      case "monthly":
        const monthsSinceReset =
          (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
        shouldReset = monthsSinceReset >= 1;
        break;
      case "yearly":
        const yearsSinceReset = now.getFullYear() - lastReset.getFullYear();
        shouldReset = yearsSinceReset >= 1;
        break;
    }

    if (shouldReset) {
      await resetBudgetSpending(budget.id);
    }
  }
}

// Start periodic budget reset check (runs every hour)
setInterval(checkAndResetBudgets, 60 * 60 * 1000);

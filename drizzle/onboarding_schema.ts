import { mysqlTable, varchar, boolean, timestamp, json } from "drizzle-orm/mysql-core";

/**
 * User onboarding progress tracking
 */
export const userOnboarding = mysqlTable("user_onboarding", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  
  // Step completion status
  hasCreatedPrompt: boolean("has_created_prompt").notNull().default(false),
  hasConnectedProvider: boolean("has_connected_provider").notNull().default(false),
  hasRunEvaluation: boolean("has_run_evaluation").notNull().default(false),
  hasExploredMarketplace: boolean("has_explored_marketplace").notNull().default(false),
  hasSetupTeam: boolean("has_setup_team").notNull().default(false),
  
  // Wizard state
  isWizardDismissed: boolean("is_wizard_dismissed").notNull().default(false),
  currentStep: varchar("current_step", { length: 64 }),
  
  // Completion tracking
  completedSteps: json("completed_steps").$type<string[]>(),
  completedAt: timestamp("completed_at"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type InsertUserOnboarding = typeof userOnboarding.$inferInsert;

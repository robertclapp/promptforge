import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userOnboarding, prompts, aiProviders, evaluations } from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
  isCompleted: boolean;
}

export interface OnboardingProgress {
  id: string;
  userId: string;
  hasCreatedPrompt: boolean;
  hasConnectedProvider: boolean;
  hasRunEvaluation: boolean;
  hasExploredMarketplace: boolean;
  hasSetupTeam: boolean;
  isWizardDismissed: boolean;
  currentStep: string | null;
  completedSteps: string[];
  completedAt: Date | null;
  percentComplete: number;
  steps: OnboardingStep[];
}

const ONBOARDING_STEPS: Omit<OnboardingStep, 'isCompleted'>[] = [
  {
    id: "create_prompt",
    title: "Create Your First Prompt",
    description: "Start by creating a prompt template that you can test and iterate on.",
    action: "Create Prompt",
    actionUrl: "/prompts/new"
  },
  {
    id: "connect_provider",
    title: "Connect an AI Provider",
    description: "Add your API keys for OpenAI, Anthropic, or other AI providers.",
    action: "Add Provider",
    actionUrl: "/providers"
  },
  {
    id: "run_evaluation",
    title: "Run Your First Evaluation",
    description: "Test your prompts against different models and compare results.",
    action: "Run Evaluation",
    actionUrl: "/evaluations"
  },
  {
    id: "explore_marketplace",
    title: "Explore the Marketplace",
    description: "Discover and import pre-built prompt templates from the community.",
    action: "Browse Marketplace",
    actionUrl: "/marketplace"
  },
  {
    id: "setup_team",
    title: "Invite Your Team",
    description: "Collaborate with team members by inviting them to your workspace.",
    action: "Manage Team",
    actionUrl: "/teams"
  }
];

export async function getOrCreateOnboarding(userId: string): Promise<OnboardingProgress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Try to find existing onboarding record
  const [existing] = await db.select().from(userOnboarding).where(eq(userOnboarding.userId, userId)).limit(1);

  if (existing) {
    return formatOnboardingProgress(existing);
  }

  // Create new onboarding record
  const id = uuidv4();
  await db.insert(userOnboarding).values({
    id,
    userId,
    hasCreatedPrompt: false,
    hasConnectedProvider: false,
    hasRunEvaluation: false,
    hasExploredMarketplace: false,
    hasSetupTeam: false,
    isWizardDismissed: false,
    currentStep: "create_prompt",
    completedSteps: []
  });

  const [newRecord] = await db.select().from(userOnboarding).where(eq(userOnboarding.id, id)).limit(1);

  return formatOnboardingProgress(newRecord!);
}

export async function updateOnboardingStep(
  userId: string,
  stepId: string,
  completed: boolean
): Promise<OnboardingProgress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const progress = await getOrCreateOnboarding(userId);
  
  // Map step ID to field name
  const fieldMap: Record<string, keyof typeof userOnboarding.$inferSelect> = {
    create_prompt: "hasCreatedPrompt",
    connect_provider: "hasConnectedProvider",
    run_evaluation: "hasRunEvaluation",
    explore_marketplace: "hasExploredMarketplace",
    setup_team: "hasSetupTeam"
  };

  const field = fieldMap[stepId];
  if (!field) {
    throw new Error(`Invalid step ID: ${stepId}`);
  }

  // Update completed steps array
  let completedSteps = progress.completedSteps || [];
  if (completed && !completedSteps.includes(stepId)) {
    completedSteps = [...completedSteps, stepId];
  } else if (!completed) {
    completedSteps = completedSteps.filter(s => s !== stepId);
  }

  // Check if all steps are completed
  const allCompleted = ONBOARDING_STEPS.every(step => 
    completedSteps.includes(step.id)
  );

  // Find next incomplete step
  const nextStep = ONBOARDING_STEPS.find(step => !completedSteps.includes(step.id));

  await db.update(userOnboarding)
    .set({
      [field]: completed,
      completedSteps,
      currentStep: nextStep?.id || null,
      completedAt: allCompleted ? new Date() : null,
      updatedAt: new Date()
    })
    .where(eq(userOnboarding.userId, userId));

  return getOrCreateOnboarding(userId);
}

export async function dismissWizard(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await getOrCreateOnboarding(userId); // Ensure record exists
  
  await db.update(userOnboarding)
    .set({
      isWizardDismissed: true,
      updatedAt: new Date()
    })
    .where(eq(userOnboarding.userId, userId));
}

export async function resetOnboarding(userId: string): Promise<OnboardingProgress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(userOnboarding)
    .set({
      hasCreatedPrompt: false,
      hasConnectedProvider: false,
      hasRunEvaluation: false,
      hasExploredMarketplace: false,
      hasSetupTeam: false,
      isWizardDismissed: false,
      currentStep: "create_prompt",
      completedSteps: [],
      completedAt: null,
      updatedAt: new Date()
    })
    .where(eq(userOnboarding.userId, userId));

  return getOrCreateOnboarding(userId);
}

function formatOnboardingProgress(record: typeof userOnboarding.$inferSelect): OnboardingProgress {
  const completedSteps = (record.completedSteps as string[]) || [];
  
  const steps: OnboardingStep[] = ONBOARDING_STEPS.map(step => ({
    ...step,
    isCompleted: getStepCompletion(record, step.id)
  }));

  const completedCount = steps.filter(s => s.isCompleted).length;
  const percentComplete = Math.round((completedCount / steps.length) * 100);

  return {
    id: record.id,
    userId: record.userId,
    hasCreatedPrompt: record.hasCreatedPrompt,
    hasConnectedProvider: record.hasConnectedProvider,
    hasRunEvaluation: record.hasRunEvaluation,
    hasExploredMarketplace: record.hasExploredMarketplace,
    hasSetupTeam: record.hasSetupTeam,
    isWizardDismissed: record.isWizardDismissed,
    currentStep: record.currentStep,
    completedSteps,
    completedAt: record.completedAt,
    percentComplete,
    steps
  };
}

function getStepCompletion(
  record: typeof userOnboarding.$inferSelect,
  stepId: string
): boolean {
  switch (stepId) {
    case "create_prompt": return record.hasCreatedPrompt;
    case "connect_provider": return record.hasConnectedProvider;
    case "run_evaluation": return record.hasRunEvaluation;
    case "explore_marketplace": return record.hasExploredMarketplace;
    case "setup_team": return record.hasSetupTeam;
    default: return false;
  }
}

// Auto-detect completion based on actual data
export async function syncOnboardingWithData(userId: string): Promise<OnboardingProgress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user has created prompts
  const [promptCount] = await db.select().from(prompts).where(eq(prompts.userId, userId)).limit(1);
  
  // Check if user has connected providers
  const [providerCount] = await db.select().from(aiProviders).limit(1);
  
  // Check if user has run evaluations
  const [evalCount] = await db.select().from(evaluations).limit(1);

  const progress = await getOrCreateOnboarding(userId);
  
  // Update based on actual data
  const updates: Partial<typeof userOnboarding.$inferInsert> = {};
  let completedSteps = progress.completedSteps || [];
  
  if (promptCount && !progress.hasCreatedPrompt) {
    updates.hasCreatedPrompt = true;
    if (!completedSteps.includes("create_prompt")) {
      completedSteps = [...completedSteps, "create_prompt"];
    }
  }
  
  if (providerCount && !progress.hasConnectedProvider) {
    updates.hasConnectedProvider = true;
    if (!completedSteps.includes("connect_provider")) {
      completedSteps = [...completedSteps, "connect_provider"];
    }
  }
  
  if (evalCount && !progress.hasRunEvaluation) {
    updates.hasRunEvaluation = true;
    if (!completedSteps.includes("run_evaluation")) {
      completedSteps = [...completedSteps, "run_evaluation"];
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.completedSteps = completedSteps;
    updates.updatedAt = new Date();
    
    await db.update(userOnboarding)
      .set(updates)
      .where(eq(userOnboarding.userId, userId));
  }

  return getOrCreateOnboarding(userId);
}

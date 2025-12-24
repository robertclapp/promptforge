import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

/**
 * Workspace Isolation Tests
 * Verifies that data is properly isolated between different workspaces
 */

describe("Workspace Isolation", () => {
  // Mock users for testing
  const user1 = {
    id: "user1",
    name: "User One",
    email: "user1@test.com",
    loginMethod: "oauth",
    role: "user" as const,
    createdAt: new Date(),
    lastSignedIn: new Date(),
    subscriptionTier: "free" as const,
    apiCallsUsed: 0,
    apiCallsLimit: 1000,
  };

  const user2 = {
    id: "user2",
    name: "User Two",
    email: "user2@test.com",
    loginMethod: "oauth",
    role: "user" as const,
    createdAt: new Date(),
    lastSignedIn: new Date(),
    subscriptionTier: "free" as const,
    apiCallsUsed: 0,
    apiCallsLimit: 1000,
  };

  // Team IDs
  const teamAlpha = "team-alpha";
  const teamBeta = "team-beta";

  // Create mock contexts
  const createContext = (user: typeof user1, activeTeamId: string | null): TrpcContext => ({
    req: {} as any,
    res: {} as any,
    user,
    activeTeamId,
  });

  describe("Prompts Isolation", () => {
    it("should only return prompts from active workspace", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      // Create prompt in team Alpha
      const { id: promptId } = await caller.prompts.create({
        name: "Team Alpha Prompt",
        content: "This is a prompt for team Alpha",
        description: "Alpha prompt",
      });

      // List prompts with team Alpha context
      const promptsAlpha = await caller.prompts.list({});
      expect(promptsAlpha.some((p) => p.id === promptId)).toBe(true);

      // Switch to team Beta context
      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      const promptsBeta = await callerBeta.prompts.list({});

      // Prompt should NOT appear in team Beta
      expect(promptsBeta.some((p) => p.id === promptId)).toBe(false);
    });

    it("should inject activeTeamId when creating prompts", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      const { id: promptId } = await caller.prompts.create({
        name: "Auto-scoped Prompt",
        content: "This should be scoped to team Alpha",
      });

      // Verify the prompt was created with correct organizationId
      const prompt = await caller.prompts.get({ id: promptId });
      expect(prompt.organizationId).toBe(teamAlpha);
    });
  });

  describe("Evaluations Isolation", () => {
    it("should only return evaluations from active workspace", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      // First create a prompt
      const { id: promptId } = await caller.prompts.create({
        name: "Test Prompt",
        content: "Test content",
      });

      // Create AI provider
      const { id: providerId } = await caller.aiProviders.create({
        provider: "openai",
        name: "Test Provider",
        model: "gpt-4",
        apiKey: "test-key-123",
      });

      // Create evaluation in team Alpha
      const { id: evalId } = await caller.evaluations.create({
        promptId,
        name: "Team Alpha Evaluation",
        testCases: [{ input: { test: "value" }, expectedOutput: "output" }],
        providerIds: [providerId],
      });

      // List evaluations with team Alpha context
      const evalsAlpha = await caller.evaluations.list({});
      expect(evalsAlpha.some((e) => e.id === evalId)).toBe(true);

      // Switch to team Beta context
      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      const evalsBeta = await callerBeta.evaluations.list({});

      // Evaluation should NOT appear in team Beta
      expect(evalsBeta.some((e) => e.id === evalId)).toBe(false);
    });
  });

  describe("Budgets Isolation", () => {
    it("should only return budgets from active workspace", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      // Create budget in team Alpha
      const budget = await caller.budgets.create({
        name: "Team Alpha Budget",
        amount: 10000,
        period: "monthly",
        startDate: new Date(),
      });

      // List budgets with team Alpha context
      const budgetsAlpha = await caller.budgets.list();
      expect(budgetsAlpha.some((b) => b.id === budget.id)).toBe(true);

      // Switch to team Beta context
      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      const budgetsBeta = await callerBeta.budgets.list();

      // Budget should NOT appear in team Beta
      expect(budgetsBeta.some((b) => b.id === budget.id)).toBe(false);
    });
  });

  describe("AI Providers Isolation", () => {
    it("should only return AI providers from active workspace", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      // Create provider in team Alpha
      const { id: providerId } = await caller.aiProviders.create({
        provider: "openai",
        name: "Team Alpha OpenAI",
        model: "gpt-4",
        apiKey: "sk-test-123",
      });

      // List providers with team Alpha context
      const providersAlpha = await caller.aiProviders.list({});
      expect(providersAlpha.some((p) => p.id === providerId)).toBe(true);

      // Switch to team Beta context
      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      const providersBeta = await callerBeta.aiProviders.list({});

      // Provider should NOT appear in team Beta
      expect(providersBeta.some((p) => p.id === providerId)).toBe(false);
    });
  });

  describe("Context Packages Isolation", () => {
    it("should only return context packages from active workspace", async () => {
      const caller = appRouter.createCaller(createContext(user1, teamAlpha));

      // Create context package in team Alpha
      const { id: packageId } = await caller.contextPackages.create({
        name: "Team Alpha Context",
        content: "This is context for team Alpha",
      });

      // List packages with team Alpha context
      const packagesAlpha = await caller.contextPackages.list({});
      expect(packagesAlpha.some((p) => p.id === packageId)).toBe(true);

      // Switch to team Beta context
      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      const packagesBeta = await callerBeta.contextPackages.list({});

      // Package should NOT appear in team Beta
      expect(packagesBeta.some((p) => p.id === packageId)).toBe(false);
    });
  });

  describe("Cross-User Isolation", () => {
    it("should not allow user2 to see user1's workspace data", async () => {
      // User 1 creates data in team Alpha
      const caller1 = appRouter.createCaller(createContext(user1, teamAlpha));
      const { id: promptId } = await caller1.prompts.create({
        name: "User 1 Prompt",
        content: "Private to user 1",
      });

      // User 2 tries to access with same team context
      const caller2 = appRouter.createCaller(createContext(user2, teamAlpha));
      const prompts = await caller2.prompts.list({});

      // User 2 should NOT see user 1's prompt (unless they're in the same team)
      // This test assumes users are NOT in the same team
      expect(prompts.some((p) => p.id === promptId)).toBe(false);
    });
  });

  describe("No Workspace Context", () => {
    it("should return all user data when no activeTeamId is set", async () => {
      const caller = appRouter.createCaller(createContext(user1, null));

      // Create prompts in different teams
      const callerAlpha = appRouter.createCaller(createContext(user1, teamAlpha));
      await callerAlpha.prompts.create({
        name: "Alpha Prompt",
        content: "Alpha content",
      });

      const callerBeta = appRouter.createCaller(createContext(user1, teamBeta));
      await callerBeta.prompts.create({
        name: "Beta Prompt",
        content: "Beta content",
      });

      // List without workspace context should return all prompts
      const allPrompts = await caller.prompts.list({});
      expect(allPrompts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

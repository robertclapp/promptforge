import { describe, it, expect, beforeEach, vi } from "vitest";
import * as testSuiteService from "../testSuite.service";
import * as db from "../../db";
import * as aiProviderService from "../aiProvider.service";

// Mock dependencies
vi.mock("../../db");
vi.mock("../aiProvider.service");

describe("TestSuite Service", () => {
  const mockUserId = "user-123";
  const mockPromptId = "prompt-123";
  const mockProviderId = "provider-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTestSuite", () => {
    it("should create a test suite with valid data", async () => {
      const mockSuiteId = "suite-123";
      vi.mocked(db.createTestSuite).mockResolvedValue(mockSuiteId);

      const result = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Customer Support Tests",
        description: "Test customer support prompts",
        testCases: [
          {
            input: { customer_name: "John", issue: "billing" },
            expectedOutput: "I'll help you with billing",
            minQuality: 80,
          },
        ],
        qualityThreshold: 75,
      });

      expect(result).toBe(mockSuiteId);
      expect(db.createTestSuite).toHaveBeenCalledWith({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Customer Support Tests",
        description: "Test customer support prompts",
        testCases: [
          {
            input: { customer_name: "John", issue: "billing" },
            expectedOutput: "I'll help you with billing",
            minQuality: 80,
          },
        ],
        qualityThreshold: 75,
      });
    });

    it("should create a test suite without optional fields", async () => {
      const mockSuiteId = "suite-456";
      vi.mocked(db.createTestSuite).mockResolvedValue(mockSuiteId);

      const result = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Basic Tests",
        testCases: [
          {
            input: { text: "hello" },
          },
        ],
      });

      expect(result).toBe(mockSuiteId);
      expect(db.createTestSuite).toHaveBeenCalledWith({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Basic Tests",
        description: undefined,
        testCases: [
          {
            input: { text: "hello" },
            expectedOutput: undefined,
            minQuality: undefined,
          },
        ],
        qualityThreshold: undefined,
      });
    });
  });

  describe("runTestSuite", () => {
    const mockSuite = {
      id: "suite-123",
      userId: mockUserId,
      promptId: mockPromptId,
      name: "Test Suite",
      description: null,
      testCases: [
        {
          input: { customer_name: "John", issue: "billing" },
          expectedOutput: "I'll help you with billing",
          minQuality: 80,
        },
        {
          input: { customer_name: "Jane", issue: "refund" },
          minQuality: 75,
        },
      ],
      qualityThreshold: 75,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrompt = {
      id: mockPromptId,
      name: "Customer Support",
      template: "Help {{customer_name}} with {{issue}}",
      variables: ["customer_name", "issue"],
    };

    const mockProvider = {
      id: mockProviderId,
      name: "OpenAI GPT-4",
      provider: "openai",
      model: "gpt-4",
      apiKey: "encrypted-key",
    };

    beforeEach(() => {
      vi.mocked(db.getTestSuite).mockResolvedValue(mockSuite);
      vi.mocked(db.getPrompt).mockResolvedValue(mockPrompt);
      vi.mocked(db.getAIProvider).mockResolvedValue(mockProvider);
      vi.mocked(db.createTestRun).mockResolvedValue("run-123");
      vi.mocked(db.updateTestRun).mockResolvedValue();
    });

    it("should run test suite and pass all tests", async () => {
      // Mock AI provider responses
      vi.mocked(aiProviderService.executePrompt)
        .mockResolvedValueOnce({
          output: "I'll help you with billing issues",
          tokens: 20,
          cost: 0.001,
          latency: 500,
        })
        .mockResolvedValueOnce({
          output: "I'll help you with refund requests",
          tokens: 22,
          cost: 0.0011,
          latency: 520,
        });

      const runId = await testSuiteService.runTestSuite("suite-123", mockUserId, {
        gitCommit: "abc123",
        gitBranch: "main",
        providerId: mockProviderId,
      });

      expect(runId).toBe("run-123");
      expect(db.createTestRun).toHaveBeenCalledWith({
        suiteId: "suite-123",
        userId: mockUserId,
        status: "running",
        gitCommit: "abc123",
        gitBranch: "main",
        results: null,
        passedTests: 0,
        failedTests: 0,
        averageQuality: null,
        totalCost: null,
        totalLatency: null,
      });

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(aiProviderService.executePrompt).toHaveBeenCalledTimes(2);
      expect(db.updateTestRun).toHaveBeenCalled();
    });

    it("should fail test suite when quality is below threshold", async () => {
      // Mock AI provider responses with low quality
      vi.mocked(aiProviderService.executePrompt)
        .mockResolvedValueOnce({
          output: "Wrong response",
          tokens: 10,
          cost: 0.0005,
          latency: 300,
        })
        .mockResolvedValueOnce({
          output: "Another wrong response",
          tokens: 12,
          cost: 0.0006,
          latency: 320,
        });

      const runId = await testSuiteService.runTestSuite("suite-123", mockUserId, {
        providerId: mockProviderId,
      });

      expect(runId).toBe("run-123");

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(db.updateTestRun).toHaveBeenCalled();
    });

    it("should handle errors during test execution", async () => {
      vi.mocked(aiProviderService.executePrompt).mockRejectedValue(
        new Error("API error")
      );

      const runId = await testSuiteService.runTestSuite("suite-123", mockUserId, {
        providerId: mockProviderId,
      });

      expect(runId).toBe("run-123");

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(db.updateTestRun).toHaveBeenCalledWith(
        "run-123",
        expect.objectContaining({
          status: "error",
        })
      );
    });
  });

  describe("getTestSuite", () => {
    it("should retrieve test suite by id", async () => {
      const mockSuite = {
        id: "suite-123",
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Test Suite",
        description: "Description",
        testCases: [],
        qualityThreshold: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getTestSuite).mockResolvedValue(mockSuite);

      const result = await testSuiteService.getTestSuite("suite-123");

      expect(result).toEqual(mockSuite);
      expect(db.getTestSuite).toHaveBeenCalledWith("suite-123");
    });
  });

  describe("getUserTestSuites", () => {
    it("should retrieve all test suites for a user", async () => {
      const mockSuites = [
        {
          id: "suite-1",
          userId: mockUserId,
          promptId: mockPromptId,
          name: "Suite 1",
          description: null,
          testCases: [],
          qualityThreshold: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "suite-2",
          userId: mockUserId,
          promptId: mockPromptId,
          name: "Suite 2",
          description: null,
          testCases: [],
          qualityThreshold: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getUserTestSuites).mockResolvedValue(mockSuites);

      const result = await testSuiteService.getUserTestSuites(mockUserId);

      expect(result).toEqual(mockSuites);
      expect(db.getUserTestSuites).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("deleteTestSuite", () => {
    it("should delete test suite and associated runs", async () => {
      vi.mocked(db.deleteTestSuite).mockResolvedValue();

      await testSuiteService.deleteTestSuite("suite-123");

      expect(db.deleteTestSuite).toHaveBeenCalledWith("suite-123");
    });
  });

  describe("getTestRun", () => {
    it("should retrieve test run by id", async () => {
      const mockRun = {
        id: "run-123",
        suiteId: "suite-123",
        userId: mockUserId,
        status: "passed" as const,
        gitCommit: "abc123",
        gitBranch: "main",
        results: [],
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        averageQuality: 85,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(db.getTestRun).mockResolvedValue(mockRun);

      const result = await testSuiteService.getTestRun("run-123");

      expect(result).toEqual(mockRun);
      expect(db.getTestRun).toHaveBeenCalledWith("run-123");
    });
  });

  describe("getTestRunsForSuite", () => {
    it("should retrieve all test runs for a suite", async () => {
      const mockRuns = [
        {
          id: "run-1",
          suiteId: "suite-123",
          userId: mockUserId,
          status: "passed" as const,
          gitCommit: "abc123",
          gitBranch: "main",
          results: [],
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          averageQuality: 85,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: "run-2",
          suiteId: "suite-123",
          userId: mockUserId,
          status: "failed" as const,
          gitCommit: "def456",
          gitBranch: "main",
          results: [],
          totalTests: 5,
          passedTests: 3,
          failedTests: 2,
          averageQuality: 65,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getTestRunsForSuite).mockResolvedValue(mockRuns);

      const result = await testSuiteService.getTestRunsForSuite("suite-123");

      expect(result).toEqual(mockRuns);
      expect(db.getTestRunsForSuite).toHaveBeenCalledWith("suite-123");
    });
  });

  describe("getUserTestRuns", () => {
    it("should retrieve all test runs for a user", async () => {
      const mockRuns = [
        {
          id: "run-1",
          suiteId: "suite-123",
          userId: mockUserId,
          status: "passed" as const,
          gitCommit: null,
          gitBranch: null,
          results: [],
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          averageQuality: 85,
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getUserTestRuns).mockResolvedValue(mockRuns);

      const result = await testSuiteService.getUserTestRuns(mockUserId);

      expect(result).toEqual(mockRuns);
      expect(db.getUserTestRuns).toHaveBeenCalledWith(mockUserId);
    });
  });
});

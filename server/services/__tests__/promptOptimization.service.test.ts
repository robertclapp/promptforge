import { describe, it, expect, vi, beforeEach } from "vitest";
import * as optimizationService from "../promptOptimization.service";
import * as db from "../../db";

// Mock the database module
vi.mock("../../db");

// Mock the LLM module
vi.mock("../../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "../../_core/llm";

describe("Prompt Optimization Service", () => {
  const mockUserId = "user-123";
  const mockPromptId = "prompt-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("optimizePrompt", () => {
    it("should analyze prompt and return optimization suggestions", async () => {
      const mockPrompt = {
        id: mockPromptId,
        userId: mockUserId,
        name: "Customer Support Prompt",
        content: "Help the customer",
        description: null,
        variables: null,
        organizationId: null,
        tags: null,
        folderPath: "/",
        isTemplate: false,
        isPublic: false,
        version: 1,
        createdAt: new Date(),
        isActive: true,
      };

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                improvedPrompt:
                  "You are a helpful customer support agent. Analyze the customer's issue carefully and provide a clear, empathetic response that addresses their specific concern. Include relevant troubleshooting steps if applicable.",
                explanation:
                  "The original prompt was too vague. I've added role definition, specific instructions, and quality criteria.",
                improvements: [
                  {
                    category: "clarity",
                    issue: "Prompt lacks clear role definition",
                    fix: "Added 'You are a helpful customer support agent' to establish context",
                  },
                  {
                    category: "specificity",
                    issue: "No specific instructions on how to help",
                    fix: "Added instructions to analyze issue and provide empathetic response",
                  },
                ],
                estimatedQualityImprovement: 35,
              }),
            },
          },
        ],
      };

      vi.mocked(db.getPrompt).mockResolvedValue(mockPrompt);
      vi.mocked(invokeLLM).mockResolvedValue(mockLLMResponse as any);
      vi.mocked(db.createOptimization).mockResolvedValue("opt-123");

      const result = await optimizationService.optimizePrompt(mockPromptId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe("opt-123");
      expect(result.improvedPrompt).toContain("customer support agent");
      expect(result.improvements).toHaveLength(2);
      expect(result.estimatedQualityImprovement).toBe(35);
      expect(db.createOptimization).toHaveBeenCalled();
    });

    it("should throw error if prompt not found", async () => {
      vi.mocked(db.getPrompt).mockResolvedValue(undefined);

      await expect(optimizationService.optimizePrompt(mockPromptId, mockUserId)).rejects.toThrow(
        "Prompt not found"
      );
    });
  });

  describe("applyOptimization", () => {
    it("should apply optimization and create new prompt version", async () => {
      const mockOptimization = {
        id: "opt-123",
        promptId: mockPromptId,
        userId: mockUserId,
        originalPrompt: "Help the customer",
        optimizedPrompt: "You are a helpful customer support agent...",
        suggestions: {
          improvedPrompt: "You are a helpful customer support agent...",
          explanation: "Improved clarity and specificity",
          improvements: [],
          estimatedQualityImprovement: 35,
        },
        applied: false,
        createdAt: new Date(),
      };

      const mockPrompt = {
        id: mockPromptId,
        userId: mockUserId,
        name: "Customer Support Prompt",
        content: "Help the customer",
        version: 1,
        description: null,
        variables: null,
        organizationId: null,
        tags: null,
        folderPath: "/",
        isTemplate: false,
        isPublic: false,
        createdAt: new Date(),
        isActive: true,
      };

      vi.mocked(db.getOptimization).mockResolvedValue(mockOptimization);
      vi.mocked(db.getPrompt).mockResolvedValue(mockPrompt);
      vi.mocked(db.createPromptVersion).mockResolvedValue("version-123");
      vi.mocked(db.updatePrompt).mockResolvedValue(undefined);
      vi.mocked(db.updateOptimization).mockResolvedValue(undefined);

      const versionId = await optimizationService.applyOptimization("opt-123", mockUserId);

      expect(versionId).toBe("version-123");
      expect(db.createPromptVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          promptId: mockPromptId,
          content: mockOptimization.optimizedPrompt,
          version: 2,
        })
      );
      expect(db.updatePrompt).toHaveBeenCalledWith(
        mockPromptId,
        expect.objectContaining({
          content: mockOptimization.optimizedPrompt,
          version: 2,
        })
      );
      expect(db.updateOptimization).toHaveBeenCalledWith("opt-123", { applied: true });
    });

    it("should throw error if optimization not found", async () => {
      vi.mocked(db.getOptimization).mockResolvedValue(undefined);

      await expect(optimizationService.applyOptimization("opt-123", mockUserId)).rejects.toThrow(
        "Optimization not found"
      );
    });

    it("should throw error if user is not authorized", async () => {
      const mockOptimization = {
        id: "opt-123",
        promptId: mockPromptId,
        userId: "different-user",
        originalPrompt: "Help the customer",
        optimizedPrompt: "You are a helpful customer support agent...",
        suggestions: {
          improvedPrompt: "You are a helpful customer support agent...",
          explanation: "Improved clarity and specificity",
          improvements: [],
          estimatedQualityImprovement: 35,
        },
        applied: false,
        createdAt: new Date(),
      };

      vi.mocked(db.getOptimization).mockResolvedValue(mockOptimization);

      await expect(optimizationService.applyOptimization("opt-123", mockUserId)).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("getPromptOptimizations", () => {
    it("should retrieve optimization history for a prompt", async () => {
      const mockOptimizations = [
        {
          id: "opt-1",
          promptId: mockPromptId,
          userId: mockUserId,
          originalPrompt: "Help the customer",
          optimizedPrompt: "Improved version 1",
          suggestions: {
            improvedPrompt: "Improved version 1",
            explanation: "First optimization",
            improvements: [],
            estimatedQualityImprovement: 20,
          },
          applied: true,
          createdAt: new Date(),
        },
        {
          id: "opt-2",
          promptId: mockPromptId,
          userId: mockUserId,
          originalPrompt: "Improved version 1",
          optimizedPrompt: "Improved version 2",
          suggestions: {
            improvedPrompt: "Improved version 2",
            explanation: "Second optimization",
            improvements: [],
            estimatedQualityImprovement: 15,
          },
          applied: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getPromptOptimizations).mockResolvedValue(mockOptimizations);

      const result = await optimizationService.getPromptOptimizations(mockPromptId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("opt-1");
      expect(result[1].id).toBe("opt-2");
    });
  });

  describe("getUserOptimizations", () => {
    it("should retrieve all optimizations for a user", async () => {
      const mockOptimizations = [
        {
          id: "opt-1",
          promptId: "prompt-1",
          userId: mockUserId,
          originalPrompt: "Original 1",
          optimizedPrompt: "Optimized 1",
          suggestions: {
            improvedPrompt: "Optimized 1",
            explanation: "Optimization 1",
            improvements: [],
            estimatedQualityImprovement: 20,
          },
          applied: true,
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getUserOptimizations).mockResolvedValue(mockOptimizations);

      const result = await optimizationService.getUserOptimizations(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import * as testSuiteService from "../testSuite.service";

describe("TestSuite Service Integration Tests", () => {
  const mockUserId = "test-user-" + Date.now();
  const mockPromptId = "test-prompt-" + Date.now();

  describe("Test Suite Lifecycle", () => {
    it("should create and retrieve a test suite", async () => {
      const suiteId = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Integration Test Suite",
        description: "Test suite for integration testing",
        testCases: [
          {
            input: { customer_name: "John", issue: "billing" },
            expectedOutput: "I'll help you with billing",
            minQuality: 80,
          },
        ],
        qualityThreshold: 75,
      });

      expect(suiteId).toBeTruthy();
      expect(typeof suiteId).toBe("string");

      const suite = await testSuiteService.getTestSuite(suiteId);
      expect(suite).toBeTruthy();
      expect(suite?.name).toBe("Integration Test Suite");
      expect(suite?.userId).toBe(mockUserId);
      expect(suite?.testCases).toHaveLength(1);
    });

    it("should list user test suites", async () => {
      const suiteId1 = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Suite 1",
        testCases: [{ input: { text: "hello" } }],
      });

      const suiteId2 = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Suite 2",
        testCases: [{ input: { text: "world" } }],
      });

      const suites = await testSuiteService.getUserTestSuites(mockUserId);
      expect(suites.length).toBeGreaterThanOrEqual(2);
      
      const suiteIds = suites.map(s => s.id);
      expect(suiteIds).toContain(suiteId1);
      expect(suiteIds).toContain(suiteId2);
    });

    it("should delete a test suite", async () => {
      const suiteId = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Suite to Delete",
        testCases: [{ input: { text: "delete me" } }],
      });

      await testSuiteService.deleteTestSuite(suiteId);

      const suite = await testSuiteService.getTestSuite(suiteId);
      expect(suite).toBeUndefined();
    });
  });

  describe("Test Suite Validation", () => {
    it("should create test suite with minimal fields", async () => {
      const suiteId = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Minimal Suite",
        testCases: [{ input: { text: "test" } }],
      });

      const suite = await testSuiteService.getTestSuite(suiteId);
      expect(suite).toBeTruthy();
      expect(suite?.description).toBeNull();
      expect(suite?.qualityThreshold).toBeNull();
    });

    it("should create test suite with multiple test cases", async () => {
      const suiteId = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Multi-case Suite",
        testCases: [
          { input: { text: "case1" }, minQuality: 80 },
          { input: { text: "case2" }, expectedOutput: "output2" },
          { input: { text: "case3" } },
        ],
      });

      const suite = await testSuiteService.getTestSuite(suiteId);
      expect(suite?.testCases).toHaveLength(3);
    });
  });

  describe("Test Run Operations", () => {
    it("should retrieve test run by id", async () => {
      // This test would require a real test run, which needs AI provider setup
      // For now, we'll test that the function handles non-existent IDs gracefully
      const run = await testSuiteService.getTestRun("non-existent-id");
      expect(run).toBeUndefined();
    });

    it("should retrieve test runs for suite", async () => {
      const suiteId = await testSuiteService.createTestSuite({
        userId: mockUserId,
        promptId: mockPromptId,
        name: "Suite for Run Test",
        testCases: [{ input: { text: "test" } }],
      });

      const runs = await testSuiteService.getTestRunsForSuite(suiteId);
      expect(Array.isArray(runs)).toBe(true);
    });

    it("should retrieve user test runs", async () => {
      const runs = await testSuiteService.getUserTestRuns(mockUserId);
      expect(Array.isArray(runs)).toBe(true);
    });
  });
});

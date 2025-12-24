import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { testSuites, testRuns, type InsertTestSuite, type InsertTestRun } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { executePrompt } from "./aiProvider.service";
import { getPrompt, getAIProvider } from "../db";

/**
 * Create a new test suite
 */
export async function createTestSuite(data: Omit<InsertTestSuite, "id">): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  await db.insert(testSuites).values({ ...data, id });
  return id;
}

/**
 * Get test suite by ID
 */
export async function getTestSuite(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(testSuites).where(eq(testSuites.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all test suites for a user
 */
export async function getUserTestSuites(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(testSuites).where(eq(testSuites.userId, userId));
}

/**
 * Delete test suite
 */
export async function deleteTestSuite(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(testSuites).where(eq(testSuites.id, id));
}

/**
 * Run a test suite
 */
export async function runTestSuite(
  suiteId: string,
  userId: string,
  options?: {
    gitCommit?: string;
    gitBranch?: string;
    providerId?: string; // Optional: run against specific provider
  }
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get test suite
  const suite = await getTestSuite(suiteId);
  if (!suite) throw new Error("Test suite not found");

  // Get prompt
  const prompt = await getPrompt(suite.promptId);
  if (!prompt) throw new Error("Prompt not found");

  // Create test run
  const runId = nanoid();
  await db.insert(testRuns).values({
    id: runId,
    suiteId,
    userId,
    status: "running",
    gitCommit: options?.gitCommit,
    gitBranch: options?.gitBranch,
    totalTests: suite.testCases.length,
    passedTests: 0,
    failedTests: 0,
    startedAt: new Date(),
  });

  // Run tests asynchronously
  executeTestRun(runId, suite, prompt.content, options?.providerId).catch(console.error);

  return runId;
}

/**
 * Execute test run (internal function)
 */
async function executeTestRun(
  runId: string,
  suite: any,
  promptContent: string,
  providerId?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const results: Array<{
      testCaseIndex: number;
      passed: boolean;
      quality: number;
      output: string;
      error?: string;
    }> = [];

    let passedTests = 0;
    let failedTests = 0;
    let totalQuality = 0;

    // Get provider to use (first active provider if not specified)
    let provider;
    if (providerId) {
      provider = await getAIProvider(providerId);
    } else {
      // Get first active provider for user
      const providers = await db.select().from(await import("../../drizzle/schema").then(m => m.aiProviders))
        .where(eq((await import("../../drizzle/schema").then(m => m.aiProviders)).userId, suite.userId))
        .limit(1);
      provider = providers[0];
    }

    if (!provider) {
      throw new Error("No AI provider available");
    }

    // Execute each test case
    for (let i = 0; i < suite.testCases.length; i++) {
      const testCase = suite.testCases[i];
      
      try {
        // Replace variables in prompt
        let filledPrompt = promptContent;
        for (const [key, value] of Object.entries(testCase.input)) {
          filledPrompt = filledPrompt.replace(new RegExp(`{{${key}}}`, "g"), String(value));
        }

        // Execute prompt
        const result = await executePrompt(
          {
            id: provider.id,
            provider: provider.provider as "openai" | "anthropic" | "google" | "mistral",
            model: provider.model,
            apiKeyEncrypted: provider.apiKeyEncrypted,
            config: provider.config ? JSON.parse(provider.config) : undefined,
          },
          {
            prompt: filledPrompt,
            temperature: 0.7,
          }
        );

        // Calculate quality score
        let quality = 100; // Default to 100 if no expected output
        if (testCase.expectedOutput) {
          quality = calculateQualityScore(result.output, testCase.expectedOutput);
        }

        // Check if test passed
        const minQuality = testCase.minQuality || suite.qualityThreshold || 80;
        const passed = quality >= minQuality;

        if (passed) {
          passedTests++;
        } else {
          failedTests++;
        }

        totalQuality += quality;

        results.push({
          testCaseIndex: i,
          passed,
          quality,
          output: result.output,
        });
      } catch (error: any) {
        failedTests++;
        results.push({
          testCaseIndex: i,
          passed: false,
          quality: 0,
          output: "",
          error: error.message,
        });
      }
    }

    const averageQuality = Math.round(totalQuality / suite.testCases.length);
    const status = failedTests === 0 ? "passed" : "failed";

    // Update test run
    await db.update(testRuns)
      .set({
        status,
        results,
        passedTests,
        failedTests,
        averageQuality,
        completedAt: new Date(),
      })
      .where(eq(testRuns.id, runId));
  } catch (error: any) {
    // Update test run with error
    await db.update(testRuns)
      .set({
        status: "error",
        completedAt: new Date(),
      })
      .where(eq(testRuns.id, runId));
  }
}

/**
 * Calculate quality score using Levenshtein distance
 */
function calculateQualityScore(actual: string, expected: string): number {
  const distance = levenshteinDistance(actual.toLowerCase(), expected.toLowerCase());
  const maxLength = Math.max(actual.length, expected.length);
  const similarity = 1 - distance / maxLength;
  return Math.round(similarity * 100);
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get test run by ID
 */
export async function getTestRun(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(testRuns).where(eq(testRuns.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all test runs for a suite
 */
export async function getTestRunsForSuite(suiteId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(testRuns).where(eq(testRuns.suiteId, suiteId));
}

/**
 * Get all test runs for a user
 */
export async function getUserTestRuns(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(testRuns).where(eq(testRuns.userId, userId));
}

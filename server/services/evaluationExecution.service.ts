import { jobQueue } from "./jobQueue.service";
import { executePrompt, type AIProviderConfig, type PromptExecutionResult } from "./aiProvider.service";
import * as db from "../db";

/**
 * Evaluation Execution Service
 * Handles async execution of evaluations across multiple AI providers
 */

export interface EvaluationJobData {
  evaluationId: string;
  promptId: string;
  promptContent: string;
  promptVariables: string[];
  testCases: Array<{
    input: Record<string, string>;
    expectedOutput?: string;
  }>;
  providerIds: string[];
  userId: string;
}

export interface EvaluationJobResult {
  evaluationId: string;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  totalCost: number;
  avgLatency: number;
}

/**
 * Initialize evaluation execution system
 */
export function initializeEvaluationSystem() {
  // Register the evaluation job handler
  jobQueue.registerHandler<EvaluationJobData, EvaluationJobResult>(
    "evaluation",
    handleEvaluationJob
  );

  console.log("[EvaluationExecution] Evaluation system initialized");
}

/**
 * Queue an evaluation for execution
 */
export async function queueEvaluation(data: EvaluationJobData): Promise<string> {
  // Update evaluation status to "running"
  await db.updateEvaluation(data.evaluationId, { status: "running" });

  // Add job to queue
  const jobId = await jobQueue.addJob("evaluation", data, { maxAttempts: 2 });

  console.log(`[EvaluationExecution] Evaluation ${data.evaluationId} queued as job ${jobId}`);

  return jobId;
}

// Concurrency limit for parallel API calls (avoid rate limiting)
const MAX_CONCURRENT_REQUESTS = 3;

/**
 * Execute tasks with concurrency control
 */
async function executeWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then(result => {
      results.push(result);
    });

    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completedIndex = executing.findIndex(e =>
        e === Promise.resolve(e).then(() => e)
      );
      if (completedIndex > -1) executing.splice(completedIndex, 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Handle evaluation job execution
 */
async function handleEvaluationJob(data: EvaluationJobData): Promise<EvaluationJobResult> {
  console.log(`[EvaluationExecution] Starting evaluation ${data.evaluationId}`);

  const { evaluationId, promptContent, testCases, providerIds } = data;

  let completedTests = 0;
  let failedTests = 0;
  let totalCost = 0;
  let totalLatency = 0;
  const totalTests = testCases.length * providerIds.length;

  try {
    // Get all provider configurations in parallel
    const providers = await Promise.all(
      providerIds.map(id => db.getAIProvider(id))
    );

    // Filter out any providers that weren't found
    const validProviders = providers.filter((p): p is NonNullable<typeof p> => p !== undefined);

    if (validProviders.length === 0) {
      throw new Error("No valid AI providers found");
    }

    // Create all test execution tasks with proper indices
    interface TestTask {
      testCase: typeof testCases[0];
      testCaseIndex: number;
      provider: NonNullable<typeof providers[0]>;
    }

    const tasks: TestTask[] = [];
    testCases.forEach((testCase, testCaseIndex) => {
      validProviders.forEach(provider => {
        tasks.push({ testCase, testCaseIndex, provider });
      });
    });

    // Execute tasks with concurrency control
    await executeWithConcurrency(
      tasks,
      async ({ testCase, testCaseIndex, provider }) => {
        try {
          // Execute prompt with this provider and test case
          const result = await executePrompt(
            {
              id: provider.id,
              provider: provider.provider as any,
              model: provider.model,
              apiKeyEncrypted: provider.apiKeyEncrypted,
              config: provider.config as any,
            },
            {
              prompt: promptContent,
              variables: testCase.input,
              temperature: 0.7,
              maxTokens: 1000,
            }
          );

          // Calculate quality score if expected output provided
          let qualityScore: number | undefined;
          if (testCase.expectedOutput) {
            qualityScore = calculateQualityScore(result.output, testCase.expectedOutput);
          }

          // Store result in database
          await db.createEvaluationResult({
            evaluationId,
            providerId: provider.id,
            model: provider.model,
            testCaseIndex,
            input: testCase.input,
            output: result.output,
            tokensUsed: result.tokensUsed,
            latencyMs: result.latencyMs,
            cost: Math.round(result.cost * 100), // Store as cents
            quality: qualityScore ? Math.round(qualityScore) : undefined,
          });

          if (result.error) {
            failedTests++;
          } else {
            completedTests++;
            totalCost += result.cost;
            totalLatency += result.latencyMs;
          }

          console.log(
            `[EvaluationExecution] Test completed - Provider: ${provider.name}, ` +
            `Tokens: ${result.tokensUsed}, Latency: ${result.latencyMs}ms, Cost: $${result.cost.toFixed(4)}`
          );
        } catch (error) {
          console.error(
            `[EvaluationExecution] Test failed for provider ${provider.name}:`,
            error
          );

          // Store error result
          await db.createEvaluationResult({
            evaluationId,
            providerId: provider.id,
            model: provider.model,
            testCaseIndex,
            input: testCase.input,
            output: "",
            tokensUsed: 0,
            latencyMs: 0,
            cost: 0,
            quality: 0, // Failed test gets 0 quality score
          });

          failedTests++;
        }
      },
      MAX_CONCURRENT_REQUESTS
    );

    // Update evaluation status to completed
    await db.updateEvaluation(evaluationId, {
      status: "completed",
      completedAt: new Date(),
    });

    const avgLatency = completedTests > 0 ? totalLatency / completedTests : 0;

    console.log(
      `[EvaluationExecution] Evaluation ${evaluationId} completed - ` +
      `${completedTests}/${totalTests} tests successful, Total cost: $${totalCost.toFixed(4)}`
    );

    return {
      evaluationId,
      totalTests,
      completedTests,
      failedTests,
      totalCost,
      avgLatency,
    };
  } catch (error) {
    console.error(`[EvaluationExecution] Evaluation ${evaluationId} failed:`, error);

    // Update evaluation status to failed
    await db.updateEvaluation(evaluationId, {
      status: "failed",
      completedAt: new Date(),
    });

    throw error;
  }
}

/**
 * Calculate quality score by comparing output to expected output
 * Uses simple similarity metrics (can be enhanced with more sophisticated NLP)
 */
function calculateQualityScore(output: string, expectedOutput: string): number {
  // Normalize strings
  const normalizedOutput = output.toLowerCase().trim();
  const normalizedExpected = expectedOutput.toLowerCase().trim();

  // Exact match
  if (normalizedOutput === normalizedExpected) {
    return 100;
  }

  // Calculate similarity using Levenshtein distance
  const distance = levenshteinDistance(normalizedOutput, normalizedExpected);
  const maxLength = Math.max(normalizedOutput.length, normalizedExpected.length);
  
  if (maxLength === 0) return 100;
  
  const similarity = (1 - distance / maxLength) * 100;
  
  return Math.max(0, Math.min(100, similarity));
}

/**
 * Calculate Levenshtein distance between two strings
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get evaluation job status
 */
export function getEvaluationJobStatus(jobId: string) {
  return jobQueue.getJob(jobId);
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  return jobQueue.getStats();
}

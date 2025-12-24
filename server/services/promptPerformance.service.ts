/**
 * Prompt Performance Service
 * Analytics for response times, token usage, and cost comparisons
 */

import { getDb } from "../db";
import { prompts, promptVersions, evaluations, evaluationResults, aiProviders } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

interface PerformanceMetrics {
  promptId: string;
  promptName: string;
  totalRuns: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgTokensUsed: number;
  totalTokensUsed: number;
  avgCost: number;
  totalCost: number;
  successRate: number;
  providerBreakdown: ProviderMetrics[];
  dailyTrends: DailyTrend[];
}

interface ProviderMetrics {
  providerId: string;
  providerName: string;
  model: string;
  runs: number;
  avgResponseTime: number;
  avgTokens: number;
  avgCost: number;
  successRate: number;
}

interface DailyTrend {
  date: string;
  runs: number;
  avgResponseTime: number;
  avgTokens: number;
  totalCost: number;
}

interface WorkspacePerformanceSummary {
  totalPrompts: number;
  totalRuns: number;
  avgResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  topPerformingPrompts: Array<{
    promptId: string;
    promptName: string;
    avgResponseTime: number;
    successRate: number;
  }>;
  providerComparison: Array<{
    providerId: string;
    providerName: string;
    avgResponseTime: number;
    avgCostPer1kTokens: number;
    totalRuns: number;
  }>;
}

export const promptPerformanceService = {
  /**
   * Get performance metrics for a specific prompt
   */
  async getPromptMetrics(
    workspaceId: string,
    promptId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics | null> {
    const db = await getDb();
    if (!db) return null;

    // Get prompt info
    const promptResults = await db
      .select()
      .from(prompts)
      .where(and(
        eq(prompts.id, promptId),
        eq(prompts.organizationId, workspaceId)
      ))
      .limit(1);
    const prompt = promptResults[0];

    if (!prompt) return null;

    // Build date filter
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(evaluationResults.createdAt, startDate));
    }
    if (endDate) {
      dateFilters.push(lte(evaluationResults.createdAt, endDate));
    }

    // Get evaluation results for this prompt
    const results = await db
      .select({
        id: evaluationResults.id,
        providerId: evaluationResults.providerId,
        latencyMs: evaluationResults.latencyMs,
        tokensUsed: evaluationResults.tokensUsed,
        cost: evaluationResults.cost,
        quality: evaluationResults.quality,
        createdAt: evaluationResults.createdAt
      })
      .from(evaluationResults)
      .innerJoin(evaluations, eq(evaluationResults.evaluationId, evaluations.id))
      .where(and(
        eq(evaluations.promptId, promptId),
        eq(evaluations.organizationId, workspaceId),
        ...dateFilters
      ))
      .orderBy(desc(evaluationResults.createdAt));

    if (results.length === 0) {
      return {
        promptId,
        promptName: prompt.name,
        totalRuns: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        avgTokensUsed: 0,
        totalTokensUsed: 0,
        avgCost: 0,
        totalCost: 0,
        successRate: 0,
        providerBreakdown: [],
        dailyTrends: []
      };
    }

    // Calculate metrics
    const responseTimes = results.map(r => r.latencyMs || 0).filter(t => t > 0);
    const tokens = results.map(r => r.tokensUsed || 0);
    const costs = results.map(r => Number(r.cost) || 0);
    const passedCount = results.filter(r => (r.quality || 0) >= 80).length;

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const totalTokens = tokens.reduce((a, b) => a + b, 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);

    // Get provider breakdown
    const providerMap = new Map<string, {
      runs: number;
      responseTimes: number[];
      tokens: number[];
      costs: number[];
      passed: number;
    }>();

    for (const result of results) {
      const providerId = result.providerId || "unknown";
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          runs: 0,
          responseTimes: [],
          tokens: [],
          costs: [],
          passed: 0
        });
      }
      const provider = providerMap.get(providerId)!;
      provider.runs++;
      if (result.latencyMs) provider.responseTimes.push(result.latencyMs);
      if (result.tokensUsed) provider.tokens.push(result.tokensUsed);
      if (result.cost) provider.costs.push(Number(result.cost));
      if ((result.quality || 0) >= 80) provider.passed++;
    }

    // Get provider names
    const providerIds = Array.from(providerMap.keys()).filter(id => id !== "unknown");
    const providers = providerIds.length > 0 
      ? await db.select().from(aiProviders).where(
          sql`${aiProviders.id} IN (${sql.join(providerIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];

    const providerNameMap = new Map(providers.map(p => [p.id, { name: p.name, model: p.model }]));

    const providerBreakdown: ProviderMetrics[] = Array.from(providerMap.entries()).map(([providerId, data]) => {
      const providerInfo = providerNameMap.get(providerId);
      return {
        providerId,
        providerName: providerInfo?.name || "Unknown",
        model: providerInfo?.model || "Unknown",
        runs: data.runs,
        avgResponseTime: data.responseTimes.length > 0 
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length 
          : 0,
        avgTokens: data.tokens.length > 0 
          ? data.tokens.reduce((a, b) => a + b, 0) / data.tokens.length 
          : 0,
        avgCost: data.costs.length > 0 
          ? data.costs.reduce((a, b) => a + b, 0) / data.costs.length 
          : 0,
        successRate: data.runs > 0 ? (data.passed / data.runs) * 100 : 0
      };
    });

    // Calculate daily trends
    const dailyMap = new Map<string, {
      runs: number;
      responseTimes: number[];
      tokens: number[];
      costs: number[];
    }>();

    for (const result of results) {
      const date = result.createdAt ? result.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { runs: 0, responseTimes: [], tokens: [], costs: [] });
      }
      const day = dailyMap.get(date)!;
      day.runs++;
      if (result.latencyMs) day.responseTimes.push(result.latencyMs);
      if (result.tokensUsed) day.tokens.push(result.tokensUsed);
      if (result.cost) day.costs.push(Number(result.cost));
    }

    const dailyTrends: DailyTrend[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        runs: data.runs,
        avgResponseTime: data.responseTimes.length > 0 
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length 
          : 0,
        avgTokens: data.tokens.length > 0 
          ? data.tokens.reduce((a, b) => a + b, 0) / data.tokens.length 
          : 0,
        totalCost: data.costs.reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      promptId,
      promptName: prompt.name,
      totalRuns: results.length,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      avgTokensUsed: totalTokens / results.length,
      totalTokensUsed: totalTokens,
      avgCost: totalCost / results.length,
      totalCost,
      successRate: (passedCount / results.length) * 100,
      providerBreakdown,
      dailyTrends
    };
  },

  /**
   * Get workspace-wide performance summary
   */
  async getWorkspaceSummary(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkspacePerformanceSummary> {
    const db = await getDb();
    if (!db) {
      return {
        totalPrompts: 0,
        totalRuns: 0,
        avgResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        topPerformingPrompts: [],
        providerComparison: []
      };
    }

    // Get all prompts in workspace
    const workspacePrompts = await db
      .select({ id: prompts.id, name: prompts.name })
      .from(prompts)
      .where(eq(prompts.organizationId, workspaceId));

    if (workspacePrompts.length === 0) {
      return {
        totalPrompts: 0,
        totalRuns: 0,
        avgResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        topPerformingPrompts: [],
        providerComparison: []
      };
    }

    // Build date filter
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(evaluationResults.createdAt, startDate));
    }
    if (endDate) {
      dateFilters.push(lte(evaluationResults.createdAt, endDate));
    }

    // Get all evaluation results
    const results = await db
      .select({
        promptId: evaluations.promptId,
        providerId: evaluationResults.providerId,
        responseTime: evaluationResults.latencyMs,
        tokensUsed: evaluationResults.tokensUsed,
        cost: evaluationResults.cost,
        passed: evaluationResults.quality
      })
      .from(evaluationResults)
      .innerJoin(evaluations, eq(evaluationResults.evaluationId, evaluations.id))
      .where(and(
        eq(evaluations.organizationId, workspaceId),
        ...dateFilters
      ));

    if (results.length === 0) {
      return {
        totalPrompts: workspacePrompts.length,
        totalRuns: 0,
        avgResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        topPerformingPrompts: [],
        providerComparison: []
      };
    }

    // Calculate overall metrics
    const responseTimes = results.map(r => r.responseTime || 0).filter(t => t > 0);
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Calculate per-prompt metrics
    const promptMetrics = new Map<string, {
      responseTimes: number[];
      passed: number;
      total: number;
    }>();

    for (const result of results) {
      if (!result.promptId) continue;
      if (!promptMetrics.has(result.promptId)) {
        promptMetrics.set(result.promptId, { responseTimes: [], passed: 0, total: 0 });
      }
      const metrics = promptMetrics.get(result.promptId)!;
      metrics.total++;
      if (result.responseTime) metrics.responseTimes.push(result.responseTime);
      if (result.passed) metrics.passed++;
    }

    const promptNameMap = new Map(workspacePrompts.map(p => [p.id, p.name]));

    const topPerformingPrompts = Array.from(promptMetrics.entries())
      .map(([promptId, data]) => ({
        promptId,
        promptName: promptNameMap.get(promptId) || "Unknown",
        avgResponseTime: data.responseTimes.length > 0 
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length 
          : 0,
        successRate: data.total > 0 ? (data.passed / data.total) * 100 : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    // Calculate provider comparison
    const providerMetrics = new Map<string, {
      responseTimes: number[];
      tokens: number[];
      costs: number[];
      runs: number;
    }>();

    for (const result of results) {
      const providerId = result.providerId || "unknown";
      if (!providerMetrics.has(providerId)) {
        providerMetrics.set(providerId, { responseTimes: [], tokens: [], costs: [], runs: 0 });
      }
      const metrics = providerMetrics.get(providerId)!;
      metrics.runs++;
      if (result.responseTime) metrics.responseTimes.push(result.responseTime);
      if (result.tokensUsed) metrics.tokens.push(result.tokensUsed);
      if (result.cost) metrics.costs.push(Number(result.cost));
    }

    // Get provider names
    const providerIds = Array.from(providerMetrics.keys()).filter(id => id !== "unknown");
    const providers = providerIds.length > 0 
      ? await db.select().from(aiProviders).where(
          sql`${aiProviders.id} IN (${sql.join(providerIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];

    const providerNameMap = new Map(providers.map(p => [p.id, p.name]));

    const providerComparison = Array.from(providerMetrics.entries())
      .filter(([id]) => id !== "unknown")
      .map(([providerId, data]) => {
        const totalTokens = data.tokens.reduce((a, b) => a + b, 0);
        const totalCosts = data.costs.reduce((a, b) => a + b, 0);
        return {
          providerId,
          providerName: providerNameMap.get(providerId) || "Unknown",
          avgResponseTime: data.responseTimes.length > 0 
            ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length 
            : 0,
          avgCostPer1kTokens: totalTokens > 0 ? (totalCosts / totalTokens) * 1000 : 0,
          totalRuns: data.runs
        };
      })
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime);

    return {
      totalPrompts: workspacePrompts.length,
      totalRuns: results.length,
      avgResponseTime,
      totalTokensUsed: totalTokens,
      totalCost,
      topPerformingPrompts,
      providerComparison
    };
  },

  /**
   * Get token usage trends over time
   */
  async getTokenUsageTrends(
    workspaceId: string,
    days: number = 30
  ): Promise<Array<{ date: string; tokens: number; cost: number; runs: number }>> {
    const db = await getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (!db) return [];

    const results = await db
      .select({
        tokensUsed: evaluationResults.tokensUsed,
        cost: evaluationResults.cost,
        createdAt: evaluationResults.createdAt
      })
      .from(evaluationResults)
      .innerJoin(evaluations, eq(evaluationResults.evaluationId, evaluations.id))
      .where(and(
        eq(evaluations.organizationId, workspaceId),
        gte(evaluationResults.createdAt, startDate)
      ))
      .orderBy(evaluationResults.createdAt);

    // Aggregate by day
    const dailyMap = new Map<string, { tokens: number; cost: number; runs: number }>();

    for (const result of results) {
      const date = result.createdAt ? result.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { tokens: 0, cost: 0, runs: 0 });
      }
      const day = dailyMap.get(date)!;
      day.tokens += result.tokensUsed || 0;
      day.cost += Number(result.cost) || 0;
      day.runs++;
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
};

export type { PerformanceMetrics, ProviderMetrics, DailyTrend, WorkspacePerformanceSummary };

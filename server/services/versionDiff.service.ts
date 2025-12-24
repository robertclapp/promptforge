/**
 * Version Diff Service
 * Compares prompt versions and generates diff information
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { promptVersions, evaluationResults, evaluations } from "../../drizzle/schema";

export interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
  lineNumber?: number;
}

export interface VersionDiff {
  leftVersion: {
    id: string;
    version: number;
    content: string;
    variables: string[];
    changeMessage: string | null;
    createdAt: Date | null;
  };
  rightVersion: {
    id: string;
    version: number;
    content: string;
    variables: string[];
    changeMessage: string | null;
    createdAt: Date | null;
  };
  contentDiff: DiffLine[];
  variablesDiff: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  metrics?: {
    left: VersionMetrics | null;
    right: VersionMetrics | null;
  };
}

export interface VersionMetrics {
  avgLatency: number;
  avgQuality: number;
  avgTokens: number;
  totalRuns: number;
}

/**
 * Simple line-by-line diff algorithm
 */
function computeLineDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = computeLCS(leftLines, rightLines);
  
  let leftIdx = 0;
  let rightIdx = 0;
  let lcsIdx = 0;

  while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
    if (lcsIdx < lcs.length && leftIdx < leftLines.length && leftLines[leftIdx] === lcs[lcsIdx]) {
      if (rightIdx < rightLines.length && rightLines[rightIdx] === lcs[lcsIdx]) {
        result.push({ type: "unchanged", content: lcs[lcsIdx], lineNumber: leftIdx + 1 });
        leftIdx++;
        rightIdx++;
        lcsIdx++;
      } else if (rightIdx < rightLines.length) {
        result.push({ type: "added", content: rightLines[rightIdx], lineNumber: rightIdx + 1 });
        rightIdx++;
      }
    } else if (leftIdx < leftLines.length) {
      result.push({ type: "removed", content: leftLines[leftIdx], lineNumber: leftIdx + 1 });
      leftIdx++;
    } else if (rightIdx < rightLines.length) {
      result.push({ type: "added", content: rightLines[rightIdx], lineNumber: rightIdx + 1 });
      rightIdx++;
    }
  }

  return result;
}

/**
 * Compute Longest Common Subsequence
 */
function computeLCS(left: string[], right: string[]): string[] {
  const m = left.length;
  const n = right.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift(left[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Compare variables between versions
 */
function compareVariables(
  leftVars: string[],
  rightVars: string[]
): { added: string[]; removed: string[]; unchanged: string[] } {
  const leftSet = new Set(leftVars);
  const rightSet = new Set(rightVars);

  const added = rightVars.filter((v) => !leftSet.has(v));
  const removed = leftVars.filter((v) => !rightSet.has(v));
  const unchanged = leftVars.filter((v) => rightSet.has(v));

  return { added, removed, unchanged };
}

/**
 * Get performance metrics for a prompt version
 */
async function getVersionMetrics(
  promptId: string,
  version: number
): Promise<VersionMetrics | null> {
  const db = await getDb();
  if (!db) return null;

  // Get evaluations for this prompt
  const evals = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.promptId, promptId));

  if (evals.length === 0) return null;

  const evalIds = evals.map((e) => e.id);

  // Get results for these evaluations
  const results = await db
    .select()
    .from(evaluationResults)
    .where(eq(evaluationResults.evaluationId, evalIds[0])); // Simplified for now

  if (results.length === 0) return null;

  const avgLatency =
    results.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / results.length;
  const avgQuality =
    results.reduce((sum, r) => sum + (r.quality || 0), 0) / results.length;
  const avgTokens =
    results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0) / results.length;

  return {
    avgLatency: Math.round(avgLatency),
    avgQuality: Math.round(avgQuality),
    avgTokens: Math.round(avgTokens),
    totalRuns: results.length,
  };
}

/**
 * Get all versions for a prompt
 */
export async function getPromptVersions(promptId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const versions = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.promptId, promptId))
    .orderBy(desc(promptVersions.version));

  return versions.map((v) => ({
    id: v.id,
    version: v.version,
    content: v.content,
    variables: (v.variables as string[]) || [],
    changeMessage: v.changeMessage,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
  }));
}

/**
 * Get a specific version
 */
export async function getVersion(versionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const version = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.id, versionId))
    .limit(1);

  if (!version[0]) return null;

  return {
    id: version[0].id,
    promptId: version[0].promptId,
    version: version[0].version,
    content: version[0].content,
    variables: (version[0].variables as string[]) || [],
    changeMessage: version[0].changeMessage,
    createdAt: version[0].createdAt,
    createdBy: version[0].createdBy,
  };
}

/**
 * Compare two versions of a prompt
 */
export async function compareVersions(
  leftVersionId: string,
  rightVersionId: string,
  includeMetrics: boolean = false
): Promise<VersionDiff> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get both versions
  const [leftResult, rightResult] = await Promise.all([
    db.select().from(promptVersions).where(eq(promptVersions.id, leftVersionId)).limit(1),
    db.select().from(promptVersions).where(eq(promptVersions.id, rightVersionId)).limit(1),
  ]);

  const left = leftResult[0];
  const right = rightResult[0];

  if (!left || !right) {
    throw new Error("One or both versions not found");
  }

  // Compute content diff
  const contentDiff = computeLineDiff(left.content, right.content);

  // Compare variables
  const leftVars = (left.variables as string[]) || [];
  const rightVars = (right.variables as string[]) || [];
  const variablesDiff = compareVariables(leftVars, rightVars);

  // Get metrics if requested
  let metrics: { left: VersionMetrics | null; right: VersionMetrics | null } | undefined;
  if (includeMetrics) {
    const [leftMetrics, rightMetrics] = await Promise.all([
      getVersionMetrics(left.promptId, left.version),
      getVersionMetrics(right.promptId, right.version),
    ]);
    metrics = { left: leftMetrics, right: rightMetrics };
  }

  return {
    leftVersion: {
      id: left.id,
      version: left.version,
      content: left.content,
      variables: leftVars,
      changeMessage: left.changeMessage,
      createdAt: left.createdAt,
    },
    rightVersion: {
      id: right.id,
      version: right.version,
      content: right.content,
      variables: rightVars,
      changeMessage: right.changeMessage,
      createdAt: right.createdAt,
    },
    contentDiff,
    variablesDiff,
    metrics,
  };
}

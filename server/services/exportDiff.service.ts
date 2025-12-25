import { getDb } from "../db";
import { exportVersions, importExportHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Types for diff results
export interface PromptDiff {
  id: string;
  name: string;
  status: "added" | "removed" | "modified" | "unchanged";
  oldValue?: {
    content: string;
    description?: string;
    variables?: Record<string, unknown>[];
    version?: string;
  };
  newValue?: {
    content: string;
    description?: string;
    variables?: Record<string, unknown>[];
    version?: string;
  };
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface ExportDiffResult {
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    total: number;
  };
  prompts: PromptDiff[];
  metadata: {
    version1: {
      id: string;
      versionNumber: number;
      createdAt: Date | null;
      fileSize: number | null;
    };
    version2: {
      id: string;
      versionNumber: number;
      createdAt: Date | null;
      fileSize: number | null;
    };
  };
}

// Parse export content from S3 URL
async function fetchExportContent(url: string): Promise<{
  prompts: Array<{
    id: string;
    name: string;
    content: string;
    description?: string;
    variables?: Record<string, unknown>[];
    version?: string;
  }>;
}> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch export: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Handle gzip compressed content
    let content: string;
    if (url.endsWith('.gz')) {
      const { gunzipSync } = await import('zlib');
      const buffer = Buffer.from(text, 'binary');
      content = gunzipSync(buffer).toString('utf-8');
    } else {
      content = text;
    }
    
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    console.error('Error fetching export content:', error);
    throw error;
  }
}

// Calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Quick check for very different lengths
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) {
    return 0;
  }
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

// Find field-level changes between two prompts
function findFieldChanges(
  oldPrompt: Record<string, unknown>,
  newPrompt: Record<string, unknown>
): { field: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  const fieldsToCompare = ['content', 'description', 'systemPrompt', 'model', 'temperature'];
  
  for (const field of fieldsToCompare) {
    const oldVal = oldPrompt[field];
    const newVal = newPrompt[field];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        oldValue: typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal || ''),
        newValue: typeof newVal === 'string' ? newVal : JSON.stringify(newVal || ''),
      });
    }
  }
  
  // Compare variables array
  const oldVars = JSON.stringify(oldPrompt.variables || []);
  const newVars = JSON.stringify(newPrompt.variables || []);
  if (oldVars !== newVars) {
    changes.push({
      field: 'variables',
      oldValue: oldVars,
      newValue: newVars,
    });
  }
  
  return changes;
}

// Compare two export versions
export async function compareExportVersions(
  userId: string,
  version1Id: string,
  version2Id: string
): Promise<ExportDiffResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Fetch version metadata
  const [v1, v2] = await Promise.all([
    db.select().from(exportVersions).where(
      and(eq(exportVersions.id, version1Id), eq(exportVersions.userId, userId))
    ).then(r => r[0]),
    db.select().from(exportVersions).where(
      and(eq(exportVersions.id, version2Id), eq(exportVersions.userId, userId))
    ).then(r => r[0]),
  ]);
  
  if (!v1 || !v2) {
    throw new Error("One or both versions not found");
  }
  
  if (!v1.exportUrl || !v2.exportUrl) {
    throw new Error("Version file URLs not available");
  }
  
  // Fetch export contents
  const [content1, content2] = await Promise.all([
    fetchExportContent(v1.exportUrl),
    fetchExportContent(v2.exportUrl),
  ]);
  
  // Create maps for easy lookup
  const promptMap1 = new Map(content1.prompts.map(p => [p.id, p]));
  const promptMap2 = new Map(content2.prompts.map(p => [p.id, p]));
  
  const allPromptIds = new Set([...Array.from(promptMap1.keys()), ...Array.from(promptMap2.keys())]);
  
  const prompts: PromptDiff[] = [];
  let added = 0, removed = 0, modified = 0, unchanged = 0;
  
  for (const id of Array.from(allPromptIds)) {
    const p1 = promptMap1.get(id);
    const p2 = promptMap2.get(id);
    
    if (!p1 && p2) {
      // Added in version 2
      prompts.push({
        id,
        name: p2.name,
        status: "added",
        newValue: {
          content: p2.content,
          description: p2.description,
          variables: p2.variables,
          version: p2.version,
        },
      });
      added++;
    } else if (p1 && !p2) {
      // Removed in version 2
      prompts.push({
        id,
        name: p1.name,
        status: "removed",
        oldValue: {
          content: p1.content,
          description: p1.description,
          variables: p1.variables,
          version: p1.version,
        },
      });
      removed++;
    } else if (p1 && p2) {
      // Check if modified
      const changes = findFieldChanges(
        p1 as unknown as Record<string, unknown>,
        p2 as unknown as Record<string, unknown>
      );
      
      if (changes.length > 0) {
        prompts.push({
          id,
          name: p2.name,
          status: "modified",
          oldValue: {
            content: p1.content,
            description: p1.description,
            variables: p1.variables,
            version: p1.version,
          },
          newValue: {
            content: p2.content,
            description: p2.description,
            variables: p2.variables,
            version: p2.version,
          },
          changes,
        });
        modified++;
      } else {
        prompts.push({
          id,
          name: p2.name,
          status: "unchanged",
          oldValue: {
            content: p1.content,
            description: p1.description,
            variables: p1.variables,
            version: p1.version,
          },
          newValue: {
            content: p2.content,
            description: p2.description,
            variables: p2.variables,
            version: p2.version,
          },
        });
        unchanged++;
      }
    }
  }
  
  // Sort prompts: modified first, then added, then removed, then unchanged
  const statusOrder = { modified: 0, added: 1, removed: 2, unchanged: 3 };
  prompts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  
  return {
    summary: {
      added,
      removed,
      modified,
      unchanged,
      total: allPromptIds.size,
    },
    prompts,
    metadata: {
      version1: {
        id: v1.id,
        versionNumber: v1.versionNumber,
        createdAt: v1.createdAt,
        fileSize: v1.exportFileSize,
      },
      version2: {
        id: v2.id,
        versionNumber: v2.versionNumber,
        createdAt: v2.createdAt,
        fileSize: v2.exportFileSize,
      },
    },
  };
}

// Get available versions for comparison
export async function getVersionsForComparison(
  userId: string,
  exportHistoryId?: string
): Promise<{
  id: string;
  versionNumber: number;
  createdAt: Date | null;
  fileSize: number | null;
  promptCount: number | null;
  description: string | null;
}[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select({
    id: exportVersions.id,
    versionNumber: exportVersions.versionNumber,
    createdAt: exportVersions.createdAt,
    fileSize: exportVersions.exportFileSize,
    promptCount: exportVersions.promptCount,
    description: exportVersions.description,
  })
  .from(exportVersions)
  .where(eq(exportVersions.userId, userId))
  .orderBy(desc(exportVersions.versionNumber))
  .limit(50);
  
  return query;
}

// Generate inline diff for text content
export function generateInlineDiff(
  oldText: string,
  newText: string
): { type: "unchanged" | "added" | "removed"; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result: { type: "unchanged" | "added" | "removed"; text: string }[] = [];
  
  // Simple line-by-line diff
  const maxLen = Math.max(oldLines.length, newLines.length);
  
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // Remaining new lines are additions
      result.push({ type: "added", text: newLines[j] });
      j++;
    } else if (j >= newLines.length) {
      // Remaining old lines are removals
      result.push({ type: "removed", text: oldLines[i] });
      i++;
    } else if (oldLines[i] === newLines[j]) {
      // Lines match
      result.push({ type: "unchanged", text: oldLines[i] });
      i++;
      j++;
    } else {
      // Lines differ - check if it's a modification or add/remove
      const similarity = calculateSimilarity(oldLines[i], newLines[j]);
      
      if (similarity > 0.5) {
        // Similar enough to be a modification
        result.push({ type: "removed", text: oldLines[i] });
        result.push({ type: "added", text: newLines[j] });
        i++;
        j++;
      } else {
        // Check if old line exists later in new
        const oldInNew = newLines.slice(j).indexOf(oldLines[i]);
        const newInOld = oldLines.slice(i).indexOf(newLines[j]);
        
        if (oldInNew === -1 && newInOld === -1) {
          // Neither found, treat as modification
          result.push({ type: "removed", text: oldLines[i] });
          result.push({ type: "added", text: newLines[j] });
          i++;
          j++;
        } else if (oldInNew !== -1 && (newInOld === -1 || oldInNew <= newInOld)) {
          // Old line found in new, add new lines until we reach it
          result.push({ type: "added", text: newLines[j] });
          j++;
        } else {
          // New line found in old, remove old lines until we reach it
          result.push({ type: "removed", text: oldLines[i] });
          i++;
        }
      }
    }
  }
  
  return result;
}

// Get diff statistics for a specific prompt
export function getPromptDiffStats(diff: PromptDiff): {
  linesAdded: number;
  linesRemoved: number;
  fieldsChanged: number;
} {
  let linesAdded = 0;
  let linesRemoved = 0;
  
  if (diff.status === "added" && diff.newValue) {
    linesAdded = diff.newValue.content.split('\n').length;
  } else if (diff.status === "removed" && diff.oldValue) {
    linesRemoved = diff.oldValue.content.split('\n').length;
  } else if (diff.status === "modified" && diff.oldValue && diff.newValue) {
    const inlineDiff = generateInlineDiff(diff.oldValue.content, diff.newValue.content);
    linesAdded = inlineDiff.filter(d => d.type === "added").length;
    linesRemoved = inlineDiff.filter(d => d.type === "removed").length;
  }
  
  return {
    linesAdded,
    linesRemoved,
    fieldsChanged: diff.changes?.length || 0,
  };
}

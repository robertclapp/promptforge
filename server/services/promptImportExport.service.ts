/**
 * Prompt Import/Export Service
 * Handles bulk import and export of prompts in JSON format
 */

import { getDb } from "../db";
import { prompts, promptVersions } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { storagePut, storageGet } from "../storage";
import { gzipSync, gunzipSync } from "zlib";
import { createEncryptedExport, decryptExportPackage, isEncryptedExport } from "./exportEncryption.service";

// Export format version for compatibility
const EXPORT_FORMAT_VERSION = "1.0";

export interface ExportedPrompt {
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  isPublic: boolean;
  versions: {
    versionNumber: number;
    content: string;
    systemPrompt: string | null;
    commitMessage: string | null;
    isActive: boolean;
    variables: {
      name: string;
      type: string;
      defaultValue: string | null;
      description: string | null;
      required: boolean;
    }[];
  }[];
}

export interface ExportPackage {
  formatVersion: string;
  exportedAt: string;
  exportedBy: string;
  workspaceName: string;
  promptCount: number;
  prompts: ExportedPrompt[];
  isCompressed?: boolean;
  isEncrypted?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Export prompts to JSON format
 */
export async function exportPrompts(params: {
  organizationId?: string;
  promptIds?: string[];
  userId: string;
  userName?: string;
  workspaceName?: string;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  encryptionPassword?: string;
}): Promise<{ url: string; filename: string; size: number; promptCount: number; versionCount: number; isCompressed: boolean; isEncrypted: boolean }> {
  const { organizationId, promptIds, userId, userName = "Unknown", workspaceName = "Default Workspace", enableCompression = false, enableEncryption = false, encryptionPassword } = params;
  
  // Validate encryption parameters
  if (enableEncryption && !encryptionPassword) {
    throw new Error("Encryption password is required when encryption is enabled");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get prompts to export
  let promptsToExport;
  if (!promptIds || promptIds.length === 0) {
    // Export all prompts for the user/organization
    if (organizationId) {
      promptsToExport = await db
        .select()
        .from(prompts)
        .where(eq(prompts.organizationId, organizationId));
    } else {
      promptsToExport = await db
        .select()
        .from(prompts)
        .where(eq(prompts.userId, userId));
    }
  } else {
    promptsToExport = await db
      .select()
      .from(prompts)
      .where(inArray(prompts.id, promptIds));
  }

  if (promptsToExport.length === 0) {
    throw new Error("No prompts found to export");
  }

  // Build export package
  const exportedPrompts: ExportedPrompt[] = [];

  for (const prompt of promptsToExport) {
    // Get all versions for this prompt
    const versions = await db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, prompt.id));

    const exportedVersions = [];

    for (const version of versions) {
      // Parse variables from JSON
      const variableNames = version.variables || [];

      exportedVersions.push({
        versionNumber: version.version,
        content: version.content,
        systemPrompt: null,
        commitMessage: version.changeMessage,
        isActive: false,
        variables: variableNames.map((name: string) => ({
          name,
          type: "string",
          defaultValue: null,
          description: null,
          required: false,
        })),
      });
    }

    // Get tags from prompt
    const tags: string[] = prompt.tags || [];

    exportedPrompts.push({
      name: prompt.name,
      description: prompt.description,
      category: null,
      tags,
      isPublic: prompt.isPublic ?? false,
      versions: exportedVersions.sort((a, b) => a.versionNumber - b.versionNumber),
    });
  }

  const exportPackage: ExportPackage = {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: userName,
    workspaceName,
    promptCount: exportedPrompts.length,
    prompts: exportedPrompts,
  };

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseFilename = `promptforge-export-${timestamp}`;
  
  // Prepare content - optionally encrypt and/or compress
  let jsonContent = JSON.stringify(exportPackage, null, 2);
  let uploadContent: Buffer;
  let filename: string;
  let contentType: string;
  let actuallyEncrypted = false;
  
  // Apply encryption first if enabled
  if (enableEncryption && encryptionPassword) {
    const { encryptedPackage } = createEncryptedExport(jsonContent, encryptionPassword);
    jsonContent = encryptedPackage;
    actuallyEncrypted = true;
  }
  
  // Then apply compression if enabled
  if (enableCompression) {
    // Compress with gzip
    uploadContent = gzipSync(Buffer.from(jsonContent));
    filename = actuallyEncrypted 
      ? `${baseFilename}.encrypted.json.gz`
      : `${baseFilename}.json.gz`;
    contentType = "application/gzip";
  } else {
    uploadContent = Buffer.from(jsonContent);
    filename = actuallyEncrypted
      ? `${baseFilename}.encrypted.json`
      : `${baseFilename}.json`;
    contentType = "application/json";
  }

  // Upload to S3
  const { url } = await storagePut(
    `exports/${organizationId || userId}/${filename}`,
    uploadContent,
    contentType
  );

  // Calculate total version count
  let totalVersionCount = 0;
  for (const prompt of exportedPrompts) {
    totalVersionCount += prompt.versions.length;
  }

  return { 
    url, 
    filename, 
    size: uploadContent.length,
    promptCount: exportedPrompts.length,
    versionCount: totalVersionCount,
    isCompressed: enableCompression,
    isEncrypted: actuallyEncrypted
  };
}

/**
 * Validate import package format
 */
function validateImportPackage(data: any): data is ExportPackage {
  if (!data || typeof data !== "object") return false;
  if (!data.formatVersion || !data.prompts || !Array.isArray(data.prompts)) return false;

  for (const prompt of data.prompts) {
    if (!prompt.name || typeof prompt.name !== "string") return false;
    if (!prompt.versions || !Array.isArray(prompt.versions)) return false;
    if (prompt.versions.length === 0) return false;

    for (const version of prompt.versions) {
      if (typeof version.content !== "string") return false;
    }
  }

  return true;
}

/**
 * Import prompts from JSON format
 */
/**
 * Decompress gzipped content if needed
 */
function decompressIfNeeded(content: string | Buffer): string {
  // Check if content is a Buffer (binary data)
  if (Buffer.isBuffer(content)) {
    // Check for gzip magic number (1f 8b)
    if (content[0] === 0x1f && content[1] === 0x8b) {
      const decompressed = gunzipSync(content);
      return decompressed.toString('utf-8');
    }
    return content.toString('utf-8');
  }
  
  // If it's a string, try to detect if it's base64 encoded gzip
  if (typeof content === 'string') {
    // Try to parse as JSON first
    try {
      JSON.parse(content);
      return content; // Already valid JSON
    } catch {
      // Try base64 decode and decompress
      try {
        const buffer = Buffer.from(content, 'base64');
        if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
          const decompressed = gunzipSync(buffer);
          return decompressed.toString('utf-8');
        }
      } catch {
        // Not base64 encoded gzip, return as is
      }
      return content;
    }
  }
  
  return String(content);
}

export async function importPrompts(
  organizationId: string,
  userId: string,
  jsonContent: string | Buffer,
  options: {
    overwriteExisting?: boolean;
    prefix?: string;
    decryptionPassword?: string;
  } = {}
): Promise<ImportResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { overwriteExisting = false, prefix = "", decryptionPassword } = options;

  // Decompress if needed and parse
  let importData: ExportPackage;
  try {
    let decompressedContent = decompressIfNeeded(jsonContent);
    
    // Check if content is encrypted and decrypt if password provided
    if (isEncryptedExport(decompressedContent)) {
      if (!decryptionPassword) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          errors: ["This export file is encrypted. Please provide the decryption password."],
        };
      }
      try {
        decompressedContent = decryptExportPackage(decompressedContent, decryptionPassword);
      } catch (decryptError) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          errors: ["Failed to decrypt the export file. Please check your password."],
        };
      }
    }
    
    importData = JSON.parse(decompressedContent);
  } catch (e) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ["Invalid JSON format"],
    };
  }

  if (!validateImportPackage(importData)) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: ["Invalid export package format"],
    };
  }

  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const promptData of importData.prompts) {
    try {
      const promptName = prefix ? `${prefix}${promptData.name}` : promptData.name;

      // Check if prompt with same name exists
      const existing = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.organizationId, organizationId),
            eq(prompts.name, promptName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        if (overwriteExisting) {
          // Delete existing prompt and its versions
          const existingPrompt = existing[0];
          await db.delete(promptVersions).where(eq(promptVersions.promptId, existingPrompt.id));
          await db.delete(prompts).where(eq(prompts.id, existingPrompt.id));
        } else {
          result.skipped++;
          continue;
        }
      }

      // Create new prompt
      const newPromptId = crypto.randomUUID();
      await db.insert(prompts).values({
        id: newPromptId,
        userId,
        organizationId,
        name: promptName,
        description: promptData.description,
        content: promptData.versions[0]?.content || "",
        variables: promptData.versions[0]?.variables?.map(v => v.name) || [],
        tags: promptData.tags || [] as string[],
        folderPath: "/",
        isPublic: promptData.isPublic,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create versions
      for (const versionData of promptData.versions) {
        const newVersionId = crypto.randomUUID();
        await db.insert(promptVersions).values({
          id: newVersionId,
          promptId: newPromptId,
          version: versionData.versionNumber,
          content: versionData.content,
          variables: versionData.variables?.map(v => v.name) || [],
          changeMessage: versionData.commitMessage || "Imported",
          createdBy: userId,
          createdAt: new Date(),
        });

        // Variables are stored in the version's variables JSON field
      }

      result.imported++;
    } catch (error) {
      result.errors.push(`Failed to import "${promptData.name}": ${error}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Get export history for a workspace
 */
export async function getExportHistory(
  organizationId: string,
  limit: number = 10
): Promise<{ filename: string; exportedAt: string; url: string }[]> {
  // This would typically query a database table tracking exports
  // For now, return empty array as we don't have that table
  return [];
}

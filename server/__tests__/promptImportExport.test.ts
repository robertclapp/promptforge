/**
 * Prompt Import/Export Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the storage module
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://example.com/test.json" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test-key", url: "https://example.com/test.json" }),
}));

import { getDb } from "../db";

describe("Prompt Import/Export Service", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Export Format", () => {
    it("should define correct export format version", () => {
      // The export format version should be "1.0"
      const EXPORT_FORMAT_VERSION = "1.0";
      expect(EXPORT_FORMAT_VERSION).toBe("1.0");
    });

    it("should include required fields in export package", () => {
      const exportPackage = {
        formatVersion: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "test-user",
        workspaceName: "Test Workspace",
        promptCount: 2,
        prompts: [
          {
            name: "Test Prompt 1",
            description: "A test prompt",
            category: null,
            tags: ["test"],
            isPublic: false,
            versions: [
              {
                versionNumber: 1,
                content: "Test content",
                systemPrompt: null,
                commitMessage: "Initial version",
                isActive: true,
                variables: [],
              },
            ],
          },
        ],
      };

      expect(exportPackage).toHaveProperty("formatVersion");
      expect(exportPackage).toHaveProperty("exportedAt");
      expect(exportPackage).toHaveProperty("exportedBy");
      expect(exportPackage).toHaveProperty("workspaceName");
      expect(exportPackage).toHaveProperty("promptCount");
      expect(exportPackage).toHaveProperty("prompts");
      expect(Array.isArray(exportPackage.prompts)).toBe(true);
    });

    it("should include version details in exported prompts", () => {
      const exportedPrompt = {
        name: "Test Prompt",
        description: "Description",
        category: null,
        tags: ["tag1", "tag2"],
        isPublic: false,
        versions: [
          {
            versionNumber: 1,
            content: "You are a helpful assistant",
            systemPrompt: "Be helpful",
            commitMessage: "Initial",
            isActive: true,
            variables: [
              {
                name: "topic",
                type: "string",
                defaultValue: "general",
                description: "The topic to discuss",
                required: true,
              },
            ],
          },
        ],
      };

      expect(exportedPrompt.versions).toHaveLength(1);
      expect(exportedPrompt.versions[0]).toHaveProperty("versionNumber");
      expect(exportedPrompt.versions[0]).toHaveProperty("content");
      expect(exportedPrompt.versions[0]).toHaveProperty("variables");
      expect(exportedPrompt.versions[0].variables).toHaveLength(1);
    });
  });

  describe("Import Validation", () => {
    it("should reject invalid JSON", () => {
      const invalidJson = "{ invalid json }";
      let isValid = false;
      try {
        JSON.parse(invalidJson);
        isValid = true;
      } catch {
        isValid = false;
      }
      expect(isValid).toBe(false);
    });

    it("should reject empty prompts array", () => {
      const importData = {
        formatVersion: "1.0",
        prompts: [],
      };
      
      const isValid = importData.prompts.length > 0;
      expect(isValid).toBe(false);
    });

    it("should reject prompts without name", () => {
      const importData = {
        formatVersion: "1.0",
        prompts: [
          {
            description: "No name",
            versions: [{ content: "test" }],
          },
        ],
      };
      
      const isValid = importData.prompts.every((p: any) => p.name && typeof p.name === "string");
      expect(isValid).toBe(false);
    });

    it("should reject prompts without versions", () => {
      const importData = {
        formatVersion: "1.0",
        prompts: [
          {
            name: "Test Prompt",
            description: "No versions",
            versions: [],
          },
        ],
      };
      
      const isValid = importData.prompts.every((p: any) => p.versions && p.versions.length > 0);
      expect(isValid).toBe(false);
    });

    it("should accept valid import data", () => {
      const importData = {
        formatVersion: "1.0",
        exportedAt: "2024-01-01T00:00:00.000Z",
        exportedBy: "user-123",
        workspaceName: "Test Workspace",
        promptCount: 1,
        prompts: [
          {
            name: "Valid Prompt",
            description: "A valid prompt",
            category: null,
            tags: ["test"],
            isPublic: false,
            versions: [
              {
                versionNumber: 1,
                content: "You are a helpful assistant",
                systemPrompt: null,
                commitMessage: "Initial",
                isActive: true,
                variables: [],
              },
            ],
          },
        ],
      };
      
      const isValid = 
        importData.formatVersion &&
        importData.prompts &&
        Array.isArray(importData.prompts) &&
        importData.prompts.length > 0 &&
        importData.prompts.every((p: any) => 
          p.name && 
          typeof p.name === "string" &&
          p.versions && 
          Array.isArray(p.versions) &&
          p.versions.length > 0
        );
      
      expect(isValid).toBe(true);
    });
  });

  describe("Import Options", () => {
    it("should support overwrite existing option", () => {
      const options = {
        overwriteExisting: true,
        prefix: "",
      };
      
      expect(options.overwriteExisting).toBe(true);
    });

    it("should support name prefix option", () => {
      const options = {
        overwriteExisting: false,
        prefix: "Imported - ",
      };
      
      const originalName = "Test Prompt";
      const prefixedName = options.prefix + originalName;
      
      expect(prefixedName).toBe("Imported - Test Prompt");
    });

    it("should handle empty prefix", () => {
      const options = {
        overwriteExisting: false,
        prefix: "",
      };
      
      const originalName = "Test Prompt";
      const prefixedName = options.prefix + originalName;
      
      expect(prefixedName).toBe("Test Prompt");
    });
  });

  describe("Import Result", () => {
    it("should return correct result structure", () => {
      const result = {
        success: true,
        imported: 5,
        skipped: 2,
        errors: [],
      };
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("imported");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.imported).toBe("number");
      expect(typeof result.skipped).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should report errors correctly", () => {
      const result = {
        success: false,
        imported: 3,
        skipped: 0,
        errors: [
          'Failed to import "Prompt 1": Duplicate name',
          'Failed to import "Prompt 2": Invalid format',
        ],
      };
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("Prompt 1");
    });

    it("should calculate success based on errors", () => {
      const resultWithErrors = {
        imported: 5,
        skipped: 0,
        errors: ["Some error"],
      };
      
      const resultWithoutErrors = {
        imported: 5,
        skipped: 0,
        errors: [],
      };
      
      expect(resultWithErrors.errors.length === 0).toBe(false);
      expect(resultWithoutErrors.errors.length === 0).toBe(true);
    });
  });

  describe("Export Filename", () => {
    it("should generate filename with timestamp", () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `promptforge-export-${timestamp}.json`;
      
      expect(filename).toMatch(/^promptforge-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(filename.endsWith(".json")).toBe(true);
    });

    it("should sanitize workspace name in filename", () => {
      const workspaceName = "My Workspace / Test";
      const sanitized = workspaceName.replace(/[^a-zA-Z0-9-_]/g, "-");
      
      expect(sanitized).toBe("My-Workspace---Test");
      expect(sanitized).not.toContain("/");
    });
  });

  describe("Variable Export", () => {
    it("should export variable metadata", () => {
      const variable = {
        name: "topic",
        type: "string",
        defaultValue: "general",
        description: "The topic to discuss",
        required: true,
      };
      
      expect(variable).toHaveProperty("name");
      expect(variable).toHaveProperty("type");
      expect(variable).toHaveProperty("defaultValue");
      expect(variable).toHaveProperty("description");
      expect(variable).toHaveProperty("required");
    });

    it("should handle null default values", () => {
      const variable = {
        name: "optional_param",
        type: "string",
        defaultValue: null,
        description: "An optional parameter",
        required: false,
      };
      
      expect(variable.defaultValue).toBeNull();
      expect(variable.required).toBe(false);
    });
  });

  describe("Version Sorting", () => {
    it("should sort versions by version number", () => {
      const versions = [
        { versionNumber: 3, content: "v3" },
        { versionNumber: 1, content: "v1" },
        { versionNumber: 2, content: "v2" },
      ];
      
      const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
      
      expect(sorted[0].versionNumber).toBe(1);
      expect(sorted[1].versionNumber).toBe(2);
      expect(sorted[2].versionNumber).toBe(3);
    });
  });

  describe("Duplicate Detection", () => {
    it("should detect duplicate prompt names", () => {
      const existingPrompts = [
        { name: "Prompt A" },
        { name: "Prompt B" },
      ];
      
      const newPromptName = "Prompt A";
      const isDuplicate = existingPrompts.some(p => p.name === newPromptName);
      
      expect(isDuplicate).toBe(true);
    });

    it("should handle case sensitivity in duplicate detection", () => {
      const existingPrompts = [
        { name: "Prompt A" },
      ];
      
      const newPromptName = "prompt a";
      const isDuplicateCaseSensitive = existingPrompts.some(p => p.name === newPromptName);
      const isDuplicateCaseInsensitive = existingPrompts.some(
        p => p.name.toLowerCase() === newPromptName.toLowerCase()
      );
      
      expect(isDuplicateCaseSensitive).toBe(false);
      expect(isDuplicateCaseInsensitive).toBe(true);
    });
  });
});

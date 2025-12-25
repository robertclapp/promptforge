import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateInlineDiff,
  getPromptDiffStats,
} from "../services/exportDiff.service";

describe("Export Diff Service", () => {
  describe("generateInlineDiff", () => {
    it("should return unchanged for identical text", () => {
      const text = "Hello World";
      const result = generateInlineDiff(text, text);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "unchanged", text: "Hello World" });
    });

    it("should detect added lines", () => {
      const oldText = "Line 1";
      const newText = "Line 1\nLine 2";
      const result = generateInlineDiff(oldText, newText);
      
      expect(result).toContainEqual({ type: "unchanged", text: "Line 1" });
      expect(result).toContainEqual({ type: "added", text: "Line 2" });
    });

    it("should detect removed lines", () => {
      const oldText = "Line 1\nLine 2";
      const newText = "Line 1";
      const result = generateInlineDiff(oldText, newText);
      
      expect(result).toContainEqual({ type: "unchanged", text: "Line 1" });
      expect(result).toContainEqual({ type: "removed", text: "Line 2" });
    });

    it("should detect modified lines", () => {
      const oldText = "Hello World";
      const newText = "Hello Universe";
      const result = generateInlineDiff(oldText, newText);
      
      // Should have both removed and added
      const hasRemoved = result.some(r => r.type === "removed");
      const hasAdded = result.some(r => r.type === "added");
      
      expect(hasRemoved).toBe(true);
      expect(hasAdded).toBe(true);
    });

    it("should handle empty strings", () => {
      const result1 = generateInlineDiff("", "New content");
      expect(result1).toContainEqual({ type: "added", text: "New content" });

      const result2 = generateInlineDiff("Old content", "");
      expect(result2).toContainEqual({ type: "removed", text: "Old content" });
    });

    it("should handle multi-line content", () => {
      const oldText = "Line 1\nLine 2\nLine 3";
      const newText = "Line 1\nModified Line 2\nLine 3\nLine 4";
      const result = generateInlineDiff(oldText, newText);
      
      expect(result.some(r => r.type === "unchanged" && r.text === "Line 1")).toBe(true);
      expect(result.some(r => r.type === "unchanged" && r.text === "Line 3")).toBe(true);
      expect(result.some(r => r.type === "added" && r.text === "Line 4")).toBe(true);
    });
  });

  describe("getPromptDiffStats", () => {
    it("should calculate stats for added prompt", () => {
      const diff = {
        id: "1",
        name: "Test Prompt",
        status: "added" as const,
        newValue: {
          content: "Line 1\nLine 2\nLine 3",
        },
      };

      const stats = getPromptDiffStats(diff);
      
      expect(stats.linesAdded).toBe(3);
      expect(stats.linesRemoved).toBe(0);
      expect(stats.fieldsChanged).toBe(0);
    });

    it("should calculate stats for removed prompt", () => {
      const diff = {
        id: "1",
        name: "Test Prompt",
        status: "removed" as const,
        oldValue: {
          content: "Line 1\nLine 2",
        },
      };

      const stats = getPromptDiffStats(diff);
      
      expect(stats.linesAdded).toBe(0);
      expect(stats.linesRemoved).toBe(2);
      expect(stats.fieldsChanged).toBe(0);
    });

    it("should calculate stats for modified prompt", () => {
      const diff = {
        id: "1",
        name: "Test Prompt",
        status: "modified" as const,
        oldValue: {
          content: "Old content",
        },
        newValue: {
          content: "New content",
        },
        changes: [
          { field: "content", oldValue: "Old content", newValue: "New content" },
          { field: "description", oldValue: "", newValue: "New description" },
        ],
      };

      const stats = getPromptDiffStats(diff);
      
      expect(stats.fieldsChanged).toBe(2);
    });

    it("should handle unchanged prompt", () => {
      const diff = {
        id: "1",
        name: "Test Prompt",
        status: "unchanged" as const,
        oldValue: {
          content: "Same content",
        },
        newValue: {
          content: "Same content",
        },
      };

      const stats = getPromptDiffStats(diff);
      
      expect(stats.linesAdded).toBe(0);
      expect(stats.linesRemoved).toBe(0);
      expect(stats.fieldsChanged).toBe(0);
    });
  });
});

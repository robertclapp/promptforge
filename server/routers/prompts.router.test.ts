import { describe, it, expect } from "vitest";
import { promptsRouter } from "./prompts.router";

/**
 * Validation tests for Prompts Router
 * Tests input validation and schema definitions
 */

describe("Prompts Router", () => {
  describe("Input Validation", () => {
    it("should validate prompt name is required", () => {
      expect(() => {
        promptsRouter._def.procedures.create._def.inputs[0].parse({
          name: "",
          content: "Test content",
        });
      }).toThrow();
    });

    it("should validate prompt content is required", () => {
      expect(() => {
        promptsRouter._def.procedures.create._def.inputs[0].parse({
          name: "Test Prompt",
          content: "",
        });
      }).toThrow();
    });

    it("should validate name length", () => {
      const longName = "a".repeat(256);

      expect(() => {
        promptsRouter._def.procedures.create._def.inputs[0].parse({
          name: longName,
          content: "Test content",
        });
      }).toThrow();
    });
  });

  describe("Default Values", () => {
    it("should apply default values for optional fields", () => {

      // This test verifies the schema accepts minimal input
      const input = {
        name: "Test Prompt",
        content: "Test content {{variable}}",
      };

      // Should not throw - validates schema accepts defaults
      expect(() => {
        promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it("should default folderPath to root", () => {
      const input = {
        name: "Test",
        content: "Content",
      };

      const parsed = promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      expect(parsed.folderPath).toBe("/");
    });

    it("should default isTemplate to false", () => {
      const input = {
        name: "Test",
        content: "Content",
      };

      const parsed = promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      expect(parsed.isTemplate).toBe(false);
    });

    it("should default isPublic to false", () => {
      const input = {
        name: "Test",
        content: "Content",
      };

      const parsed = promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      expect(parsed.isPublic).toBe(false);
    });
  });

  describe("Variables and Tags", () => {
    it("should accept empty variables array", () => {
      const input = {
        name: "Test",
        content: "Content",
        variables: [],
      };

      expect(() => {
        promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it("should accept multiple variables", () => {
      const input = {
        name: "Test",
        content: "Content {{var1}} {{var2}}",
        variables: ["var1", "var2", "var3"],
      };

      const parsed = promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      expect(parsed.variables).toHaveLength(3);
    });

    it("should accept tags array", () => {
      const input = {
        name: "Test",
        content: "Content",
        tags: ["support", "customer-service", "v2"],
      };

      const parsed = promptsRouter._def.procedures.create._def.inputs[0].parse(input);
      expect(parsed.tags).toEqual(["support", "customer-service", "v2"]);
    });
  });

  describe("Update Operations", () => {
    it("should validate update requires id", () => {
      expect(() => {
        // @ts-expect-error - testing missing id
        promptsRouter._def.procedures.update._def.inputs[0].parse({
          name: "Updated Name",
        });
      }).toThrow();
    });

    it("should accept partial updates", () => {
      const input = {
        id: "prompt-123",
        name: "New Name",
      };

      expect(() => {
        promptsRouter._def.procedures.update._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it("should accept changeMessage for versioning", () => {
      const input = {
        id: "prompt-123",
        content: "New content",
        changeMessage: "Fixed typo in instructions",
      };

      const parsed = promptsRouter._def.procedures.update._def.inputs[0].parse(input);
      expect(parsed.changeMessage).toBe("Fixed typo in instructions");
    });
  });

  describe("List Filters", () => {
    it("should accept search filter", () => {
      const input = {
        search: "customer support",
      };

      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it("should accept tags filter", () => {
      const input = {
        tags: ["support", "v2"],
      };

      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse(input);
      }).not.toThrow();
    });

    it("should accept isTemplate filter", () => {
      const input = {
        isTemplate: true,
      };

      const parsed = promptsRouter._def.procedures.list._def.inputs[0].parse(input);
      expect(parsed.isTemplate).toBe(true);
    });

    it("should validate limit range", () => {
      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse({ limit: 0 });
      }).toThrow();

      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse({ limit: 101 });
      }).toThrow();

      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse({ limit: 50 });
      }).not.toThrow();
    });

    it("should validate offset is non-negative", () => {
      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse({ offset: -1 });
      }).toThrow();

      expect(() => {
        promptsRouter._def.procedures.list._def.inputs[0].parse({ offset: 0 });
      }).not.toThrow();
    });

    it("should apply default pagination", () => {
      const input = {};

      const parsed = promptsRouter._def.procedures.list._def.inputs[0].parse(input);
      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
    });
  });

  describe("Router Structure", () => {
    it("should have all CRUD procedures defined", () => {
      const procedures = promptsRouter._def.procedures;

      expect(procedures.list).toBeDefined();
      expect(procedures.get).toBeDefined();
      expect(procedures.getVersions).toBeDefined();
      expect(procedures.create).toBeDefined();
      expect(procedures.update).toBeDefined();
      expect(procedures.delete).toBeDefined();
    });
  });
});

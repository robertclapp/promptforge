import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-template-id"),
}));

import { getDb } from "../db";
import {
  createExportTemplate,
  getUserExportTemplates,
  getExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  duplicateExportTemplate,
  getTemplateStats,
  incrementTemplateUsage,
} from "../services/exportTemplate.service";

describe("Export Template Service", () => {
  const createMockDb = () => {
    const mockDb: any = {
      insert: vi.fn(),
      values: vi.fn(),
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    // Chain all methods
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.orderBy.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.delete.mockReturnValue(mockDb);
    return mockDb;
  };

  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    (getDb as any).mockResolvedValue(mockDb);
  });

  describe("createExportTemplate", () => {
    it("should create a new export template with default values", async () => {
      const params = {
        userId: "user-123",
        name: "Test Template",
      };

      const result = await createExportTemplate(params);

      expect(result.id).toBe("test-template-id");
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-template-id",
          userId: "user-123",
          name: "Test Template",
          exportAll: true,
          includeVersions: true,
          includeVariables: true,
          enableCompression: false,
          notifyOnSuccess: true,
          notifyOnFailure: true,
        })
      );
    });

    it("should create a template with custom options", async () => {
      const params = {
        userId: "user-123",
        organizationId: "org-456",
        name: "Custom Template",
        description: "A custom template",
        exportAll: false,
        promptIds: ["prompt-1", "prompt-2"],
        enableCompression: true,
        notifyOnSuccess: false,
      };

      const result = await createExportTemplate(params);

      expect(result.id).toBe("test-template-id");
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-456",
          exportAll: false,
          promptIds: ["prompt-1", "prompt-2"],
          enableCompression: true,
          notifyOnSuccess: false,
        })
      );
    });

    it("should throw error when database is not available", async () => {
      (getDb as any).mockResolvedValue(null);

      await expect(
        createExportTemplate({ userId: "user-123", name: "Test" })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getUserExportTemplates", () => {
    it("should return templates for a user", async () => {
      const mockTemplates = [
        { id: "template-1", name: "Template 1", usageCount: 5 },
        { id: "template-2", name: "Template 2", usageCount: 3 },
      ];
      mockDb.orderBy.mockResolvedValue(mockTemplates);

      const result = await getUserExportTemplates("user-123");

      expect(result).toEqual(mockTemplates);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter by organization when provided", async () => {
      mockDb.orderBy.mockResolvedValue([]);

      await getUserExportTemplates("user-123", "org-456");

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getExportTemplate", () => {
    it("should return a template by ID", async () => {
      const mockTemplate = { id: "template-1", name: "Template 1" };
      mockDb.where.mockResolvedValue([mockTemplate]);

      const result = await getExportTemplate("template-1", "user-123");

      expect(result).toEqual(mockTemplate);
    });

    it("should return null when template not found", async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await getExportTemplate("nonexistent", "user-123");

      expect(result).toBeNull();
    });
  });

  describe("updateExportTemplate", () => {
    it("should update an existing template", async () => {
      const mockTemplate = { id: "template-1", name: "Old Name" };
      mockDb.where.mockResolvedValueOnce([mockTemplate]); // For getExportTemplate
      mockDb.where.mockResolvedValueOnce(undefined); // For update

      const result = await updateExportTemplate("template-1", "user-123", {
        name: "New Name",
        enableCompression: true,
      });

      expect(result.id).toBe("template-1");
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({
        name: "New Name",
        enableCompression: true,
      });
    });

    it("should throw error when template not found", async () => {
      mockDb.where.mockResolvedValue([]);

      await expect(
        updateExportTemplate("nonexistent", "user-123", { name: "New Name" })
      ).rejects.toThrow("Template not found");
    });
  });

  describe("deleteExportTemplate", () => {
    it("should delete a template", async () => {
      mockDb.where.mockResolvedValue(undefined);

      const result = await deleteExportTemplate("template-1", "user-123");

      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("duplicateExportTemplate", () => {
    it("should duplicate a template with new name", async () => {
      const mockTemplate = {
        id: "template-1",
        userId: "user-123",
        name: "Original Template",
        description: "Description",
        exportAll: true,
        promptIds: null,
        includeVersions: true,
        includeVariables: true,
        enableCompression: false,
        frequency: null,
        dayOfWeek: null,
        dayOfMonth: null,
        hour: 0,
        minute: 0,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        organizationId: null,
      };
      mockDb.where.mockResolvedValue([mockTemplate]);

      const result = await duplicateExportTemplate(
        "template-1",
        "user-123",
        "Copied Template"
      );

      expect(result.id).toBe("test-template-id");
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Copied Template",
          usageCount: 0,
        })
      );
    });

    it("should use default copy name when not provided", async () => {
      const mockTemplate = {
        id: "template-1",
        userId: "user-123",
        name: "Original",
        description: null,
        exportAll: true,
        promptIds: null,
        includeVersions: true,
        includeVariables: true,
        enableCompression: false,
        frequency: null,
        dayOfWeek: null,
        dayOfMonth: null,
        hour: 0,
        minute: 0,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        organizationId: null,
      };
      mockDb.where.mockResolvedValue([mockTemplate]);

      await duplicateExportTemplate("template-1", "user-123");

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Original (Copy)",
        })
      );
    });

    it("should throw error when template not found", async () => {
      mockDb.where.mockResolvedValue([]);

      await expect(
        duplicateExportTemplate("nonexistent", "user-123")
      ).rejects.toThrow("Template not found");
    });
  });

  describe("incrementTemplateUsage", () => {
    it("should increment usage count and update lastUsedAt", async () => {
      mockDb.where.mockResolvedValue(undefined);

      await incrementTemplateUsage("template-1");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe("getTemplateStats", () => {
    it("should return template statistics", async () => {
      const mockTemplates = [
        { usageCount: 5, frequency: "daily", enableCompression: true },
        { usageCount: 3, frequency: null, enableCompression: false },
        { usageCount: 2, frequency: "weekly", enableCompression: true },
      ];
      mockDb.orderBy.mockResolvedValue(mockTemplates);

      const result = await getTemplateStats("user-123");

      expect(result).toEqual({
        totalTemplates: 3,
        totalUsage: 10,
        withScheduleConfig: 2,
        withCompression: 2,
      });
    });

    it("should return zero stats when no templates exist", async () => {
      mockDb.orderBy.mockResolvedValue([]);

      const result = await getTemplateStats("user-123");

      expect(result).toEqual({
        totalTemplates: 0,
        totalUsage: 0,
        withScheduleConfig: 0,
        withCompression: 0,
      });
    });
  });
});

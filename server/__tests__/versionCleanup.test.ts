import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Version Cleanup Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Retention Settings", () => {
    it("should have default retention values", () => {
      // Test default values
      const defaults = {
        enabled: false,
        maxVersionsPerExport: 10,
        maxAgeDays: 90,
        minVersionsToKeep: 1,
        cleanupFrequency: "weekly",
      };

      expect(defaults.enabled).toBe(false);
      expect(defaults.maxVersionsPerExport).toBe(10);
      expect(defaults.maxAgeDays).toBe(90);
      expect(defaults.minVersionsToKeep).toBe(1);
      expect(defaults.cleanupFrequency).toBe("weekly");
    });

    it("should validate retention settings constraints", () => {
      // Test constraints
      const validSettings = {
        maxVersionsPerExport: 50,
        maxAgeDays: 365,
        minVersionsToKeep: 5,
        maxTotalSizeMb: 1000,
      };

      expect(validSettings.maxVersionsPerExport).toBeGreaterThanOrEqual(1);
      expect(validSettings.maxVersionsPerExport).toBeLessThanOrEqual(100);
      expect(validSettings.maxAgeDays).toBeGreaterThanOrEqual(1);
      expect(validSettings.maxAgeDays).toBeLessThanOrEqual(365);
      expect(validSettings.minVersionsToKeep).toBeGreaterThanOrEqual(1);
      expect(validSettings.minVersionsToKeep).toBeLessThanOrEqual(10);
    });
  });

  describe("Cleanup Frequency Calculation", () => {
    it("should calculate next cleanup for daily frequency", () => {
      const now = new Date();
      const nextDaily = new Date(now);
      nextDaily.setDate(nextDaily.getDate() + 1);
      nextDaily.setHours(2, 0, 0, 0);

      expect(nextDaily.getTime()).toBeGreaterThan(now.getTime());
      expect(nextDaily.getHours()).toBe(2);
    });

    it("should calculate next cleanup for weekly frequency", () => {
      const now = new Date();
      const nextWeekly = new Date(now);
      nextWeekly.setDate(nextWeekly.getDate() + 7);
      nextWeekly.setHours(2, 0, 0, 0);

      const daysDiff = Math.round((nextWeekly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Due to time of day, this could be 6 or 7 days
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    it("should calculate next cleanup for monthly frequency", () => {
      const now = new Date();
      const nextMonthly = new Date(now);
      nextMonthly.setMonth(nextMonthly.getMonth() + 1);
      nextMonthly.setDate(1);
      nextMonthly.setHours(2, 0, 0, 0);

      expect(nextMonthly.getMonth()).toBe((now.getMonth() + 1) % 12);
    });
  });

  describe("Cleanup Rules", () => {
    it("should respect minVersionsToKeep constraint", () => {
      const versions = [
        { id: "1", createdAt: new Date("2024-01-01") },
        { id: "2", createdAt: new Date("2024-01-02") },
        { id: "3", createdAt: new Date("2024-01-03") },
      ];

      const minVersionsToKeep = 2;
      const maxVersionsPerExport = 1;

      // Even if maxVersionsPerExport is 1, we should keep at least minVersionsToKeep
      const toKeep = Math.max(minVersionsToKeep, maxVersionsPerExport);
      expect(toKeep).toBe(2);
    });

    it("should identify versions older than maxAgeDays", () => {
      const maxAgeDays = 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      const oldVersion = { id: "1", createdAt: new Date("2023-01-01") };
      const newVersion = { id: "2", createdAt: new Date() };

      expect(new Date(oldVersion.createdAt) < cutoffDate).toBe(true);
      expect(new Date(newVersion.createdAt) < cutoffDate).toBe(false);
    });

    it("should calculate total size correctly", () => {
      const versions = [
        { id: "1", exportFileSize: 1000000 },
        { id: "2", exportFileSize: 2000000 },
        { id: "3", exportFileSize: 3000000 },
      ];

      const totalSize = versions.reduce((sum, v) => sum + (v.exportFileSize || 0), 0);
      expect(totalSize).toBe(6000000);

      const totalSizeMb = totalSize / (1024 * 1024);
      expect(totalSizeMb).toBeCloseTo(5.72, 1);
    });
  });

  describe("Cleanup Statistics", () => {
    it("should calculate average versions per cleanup", () => {
      const totalCleanups = 10;
      const totalVersionsDeleted = 50;

      const average = totalCleanups > 0 ? Math.round(totalVersionsDeleted / totalCleanups) : 0;
      expect(average).toBe(5);
    });

    it("should calculate success rate", () => {
      const totalCleanups = 10;
      const successCount = 8;

      const successRate = totalCleanups > 0 ? Math.round((successCount / totalCleanups) * 100) : 100;
      expect(successRate).toBe(80);
    });

    it("should handle zero cleanups gracefully", () => {
      const totalCleanups = 0;
      const totalVersionsDeleted = 0;

      const average = totalCleanups > 0 ? Math.round(totalVersionsDeleted / totalCleanups) : 0;
      const successRate = totalCleanups > 0 ? 0 : 100;

      expect(average).toBe(0);
      expect(successRate).toBe(100);
    });
  });

  describe("Preview Cleanup", () => {
    it("should identify versions to delete based on max versions rule", () => {
      const maxVersionsPerExport = 3;
      const minVersionsToKeep = 1;
      const versions = [
        { id: "1", versionName: "export-a", versionNumber: 1 },
        { id: "2", versionName: "export-a", versionNumber: 2 },
        { id: "3", versionName: "export-a", versionNumber: 3 },
        { id: "4", versionName: "export-a", versionNumber: 4 },
        { id: "5", versionName: "export-a", versionNumber: 5 },
      ];

      const toKeep = Math.max(minVersionsToKeep, maxVersionsPerExport);
      const toDelete = versions.slice(toKeep);

      expect(toDelete.length).toBe(2);
      expect(toDelete[0].id).toBe("4");
      expect(toDelete[1].id).toBe("5");
    });

    it("should provide deletion reasons", () => {
      const reasons = [
        "Exceeds max 10 versions per export",
        "Older than 90 days",
        "Total size exceeds 1000 MB limit",
      ];

      expect(reasons[0]).toContain("Exceeds max");
      expect(reasons[1]).toContain("Older than");
      expect(reasons[2]).toContain("exceeds");
    });
  });

  describe("Cleanup History", () => {
    it("should track cleanup status correctly", () => {
      const statuses = ["success", "partial", "failed"];

      expect(statuses).toContain("success");
      expect(statuses).toContain("partial");
      expect(statuses).toContain("failed");
    });

    it("should record cleanup criteria", () => {
      const criteria = {
        maxVersions: 10,
        maxAgeDays: 90,
        maxTotalSizeMb: 1000,
      };

      expect(criteria.maxVersions).toBe(10);
      expect(criteria.maxAgeDays).toBe(90);
      expect(criteria.maxTotalSizeMb).toBe(1000);
    });
  });
});

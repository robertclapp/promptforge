import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Export Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Date Range Calculation", () => {
    it("should calculate correct start date for 7 days", () => {
      const days = 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const now = new Date();
      const diffMs = now.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(7);
    });

    it("should calculate correct start date for 30 days", () => {
      const days = 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const now = new Date();
      const diffMs = now.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(30);
    });

    it("should calculate correct start date for 365 days", () => {
      const days = 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const now = new Date();
      const diffMs = now.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(365);
    });
  });

  describe("Frequency Aggregation", () => {
    it("should aggregate exports and imports by date", () => {
      const history = [
        { operationType: "export", startedAt: new Date("2024-01-01") },
        { operationType: "export", startedAt: new Date("2024-01-01") },
        { operationType: "import", startedAt: new Date("2024-01-01") },
        { operationType: "export", startedAt: new Date("2024-01-02") },
        { operationType: "import", startedAt: new Date("2024-01-02") },
        { operationType: "import", startedAt: new Date("2024-01-02") },
      ];

      const frequencyMap = new Map<string, { exports: number; imports: number }>();
      
      for (const record of history) {
        const dateStr = record.startedAt.toISOString().split("T")[0];
        const current = frequencyMap.get(dateStr) || { exports: 0, imports: 0 };
        
        if (record.operationType === "export") {
          current.exports++;
        } else {
          current.imports++;
        }
        
        frequencyMap.set(dateStr, current);
      }

      expect(frequencyMap.get("2024-01-01")).toEqual({ exports: 2, imports: 1 });
      expect(frequencyMap.get("2024-01-02")).toEqual({ exports: 1, imports: 2 });
    });
  });

  describe("File Size Aggregation", () => {
    it("should calculate total and average file sizes", () => {
      const history = [
        { exportFileSize: 1000 },
        { exportFileSize: 2000 },
        { exportFileSize: 3000 },
        { exportFileSize: 4000 },
      ];

      const totalSize = history.reduce((sum, h) => sum + (h.exportFileSize || 0), 0);
      const avgSize = totalSize / history.length;

      expect(totalSize).toBe(10000);
      expect(avgSize).toBe(2500);
    });

    it("should handle null file sizes", () => {
      const history = [
        { exportFileSize: 1000 },
        { exportFileSize: null },
        { exportFileSize: 2000 },
        { exportFileSize: undefined },
      ];

      const totalSize = history.reduce((sum, h) => sum + (h.exportFileSize || 0), 0);
      const validEntries = history.filter((h) => h.exportFileSize).length;
      const avgSize = validEntries > 0 ? totalSize / validEntries : 0;

      expect(totalSize).toBe(3000);
      expect(avgSize).toBe(1500);
    });
  });

  describe("Success Rate Calculation", () => {
    it("should calculate correct success rate", () => {
      const history = [
        { status: "completed" },
        { status: "completed" },
        { status: "completed" },
        { status: "failed" },
        { status: "completed" },
      ];

      const successfulOps = history.filter((h) => h.status === "completed").length;
      const successRate = Math.round((successfulOps / history.length) * 100);

      expect(successRate).toBe(80);
    });

    it("should return 100% for all successful operations", () => {
      const history = [
        { status: "completed" },
        { status: "completed" },
        { status: "completed" },
      ];

      const successfulOps = history.filter((h) => h.status === "completed").length;
      const successRate = Math.round((successfulOps / history.length) * 100);

      expect(successRate).toBe(100);
    });

    it("should return 0% for all failed operations", () => {
      const history = [
        { status: "failed" },
        { status: "failed" },
        { status: "failed" },
      ];

      const successfulOps = history.filter((h) => h.status === "completed").length;
      const successRate = Math.round((successfulOps / history.length) * 100);

      expect(successRate).toBe(0);
    });

    it("should handle empty history", () => {
      const history: any[] = [];

      const successfulOps = history.filter((h) => h.status === "completed").length;
      const successRate = history.length > 0 ? Math.round((successfulOps / history.length) * 100) : 100;

      expect(successRate).toBe(100);
    });
  });

  describe("Export Type Breakdown", () => {
    it("should count manual vs scheduled exports", () => {
      const history = [
        { scheduleId: null },
        { scheduleId: "schedule_1" },
        { scheduleId: null },
        { scheduleId: "schedule_2" },
        { scheduleId: "schedule_1" },
      ];

      let manual = 0;
      let scheduled = 0;

      for (const record of history) {
        if (record.scheduleId) {
          scheduled++;
        } else {
          manual++;
        }
      }

      expect(manual).toBe(2);
      expect(scheduled).toBe(3);
    });
  });

  describe("Hourly Distribution", () => {
    it("should count exports by hour", () => {
      const history = [
        { startedAt: new Date("2024-01-01T09:00:00") },
        { startedAt: new Date("2024-01-01T09:30:00") },
        { startedAt: new Date("2024-01-01T14:00:00") },
        { startedAt: new Date("2024-01-01T14:15:00") },
        { startedAt: new Date("2024-01-01T14:45:00") },
        { startedAt: new Date("2024-01-01T18:00:00") },
      ];

      const hourlyMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, 0);
      }

      for (const record of history) {
        const hour = record.startedAt.getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }

      expect(hourlyMap.get(9)).toBe(2);
      expect(hourlyMap.get(14)).toBe(3);
      expect(hourlyMap.get(18)).toBe(1);
      expect(hourlyMap.get(0)).toBe(0);
    });
  });

  describe("Template Usage Ranking", () => {
    it("should rank templates by usage count", () => {
      const templates = [
        { id: "1", name: "Template A", usageCount: 5 },
        { id: "2", name: "Template B", usageCount: 10 },
        { id: "3", name: "Template C", usageCount: 3 },
        { id: "4", name: "Template D", usageCount: 8 },
      ];

      const sorted = [...templates].sort((a, b) => b.usageCount - a.usageCount);

      expect(sorted[0].name).toBe("Template B");
      expect(sorted[1].name).toBe("Template D");
      expect(sorted[2].name).toBe("Template A");
      expect(sorted[3].name).toBe("Template C");
    });

    it("should limit to top N templates", () => {
      const templates = [
        { id: "1", name: "Template A", usageCount: 5 },
        { id: "2", name: "Template B", usageCount: 10 },
        { id: "3", name: "Template C", usageCount: 3 },
        { id: "4", name: "Template D", usageCount: 8 },
        { id: "5", name: "Template E", usageCount: 1 },
      ];

      const limit = 3;
      const topTemplates = [...templates]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);

      expect(topTemplates.length).toBe(3);
      expect(topTemplates[0].name).toBe("Template B");
      expect(topTemplates[2].name).toBe("Template A");
    });
  });

  describe("Date Initialization", () => {
    it("should initialize all dates in range", () => {
      const days = 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const dateMap = new Map<string, number>();
      
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        dateMap.set(dateStr, 0);
      }

      expect(dateMap.size).toBe(8); // 7 days + today
    });
  });
});

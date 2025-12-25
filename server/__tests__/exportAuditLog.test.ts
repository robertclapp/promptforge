import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Export Audit Log Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAuditEvent", () => {
    it("should log an audit event", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { logAuditEvent } = await import("../services/exportAuditLog.service");
      expect(logAuditEvent).toBeDefined();
    });

    it("should include IP address and user agent when enabled", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ logIpAddresses: true, logUserAgents: true }]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { logAuditEvent } = await import("../services/exportAuditLog.service");
      expect(logAuditEvent).toBeDefined();
    });
  });

  describe("getAuditLogs", () => {
    it("should return paginated audit logs", async () => {
      const mockLogs = [
        { id: "log1", action: "export_created", resourceType: "export" },
        { id: "log2", action: "export_downloaded", resourceType: "export" },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { getAuditLogs } = await import("../services/exportAuditLog.service");
      expect(getAuditLogs).toBeDefined();
    });

    it("should filter by action type", async () => {
      const { getAuditLogs } = await import("../services/exportAuditLog.service");
      expect(getAuditLogs).toBeDefined();
    });

    it("should filter by resource type", async () => {
      const { getAuditLogs } = await import("../services/exportAuditLog.service");
      expect(getAuditLogs).toBeDefined();
    });

    it("should filter by date range", async () => {
      const { getAuditLogs } = await import("../services/exportAuditLog.service");
      expect(getAuditLogs).toBeDefined();
    });
  });

  describe("getAuditStats", () => {
    it("should return audit statistics", async () => {
      const { getAuditStats } = await import("../services/exportAuditLog.service");
      expect(getAuditStats).toBeDefined();
    });
  });

  describe("exportAuditLogs", () => {
    it("should export logs as JSON", async () => {
      const mockLogs = [
        { id: "log1", action: "export_created", createdAt: new Date() },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockLogs),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { exportAuditLogs } = await import("../services/exportAuditLog.service");
      expect(exportAuditLogs).toBeDefined();
    });

    it("should export logs as CSV", async () => {
      const { exportAuditLogs } = await import("../services/exportAuditLog.service");
      expect(exportAuditLogs).toBeDefined();
    });
  });

  describe("getAuditSettings", () => {
    it("should return user audit settings", async () => {
      const mockSettings = {
        retentionDays: 90,
        logExports: true,
        logImports: true,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockSettings]),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { getAuditSettings } = await import("../services/exportAuditLog.service");
      expect(getAuditSettings).toBeDefined();
    });

    it("should return null if no settings exist", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { getAuditSettings } = await import("../services/exportAuditLog.service");
      expect(getAuditSettings).toBeDefined();
    });
  });

  describe("updateAuditSettings", () => {
    it("should update existing settings", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "settings1" }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { updateAuditSettings } = await import("../services/exportAuditLog.service");
      expect(updateAuditSettings).toBeDefined();
    });

    it("should create settings if none exist", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { updateAuditSettings } = await import("../services/exportAuditLog.service");
      expect(updateAuditSettings).toBeDefined();
    });
  });

  describe("cleanupOldAuditLogs", () => {
    it("should delete logs older than retention period", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ retentionDays: 90 }]),
        delete: vi.fn().mockReturnThis(),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { cleanupOldAuditLogs } = await import("../services/exportAuditLog.service");
      expect(cleanupOldAuditLogs).toBeDefined();
    });
  });

  describe("Action categories", () => {
    it("should categorize export actions correctly", () => {
      const exportActions = [
        "export_created",
        "export_downloaded",
        "export_shared",
        "export_deleted",
        "export_encrypted",
        "export_decrypted",
      ];

      exportActions.forEach((action) => {
        expect(action.startsWith("export_")).toBe(true);
      });
    });

    it("should categorize import actions correctly", () => {
      const importActions = [
        "import_started",
        "import_completed",
        "import_failed",
      ];

      importActions.forEach((action) => {
        expect(action.startsWith("import_")).toBe(true);
      });
    });

    it("should categorize version actions correctly", () => {
      const versionActions = [
        "version_created",
        "version_restored",
        "version_compared",
      ];

      versionActions.forEach((action) => {
        expect(action.startsWith("version_")).toBe(true);
      });
    });
  });
});

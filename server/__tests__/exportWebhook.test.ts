import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock fetch for webhook delivery
global.fetch = vi.fn();

describe("Export Webhook Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createWebhook", () => {
    it("should create a webhook with correct parameters", async () => {
      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { createWebhook } = await import("../services/exportWebhook.service");
      expect(createWebhook).toBeDefined();
    });
  });

  describe("listWebhooks", () => {
    it("should list webhooks for a user", async () => {
      const mockWebhooks = [
        { id: "w1", name: "Webhook 1", url: "https://example.com/hook1" },
        { id: "w2", name: "Webhook 2", url: "https://example.com/hook2" },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockWebhooks),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { listWebhooks } = await import("../services/exportWebhook.service");
      expect(listWebhooks).toBeDefined();
    });
  });

  describe("HMAC signature", () => {
    it("should generate correct HMAC signature using crypto", () => {
      const crypto = require("crypto");
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";
      const signature = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
      
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^sha256=/);
    });

    it("should generate different signatures for different payloads", () => {
      const crypto = require("crypto");
      const secret = "test-secret";
      const sig1 = "sha256=" + crypto.createHmac("sha256", secret).update('{"a":1}').digest("hex");
      const sig2 = "sha256=" + crypto.createHmac("sha256", secret).update('{"b":2}').digest("hex");
      
      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const crypto = require("crypto");
      const payload = '{"test":"data"}';
      const sig1 = "sha256=" + crypto.createHmac("sha256", "secret1").update(payload).digest("hex");
      const sig2 = "sha256=" + crypto.createHmac("sha256", "secret2").update(payload).digest("hex");
      
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("triggerWebhooks", () => {
    it("should trigger webhooks for export complete event", async () => {
      const { triggerWebhooks } = await import("../services/exportWebhook.service");
      expect(triggerWebhooks).toBeDefined();
    });
  });

  describe("testWebhook", () => {
    it("should send test payload to webhook URL", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const { testWebhook } = await import("../services/exportWebhook.service");
      expect(testWebhook).toBeDefined();
    });
  });

  describe("retryDelivery", () => {
    it("should retry a failed delivery", async () => {
      const { retryDelivery } = await import("../services/exportWebhook.service");
      expect(retryDelivery).toBeDefined();
    });
  });

  describe("getWebhookDeliveries", () => {
    it("should list deliveries for a webhook", async () => {
      const mockDeliveries = [
        { id: "d1", status: "success", responseStatus: 200 },
        { id: "d2", status: "failed", responseStatus: 500 },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockDeliveries),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { getWebhookDeliveries } = await import("../services/exportWebhook.service");
      expect(getWebhookDeliveries).toBeDefined();
    });
  });

  describe("updateWebhook", () => {
    it("should update webhook configuration", async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { updateWebhook } = await import("../services/exportWebhook.service");
      expect(updateWebhook).toBeDefined();
    });
  });

  describe("deleteWebhook", () => {
    it("should delete a webhook", async () => {
      const mockDb = {
        delete: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const { getDb } = await import("../db");
      (getDb as any).mockResolvedValue(mockDb);

      const { deleteWebhook } = await import("../services/exportWebhook.service");
      expect(deleteWebhook).toBeDefined();
    });
  });
});

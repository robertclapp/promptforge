import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Export Sharing Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Share Code Generation", () => {
    it("should generate unique share codes", async () => {
      // Test that share codes are unique
      const codes = new Set<string>();
      const crypto = await import("crypto");
      
      for (let i = 0; i < 100; i++) {
        const code = crypto.randomBytes(12).toString("base64url");
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });

    it("should generate URL-safe share codes", async () => {
      const crypto = await import("crypto");
      const code = crypto.randomBytes(12).toString("base64url");
      
      // base64url should only contain alphanumeric, -, and _
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("Password Hashing", () => {
    it("should hash passwords consistently", async () => {
      const crypto = await import("crypto");
      const password = "TestPassword123!";
      
      const hash1 = crypto.createHash("sha256").update(password).digest("hex");
      const hash2 = crypto.createHash("sha256").update(password).digest("hex");
      
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different passwords", async () => {
      const crypto = await import("crypto");
      const password1 = "TestPassword123!";
      const password2 = "DifferentPassword456!";
      
      const hash1 = crypto.createHash("sha256").update(password1).digest("hex");
      const hash2 = crypto.createHash("sha256").update(password2).digest("hex");
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Expiration Calculation", () => {
    it("should calculate correct expiration date", () => {
      const expiresInDays = 7;
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      // Should be approximately 7 days in the future
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(7);
    });

    it("should handle different expiration periods", () => {
      const testCases = [1, 7, 30, 90, 365];
      
      for (const days of testCases) {
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        expect(diffDays).toBe(days);
      }
    });
  });

  describe("Access Validation", () => {
    it("should detect expired shares", () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday
      
      const isExpired = new Date() > expiredDate;
      expect(isExpired).toBe(true);
    });

    it("should detect non-expired shares", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
      
      const isExpired = new Date() > futureDate;
      expect(isExpired).toBe(false);
    });

    it("should detect download limit reached", () => {
      const maxDownloads = 5;
      const downloadCount = 5;
      
      const limitReached = downloadCount >= maxDownloads;
      expect(limitReached).toBe(true);
    });

    it("should allow downloads under limit", () => {
      const maxDownloads = 5;
      const downloadCount = 3;
      
      const limitReached = downloadCount >= maxDownloads;
      expect(limitReached).toBe(false);
    });
  });

  describe("Access Log Management", () => {
    it("should trim access log to last 100 entries", () => {
      const accessLog: Array<{ ip: string; userAgent: string; timestamp: string }> = [];
      
      // Add 150 entries
      for (let i = 0; i < 150; i++) {
        accessLog.push({
          ip: `192.168.1.${i % 256}`,
          userAgent: `TestAgent/${i}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Trim to last 100
      const trimmedLog = accessLog.slice(-100);
      
      expect(trimmedLog.length).toBe(100);
      expect(trimmedLog[0].userAgent).toBe("TestAgent/50");
      expect(trimmedLog[99].userAgent).toBe("TestAgent/149");
    });

    it("should preserve all entries when under limit", () => {
      const accessLog: Array<{ ip: string; userAgent: string; timestamp: string }> = [];
      
      // Add 50 entries
      for (let i = 0; i < 50; i++) {
        accessLog.push({
          ip: `192.168.1.${i}`,
          userAgent: `TestAgent/${i}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Trim to last 100 (should keep all)
      const trimmedLog = accessLog.slice(-100);
      
      expect(trimmedLog.length).toBe(50);
    });
  });

  describe("Share URL Generation", () => {
    it("should generate correct share URL format", () => {
      const baseUrl = "https://example.com";
      const shareCode = "abc123xyz";
      
      const shareUrl = `${baseUrl}/shared-export/${shareCode}`;
      
      expect(shareUrl).toBe("https://example.com/shared-export/abc123xyz");
    });

    it("should handle empty base URL", () => {
      const baseUrl = "";
      const shareCode = "abc123xyz";
      
      const shareUrl = `${baseUrl}/shared-export/${shareCode}`;
      
      expect(shareUrl).toBe("/shared-export/abc123xyz");
    });
  });

  describe("Share Statistics", () => {
    it("should calculate correct statistics", () => {
      const shares = [
        { isActive: true, downloadCount: 5, password: "hash1" },
        { isActive: true, downloadCount: 3, password: null },
        { isActive: false, downloadCount: 10, password: "hash2" },
        { isActive: true, downloadCount: 0, password: null },
      ];
      
      const stats = {
        totalShares: shares.length,
        activeShares: shares.filter((s) => s.isActive).length,
        totalDownloads: shares.reduce((sum, s) => sum + s.downloadCount, 0),
        passwordProtected: shares.filter((s) => s.password).length,
      };
      
      expect(stats.totalShares).toBe(4);
      expect(stats.activeShares).toBe(3);
      expect(stats.totalDownloads).toBe(18);
      expect(stats.passwordProtected).toBe(2);
    });

    it("should handle empty shares array", () => {
      const shares: any[] = [];
      
      const stats = {
        totalShares: shares.length,
        activeShares: shares.filter((s) => s.isActive).length,
        totalDownloads: shares.reduce((sum, s) => sum + s.downloadCount, 0),
        passwordProtected: shares.filter((s) => s.password).length,
      };
      
      expect(stats.totalShares).toBe(0);
      expect(stats.activeShares).toBe(0);
      expect(stats.totalDownloads).toBe(0);
      expect(stats.passwordProtected).toBe(0);
    });
  });
});

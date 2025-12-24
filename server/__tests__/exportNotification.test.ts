import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notification module
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

import { notifyOwner } from "../_core/notification";
import {
  sendExportSuccessNotification,
  sendExportFailureNotification,
  formatFileSize,
  formatDuration,
} from "../services/exportNotification.service";

describe("Export Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendExportSuccessNotification", () => {
    it("should send a success notification with all details", async () => {
      (notifyOwner as any).mockResolvedValue(true);

      const result = await sendExportSuccessNotification({
        scheduleName: "Daily Backup",
        promptCount: 25,
        fileSize: 1048576, // 1 MB
        downloadUrl: "https://example.com/export.json",
        duration: 5000, // 5 seconds
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Export Successful"),
          content: expect.stringContaining("Daily Backup"),
        })
      );
    });

    it("should include prompt count in notification", async () => {
      (notifyOwner as any).mockResolvedValue(true);

      await sendExportSuccessNotification({
        scheduleName: "Test Export",
        promptCount: 10,
        fileSize: 512,
        downloadUrl: "https://example.com/export.json",
        duration: 1000,
      });

      expect(notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("10 prompts"),
        })
      );
    });

    it("should handle notification failure gracefully", async () => {
      (notifyOwner as any).mockResolvedValue(false);

      const result = await sendExportSuccessNotification({
        scheduleName: "Test",
        promptCount: 5,
        fileSize: 100,
        downloadUrl: "https://example.com/export.json",
        duration: 500,
      });

      expect(result).toBe(false);
    });
  });

  describe("sendExportFailureNotification", () => {
    it("should send a failure notification with error details", async () => {
      (notifyOwner as any).mockResolvedValue(true);

      const result = await sendExportFailureNotification({
        scheduleName: "Daily Backup",
        errorMessage: "Database connection failed",
        attemptedAt: new Date("2024-01-15T10:00:00Z"),
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Export Failed"),
          content: expect.stringContaining("Daily Backup"),
        })
      );
    });

    it("should include error message in notification", async () => {
      (notifyOwner as any).mockResolvedValue(true);

      await sendExportFailureNotification({
        scheduleName: "Test Export",
        errorMessage: "Storage quota exceeded",
        attemptedAt: new Date(),
      });

      expect(notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Storage quota exceeded"),
        })
      );
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(2560)).toBe("2.50 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1.00 MB");
      expect(formatFileSize(5242880)).toBe("5.00 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatFileSize(1073741824)).toBe("1.00 GB");
    });

    it("should handle zero bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds correctly", () => {
      expect(formatDuration(500)).toBe("500ms");
    });

    it("should format seconds correctly", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(2500)).toBe("2.5s");
    });

    it("should format minutes correctly", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(90000)).toBe("1m 30s");
    });

    it("should format hours correctly", () => {
      expect(formatDuration(3600000)).toBe("1h 0m");
      expect(formatDuration(5400000)).toBe("1h 30m");
    });

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("0ms");
    });
  });
});

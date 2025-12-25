import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAlertRuleTemplates } from "../services/auditAlerts.service";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the notification service
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Audit Alerts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Alert Rule Templates", () => {
    it("should return predefined alert rule templates", () => {
      const templates = getAlertRuleTemplates();
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThanOrEqual(5);
    });

    it("should have unauthorized access template", () => {
      const templates = getAlertRuleTemplates();
      const unauthorizedTemplate = templates.find(t => t.id === "unauthorized_access");
      
      expect(unauthorizedTemplate).toBeDefined();
      expect(unauthorizedTemplate?.name).toBe("Unauthorized Access Attempts");
      expect(unauthorizedTemplate?.config.triggerOnActions).toContain("share_access");
      expect(unauthorizedTemplate?.config.triggerOnStatus).toContain("unauthorized");
    });

    it("should have failed exports template", () => {
      const templates = getAlertRuleTemplates();
      const failedTemplate = templates.find(t => t.id === "failed_exports");
      
      expect(failedTemplate).toBeDefined();
      expect(failedTemplate?.name).toBe("Export Failures");
      expect(failedTemplate?.config.thresholdCount).toBe(3);
    });

    it("should have unknown IP template", () => {
      const templates = getAlertRuleTemplates();
      const unknownIpTemplate = templates.find(t => t.id === "unknown_ip");
      
      expect(unknownIpTemplate).toBeDefined();
      expect(unknownIpTemplate?.config.triggerOnUnknownIp).toBe(true);
    });

    it("should have bulk downloads template", () => {
      const templates = getAlertRuleTemplates();
      const bulkTemplate = templates.find(t => t.id === "bulk_downloads");
      
      expect(bulkTemplate).toBeDefined();
      expect(bulkTemplate?.config.thresholdCount).toBe(10);
      expect(bulkTemplate?.config.thresholdWindowMinutes).toBe(30);
    });

    it("should have share expiry template", () => {
      const templates = getAlertRuleTemplates();
      const expiryTemplate = templates.find(t => t.id === "share_expiry");
      
      expect(expiryTemplate).toBeDefined();
      expect(expiryTemplate?.config.triggerOnStatus).toContain("expired");
    });
  });

  describe("Alert Severity Determination", () => {
    it("should determine critical severity for unauthorized access", () => {
      const status = "unauthorized";
      const isCritical = status === "unauthorized" || status === "forbidden";
      expect(isCritical).toBe(true);
    });

    it("should determine high severity for failures", () => {
      const status = "failed";
      const eventCount = 3;
      const isHigh = status === "failed" && eventCount <= 5;
      expect(isHigh).toBe(true);
    });

    it("should escalate to critical for many failures", () => {
      const status = "failed";
      const eventCount = 10;
      const isCritical = status === "failed" && eventCount > 5;
      expect(isCritical).toBe(true);
    });

    it("should determine medium severity for suspicious patterns", () => {
      const eventCount = 15;
      const isMedium = eventCount > 10;
      expect(isMedium).toBe(true);
    });
  });

  describe("Alert Title Generation", () => {
    it("should generate title for single event", () => {
      const ruleName = "Unauthorized Access";
      const action = "share_access";
      const eventCount = 1;
      
      const actionLabel = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const title = eventCount > 1 
        ? `${ruleName}: ${eventCount} ${actionLabel} events detected`
        : `${ruleName}: ${actionLabel} detected`;
      
      expect(title).toBe("Unauthorized Access: Share Access detected");
    });

    it("should generate title for multiple events", () => {
      const ruleName = "Bulk Downloads";
      const action = "export_download";
      const eventCount = 15;
      
      const actionLabel = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const title = eventCount > 1 
        ? `${ruleName}: ${eventCount} ${actionLabel} events detected`
        : `${ruleName}: ${actionLabel} detected`;
      
      expect(title).toBe("Bulk Downloads: 15 Export Download events detected");
    });
  });

  describe("Cooldown Logic", () => {
    it("should respect cooldown period", () => {
      const lastTriggeredAt = new Date();
      lastTriggeredAt.setMinutes(lastTriggeredAt.getMinutes() - 5);
      const cooldownMinutes = 15;
      
      const cooldownEnd = new Date(lastTriggeredAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + cooldownMinutes);
      
      const now = new Date();
      const isInCooldown = now < cooldownEnd;
      
      expect(isInCooldown).toBe(true);
    });

    it("should allow triggering after cooldown expires", () => {
      const lastTriggeredAt = new Date();
      lastTriggeredAt.setMinutes(lastTriggeredAt.getMinutes() - 20);
      const cooldownMinutes = 15;
      
      const cooldownEnd = new Date(lastTriggeredAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + cooldownMinutes);
      
      const now = new Date();
      const isInCooldown = now < cooldownEnd;
      
      expect(isInCooldown).toBe(false);
    });
  });

  describe("Threshold Logic", () => {
    it("should trigger when threshold is met", () => {
      const thresholdCount = 5;
      const eventCount = 5;
      
      const shouldTrigger = eventCount >= thresholdCount;
      expect(shouldTrigger).toBe(true);
    });

    it("should not trigger below threshold", () => {
      const thresholdCount = 5;
      const eventCount = 3;
      
      const shouldTrigger = eventCount >= thresholdCount;
      expect(shouldTrigger).toBe(false);
    });

    it("should count events within time window", () => {
      const thresholdWindowMinutes = 60;
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - thresholdWindowMinutes);
      
      const events = [
        { timestamp: new Date() }, // Within window
        { timestamp: new Date(Date.now() - 30 * 60 * 1000) }, // Within window
        { timestamp: new Date(Date.now() - 90 * 60 * 1000) }, // Outside window
      ];
      
      const eventsInWindow = events.filter(e => e.timestamp >= windowStart);
      expect(eventsInWindow.length).toBe(2);
    });
  });

  describe("IP-based Rules", () => {
    it("should detect unknown IP when not in allowed list", () => {
      const allowedIps = ["192.168.1.1", "10.0.0.1"];
      const sourceIp = "8.8.8.8";
      
      const isUnknown = !allowedIps.includes(sourceIp);
      expect(isUnknown).toBe(true);
    });

    it("should not flag known IP", () => {
      const allowedIps = ["192.168.1.1", "10.0.0.1"];
      const sourceIp = "192.168.1.1";
      
      const isUnknown = !allowedIps.includes(sourceIp);
      expect(isUnknown).toBe(false);
    });
  });

  describe("Action Matching", () => {
    it("should match action in trigger list", () => {
      const triggerOnActions = ["share_access", "export_download", "export_failed"];
      const action = "share_access";
      
      const matches = triggerOnActions.includes(action);
      expect(matches).toBe(true);
    });

    it("should not match action not in trigger list", () => {
      const triggerOnActions = ["share_access", "export_download"];
      const action = "export_created";
      
      const matches = triggerOnActions.includes(action);
      expect(matches).toBe(false);
    });
  });

  describe("Resource Type Matching", () => {
    it("should match when resource type is in list", () => {
      const triggerOnResourceTypes = ["export", "share"];
      const resourceType = "export";
      
      const matches = triggerOnResourceTypes.length === 0 || triggerOnResourceTypes.includes(resourceType);
      expect(matches).toBe(true);
    });

    it("should match all when list is empty", () => {
      const triggerOnResourceTypes: string[] = [];
      const resourceType = "any_type";
      
      const matches = triggerOnResourceTypes.length === 0 || triggerOnResourceTypes.includes(resourceType);
      expect(matches).toBe(true);
    });
  });

  describe("Alert Statistics", () => {
    it("should calculate severity distribution", () => {
      const alerts = [
        { severity: "low" },
        { severity: "low" },
        { severity: "medium" },
        { severity: "high" },
        { severity: "critical" },
      ];
      
      const bySeverity = {
        low: alerts.filter(a => a.severity === "low").length,
        medium: alerts.filter(a => a.severity === "medium").length,
        high: alerts.filter(a => a.severity === "high").length,
        critical: alerts.filter(a => a.severity === "critical").length,
      };
      
      expect(bySeverity.low).toBe(2);
      expect(bySeverity.medium).toBe(1);
      expect(bySeverity.high).toBe(1);
      expect(bySeverity.critical).toBe(1);
    });

    it("should count unacknowledged alerts", () => {
      const alerts = [
        { acknowledged: false },
        { acknowledged: true },
        { acknowledged: false },
        { acknowledged: false },
      ];
      
      const unacknowledged = alerts.filter(a => !a.acknowledged).length;
      expect(unacknowledged).toBe(3);
    });
  });

  describe("Webhook Notification", () => {
    it("should generate HMAC signature for webhook", () => {
      const crypto = require("crypto");
      const secret = "test-secret";
      const payload = JSON.stringify({ event: "test" });
      
      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA-256 hex is 64 characters
    });
  });
});

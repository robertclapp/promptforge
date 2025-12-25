import { describe, it, expect } from "vitest";
import {
  getWebhookTemplates,
  getWebhookTemplate,
  formatSlackPayload,
  formatDiscordPayload,
  formatTeamsPayload,
  formatPayloadForService,
  generatePayloadPreview,
  validateWebhookUrl,
  WebhookPayload,
} from "../services/webhookTemplates.service";

describe("Webhook Templates Service", () => {
  describe("getWebhookTemplates", () => {
    it("should return all available templates", () => {
      const templates = getWebhookTemplates();
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThanOrEqual(4);
      
      // Check for expected templates
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain("slack");
      expect(templateIds).toContain("discord");
      expect(templateIds).toContain("teams");
      expect(templateIds).toContain("generic");
    });

    it("should have required fields for each template", () => {
      const templates = getWebhookTemplates();
      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.service).toBeDefined();
        expect(template.headers).toBeDefined();
        expect(template.payloadFormat).toBe("json");
      }
    });
  });

  describe("getWebhookTemplate", () => {
    it("should return a specific template by ID", () => {
      const template = getWebhookTemplate("slack");
      expect(template).not.toBeNull();
      expect(template?.id).toBe("slack");
      expect(template?.name).toBe("Slack");
      expect(template?.service).toBe("slack");
    });

    it("should return null for non-existent template", () => {
      const template = getWebhookTemplate("nonexistent");
      expect(template).toBeNull();
    });
  });

  describe("formatSlackPayload", () => {
    it("should format a success payload for Slack", () => {
      const payload: WebhookPayload = {
        eventType: "export_complete",
        timestamp: new Date("2024-01-15T10:30:00Z"),
        userId: "user-123",
        userName: "John Doe",
        exportId: "export-456",
        exportName: "My Export",
        promptCount: 25,
        fileSize: 1234567,
        fileUrl: "https://example.com/export.json",
        status: "success",
      };

      const result = formatSlackPayload(payload);
      expect(result.text).toContain("Success");
      expect(result.attachments).toBeInstanceOf(Array);
      expect(result.attachments[0].color).toBe("#36a64f");
    });

    it("should format a failure payload for Slack", () => {
      const payload: WebhookPayload = {
        eventType: "export_failed",
        timestamp: new Date(),
        userId: "user-123",
        status: "failed",
        errorMessage: "Export failed due to network error",
      };

      const result = formatSlackPayload(payload);
      expect(result.text).toContain("Failed");
      expect(result.attachments[0].color).toBe("#dc3545");
    });
  });

  describe("formatDiscordPayload", () => {
    it("should format a success payload for Discord", () => {
      const payload: WebhookPayload = {
        eventType: "export_complete",
        timestamp: new Date("2024-01-15T10:30:00Z"),
        userId: "user-123",
        exportName: "My Export",
        promptCount: 25,
        status: "success",
      };

      const result = formatDiscordPayload(payload);
      expect(result.embeds).toBeInstanceOf(Array);
      expect(result.embeds[0].color).toBe(3066993); // Green
      expect(result.embeds[0].title).toContain("My Export");
    });

    it("should include file URL in embed", () => {
      const payload: WebhookPayload = {
        eventType: "export_complete",
        timestamp: new Date(),
        userId: "user-123",
        fileUrl: "https://example.com/export.json",
        status: "success",
      };

      const result = formatDiscordPayload(payload);
      expect(result.embeds[0].url).toBe("https://example.com/export.json");
    });
  });

  describe("formatTeamsPayload", () => {
    it("should format a success payload for Teams", () => {
      const payload: WebhookPayload = {
        eventType: "export_complete",
        timestamp: new Date(),
        userId: "user-123",
        exportName: "My Export",
        promptCount: 25,
        fileSize: 1234567,
        status: "success",
      };

      const result = formatTeamsPayload(payload);
      expect(result["@type"]).toBe("MessageCard");
      expect(result.themeColor).toBe("00FF00");
      expect(result.sections).toBeInstanceOf(Array);
    });

    it("should include download action for file URL", () => {
      const payload: WebhookPayload = {
        eventType: "export_complete",
        timestamp: new Date(),
        userId: "user-123",
        fileUrl: "https://example.com/export.json",
        status: "success",
      };

      const result = formatTeamsPayload(payload);
      expect(result.potentialAction).toBeDefined();
      expect(result.potentialAction[0].name).toBe("Download Export");
    });
  });

  describe("formatPayloadForService", () => {
    const testPayload: WebhookPayload = {
      eventType: "export_complete",
      timestamp: new Date(),
      userId: "user-123",
      exportName: "Test Export",
      status: "success",
    };

    it("should format payload for Slack service", () => {
      const result = formatPayloadForService("slack", testPayload);
      expect(result.text).toBeDefined();
      expect(result.attachments).toBeDefined();
    });

    it("should format payload for Discord service", () => {
      const result = formatPayloadForService("discord", testPayload);
      expect(result.embeds).toBeDefined();
    });

    it("should format payload for Teams service", () => {
      const result = formatPayloadForService("teams", testPayload);
      expect(result["@type"]).toBe("MessageCard");
    });

    it("should format payload for generic service", () => {
      const result = formatPayloadForService("generic", testPayload);
      expect(result.event).toBe("export_complete");
      expect(result.data).toBeDefined();
    });
  });

  describe("generatePayloadPreview", () => {
    it("should generate preview for Slack template", () => {
      const preview = generatePayloadPreview("slack");
      expect(preview.text).toBeDefined();
    });

    it("should generate preview with custom sample data", () => {
      const preview = generatePayloadPreview("discord", {
        exportName: "Custom Export",
        promptCount: 100,
      });
      expect(preview.embeds[0].title).toContain("Custom Export");
    });

    it("should throw error for non-existent template", () => {
      expect(() => generatePayloadPreview("nonexistent")).toThrow("Template not found");
    });
  });

  describe("validateWebhookUrl", () => {
    it("should validate Slack webhook URLs", () => {
      const validResult = validateWebhookUrl("slack", "https://hooks.slack.com/services/T00/B00/XXX");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateWebhookUrl("slack", "https://example.com/webhook");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("hooks.slack.com");
    });

    it("should validate Discord webhook URLs", () => {
      const validResult = validateWebhookUrl("discord", "https://discord.com/api/webhooks/123/abc");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateWebhookUrl("discord", "https://example.com/webhook");
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate Teams webhook URLs", () => {
      const validResult = validateWebhookUrl("teams", "https://outlook.office.com/webhook/xxx");
      expect(validResult.valid).toBe(true);

      const invalidResult = validateWebhookUrl("teams", "https://example.com/webhook");
      expect(invalidResult.valid).toBe(false);
    });

    it("should accept any HTTPS URL for generic template", () => {
      const result = validateWebhookUrl("generic", "https://example.com/webhook");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid URL formats", () => {
      const result = validateWebhookUrl("generic", "not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid URL");
    });

    it("should reject non-HTTPS URLs", () => {
      const result = validateWebhookUrl("generic", "ftp://example.com/webhook");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("HTTP or HTTPS");
    });
  });
});

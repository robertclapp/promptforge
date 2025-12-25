/**
 * Webhook Templates Service
 * Provides pre-configured webhook templates for popular services
 */

export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  service: "slack" | "discord" | "teams" | "generic";
  icon: string;
  defaultUrl: string;
  urlPlaceholder: string;
  headers: Record<string, string>;
  payloadFormat: "json" | "form";
  samplePayload: Record<string, unknown>;
  fieldMappings: FieldMapping[];
  documentation: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: "none" | "uppercase" | "lowercase" | "truncate" | "date" | "filesize";
  truncateLength?: number;
  required: boolean;
}

export interface WebhookPayload {
  eventType: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  exportId?: string;
  exportName?: string;
  promptCount?: number;
  fileSize?: number;
  fileUrl?: string;
  status?: "success" | "failed";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// Pre-defined webhook templates
export const webhookTemplates: WebhookTemplate[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications to a Slack channel via Incoming Webhooks",
    service: "slack",
    icon: "slack",
    defaultUrl: "",
    urlPlaceholder: "https://hooks.slack.com/services/YOUR_TEAM/YOUR_CHANNEL/YOUR_TOKEN",
    headers: {
      "Content-Type": "application/json",
    },
    payloadFormat: "json",
    samplePayload: {
      text: "Export completed successfully",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📦 Export Notification",
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: "*Status:*\nSuccess" },
            { type: "mrkdwn", text: "*Prompts:*\n25" },
          ],
        },
      ],
    },
    fieldMappings: [
      { sourceField: "status", targetField: "text", transform: "none", required: true },
      { sourceField: "promptCount", targetField: "blocks[1].fields[1].text", transform: "none", required: false },
    ],
    documentation: "https://api.slack.com/messaging/webhooks",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send notifications to a Discord channel via Webhooks",
    service: "discord",
    icon: "discord",
    defaultUrl: "",
    urlPlaceholder: "https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    headers: {
      "Content-Type": "application/json",
    },
    payloadFormat: "json",
    samplePayload: {
      content: "Export notification",
      embeds: [
        {
          title: "📦 Export Completed",
          color: 5763719,
          fields: [
            { name: "Status", value: "Success", inline: true },
            { name: "Prompts", value: "25", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    },
    fieldMappings: [
      { sourceField: "exportName", targetField: "embeds[0].title", transform: "none", required: false },
      { sourceField: "status", targetField: "embeds[0].fields[0].value", transform: "uppercase", required: true },
      { sourceField: "promptCount", targetField: "embeds[0].fields[1].value", transform: "none", required: false },
    ],
    documentation: "https://discord.com/developers/docs/resources/webhook",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Send notifications to a Microsoft Teams channel via Incoming Webhooks",
    service: "teams",
    icon: "microsoft",
    defaultUrl: "",
    urlPlaceholder: "https://outlook.office.com/webhook/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX@XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/IncomingWebhook/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    headers: {
      "Content-Type": "application/json",
    },
    payloadFormat: "json",
    samplePayload: {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "0076D7",
      summary: "Export Notification",
      sections: [
        {
          activityTitle: "📦 Export Completed",
          facts: [
            { name: "Status", value: "Success" },
            { name: "Prompts", value: "25" },
            { name: "File Size", value: "1.2 MB" },
          ],
          markdown: true,
        },
      ],
      potentialAction: [
        {
          "@type": "OpenUri",
          name: "Download Export",
          targets: [{ os: "default", uri: "" }],
        },
      ],
    },
    fieldMappings: [
      { sourceField: "exportName", targetField: "sections[0].activityTitle", transform: "none", required: false },
      { sourceField: "status", targetField: "sections[0].facts[0].value", transform: "uppercase", required: true },
      { sourceField: "promptCount", targetField: "sections[0].facts[1].value", transform: "none", required: false },
      { sourceField: "fileSize", targetField: "sections[0].facts[2].value", transform: "filesize", required: false },
      { sourceField: "fileUrl", targetField: "potentialAction[0].targets[0].uri", transform: "none", required: false },
    ],
    documentation: "https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
  },
  {
    id: "generic",
    name: "Generic Webhook",
    description: "Send a standard JSON payload to any webhook endpoint",
    service: "generic",
    icon: "webhook",
    defaultUrl: "",
    urlPlaceholder: "https://your-webhook-endpoint.com/webhook",
    headers: {
      "Content-Type": "application/json",
    },
    payloadFormat: "json",
    samplePayload: {
      event: "export_complete",
      timestamp: new Date().toISOString(),
      data: {
        exportId: "export-123",
        exportName: "My Export",
        status: "success",
        promptCount: 25,
        fileSize: 1234567,
        fileUrl: "https://example.com/export.json",
      },
    },
    fieldMappings: [
      { sourceField: "eventType", targetField: "event", transform: "none", required: true },
      { sourceField: "timestamp", targetField: "timestamp", transform: "date", required: true },
      { sourceField: "exportId", targetField: "data.exportId", transform: "none", required: false },
      { sourceField: "exportName", targetField: "data.exportName", transform: "none", required: false },
      { sourceField: "status", targetField: "data.status", transform: "lowercase", required: true },
      { sourceField: "promptCount", targetField: "data.promptCount", transform: "none", required: false },
      { sourceField: "fileSize", targetField: "data.fileSize", transform: "none", required: false },
      { sourceField: "fileUrl", targetField: "data.fileUrl", transform: "none", required: false },
    ],
    documentation: "",
  },
];

/**
 * Get all available webhook templates
 */
export function getWebhookTemplates(): WebhookTemplate[] {
  return webhookTemplates;
}

/**
 * Get a specific webhook template by ID
 */
export function getWebhookTemplate(templateId: string): WebhookTemplate | null {
  return webhookTemplates.find((t) => t.id === templateId) || null;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Apply transformation to a value
 */
function applyTransform(value: unknown, transform: FieldMapping["transform"], truncateLength?: number): unknown {
  if (value === null || value === undefined) return value;

  switch (transform) {
    case "uppercase":
      return String(value).toUpperCase();
    case "lowercase":
      return String(value).toLowerCase();
    case "truncate":
      const str = String(value);
      const len = truncateLength || 100;
      return str.length > len ? str.substring(0, len) + "..." : str;
    case "date":
      return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
    case "filesize":
      return formatFileSize(Number(value));
    default:
      return value;
  }
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const isNextArray = /^\d+$/.test(nextPart);

    if (!(part in current)) {
      current[part] = isNextArray ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Get a nested value from an object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Format a webhook payload using a template
 */
export function formatWebhookPayload(
  templateId: string,
  payload: WebhookPayload,
  customMappings?: FieldMapping[]
): Record<string, unknown> {
  const template = getWebhookTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Deep clone the sample payload as the base
  const result = JSON.parse(JSON.stringify(template.samplePayload));

  // Use custom mappings if provided, otherwise use template defaults
  const mappings = customMappings || template.fieldMappings;

  // Apply field mappings
  for (const mapping of mappings) {
    const sourceValue = getNestedValue(payload as unknown as Record<string, unknown>, mapping.sourceField);
    
    if (sourceValue !== undefined) {
      const transformedValue = applyTransform(sourceValue, mapping.transform, mapping.truncateLength);
      setNestedValue(result, mapping.targetField, transformedValue);
    }
  }

  return result;
}

/**
 * Format Slack-specific payload
 */
export function formatSlackPayload(payload: WebhookPayload): Record<string, unknown> {
  const statusEmoji = payload.status === "success" ? "✅" : "❌";
  const statusText = payload.status === "success" ? "Success" : "Failed";
  const color = payload.status === "success" ? "#36a64f" : "#dc3545";

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📦 Export ${statusText}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Status:*\n${statusEmoji} ${statusText}`,
        },
        {
          type: "mrkdwn",
          text: `*Event:*\n${payload.eventType}`,
        },
      ],
    },
  ];

  if (payload.exportName) {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Export Name:*\n${payload.exportName}`,
        },
        {
          type: "mrkdwn",
          text: `*Prompts:*\n${payload.promptCount || 0}`,
        },
      ],
    });
  }

  if (payload.fileSize) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*File Size:* ${formatFileSize(payload.fileSize)}`,
      },
    });
  }

  if (payload.fileUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Download Export",
            emoji: true,
          },
          url: payload.fileUrl,
          style: "primary",
        },
      ],
    });
  }

  if (payload.errorMessage) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:*\n\`\`\`${payload.errorMessage}\`\`\``,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Sent from PromptForge • ${new Date(payload.timestamp).toLocaleString()}`,
      },
    ],
  });

  return {
    text: `Export ${statusText}: ${payload.exportName || "Unknown"}`,
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

/**
 * Format Discord-specific payload
 */
export function formatDiscordPayload(payload: WebhookPayload): Record<string, unknown> {
  const statusText = payload.status === "success" ? "Success" : "Failed";
  const color = payload.status === "success" ? 3066993 : 15158332; // Green or Red

  const fields: { name: string; value: string; inline: boolean }[] = [
    {
      name: "Status",
      value: `${payload.status === "success" ? "✅" : "❌"} ${statusText}`,
      inline: true,
    },
    {
      name: "Event",
      value: payload.eventType,
      inline: true,
    },
  ];

  if (payload.promptCount !== undefined) {
    fields.push({
      name: "Prompts",
      value: String(payload.promptCount),
      inline: true,
    });
  }

  if (payload.fileSize) {
    fields.push({
      name: "File Size",
      value: formatFileSize(payload.fileSize),
      inline: true,
    });
  }

  if (payload.errorMessage) {
    fields.push({
      name: "Error",
      value: `\`\`\`${payload.errorMessage}\`\`\``,
      inline: false,
    });
  }

  const embed: Record<string, unknown> = {
    title: `📦 ${payload.exportName || "Export"} - ${statusText}`,
    color,
    fields,
    timestamp: payload.timestamp.toISOString(),
    footer: {
      text: "PromptForge",
    },
  };

  if (payload.fileUrl) {
    embed.url = payload.fileUrl;
  }

  return {
    content: null,
    embeds: [embed],
  };
}

/**
 * Format Microsoft Teams-specific payload
 */
export function formatTeamsPayload(payload: WebhookPayload): Record<string, unknown> {
  const statusText = payload.status === "success" ? "Success" : "Failed";
  const themeColor = payload.status === "success" ? "00FF00" : "FF0000";

  const facts: { name: string; value: string }[] = [
    { name: "Status", value: `${payload.status === "success" ? "✅" : "❌"} ${statusText}` },
    { name: "Event", value: payload.eventType },
  ];

  if (payload.promptCount !== undefined) {
    facts.push({ name: "Prompts", value: String(payload.promptCount) });
  }

  if (payload.fileSize) {
    facts.push({ name: "File Size", value: formatFileSize(payload.fileSize) });
  }

  if (payload.userName) {
    facts.push({ name: "User", value: payload.userName });
  }

  const sections: unknown[] = [
    {
      activityTitle: `📦 ${payload.exportName || "Export"} - ${statusText}`,
      facts,
      markdown: true,
    },
  ];

  if (payload.errorMessage) {
    sections.push({
      text: `**Error:** ${payload.errorMessage}`,
      markdown: true,
    });
  }

  const potentialAction: unknown[] = [];

  if (payload.fileUrl) {
    potentialAction.push({
      "@type": "OpenUri",
      name: "Download Export",
      targets: [{ os: "default", uri: payload.fileUrl }],
    });
  }

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor,
    summary: `Export ${statusText}: ${payload.exportName || "Unknown"}`,
    sections,
    potentialAction: potentialAction.length > 0 ? potentialAction : undefined,
  };
}

/**
 * Format payload based on template service type
 */
export function formatPayloadForService(
  service: WebhookTemplate["service"],
  payload: WebhookPayload
): Record<string, unknown> {
  switch (service) {
    case "slack":
      return formatSlackPayload(payload);
    case "discord":
      return formatDiscordPayload(payload);
    case "teams":
      return formatTeamsPayload(payload);
    case "generic":
    default:
      return {
        event: payload.eventType,
        timestamp: payload.timestamp.toISOString(),
        data: {
          exportId: payload.exportId,
          exportName: payload.exportName,
          status: payload.status,
          promptCount: payload.promptCount,
          fileSize: payload.fileSize,
          fileUrl: payload.fileUrl,
          errorMessage: payload.errorMessage,
          userId: payload.userId,
          userName: payload.userName,
          metadata: payload.metadata,
        },
      };
  }
}

/**
 * Generate a preview of the webhook payload
 */
export function generatePayloadPreview(
  templateId: string,
  sampleData?: Partial<WebhookPayload>
): Record<string, unknown> {
  const template = getWebhookTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const defaultPayload: WebhookPayload = {
    eventType: "export_complete",
    timestamp: new Date(),
    userId: "user-123",
    userName: "John Doe",
    exportId: "export-456",
    exportName: "My Prompts Export",
    promptCount: 25,
    fileSize: 1234567,
    fileUrl: "https://example.com/exports/my-export.json",
    status: "success",
    ...sampleData,
  };

  return formatPayloadForService(template.service, defaultPayload);
}

/**
 * Validate a webhook URL for a specific template
 */
export function validateWebhookUrl(templateId: string, url: string): { valid: boolean; error?: string } {
  const template = getWebhookTemplate(templateId);
  if (!template) {
    return { valid: false, error: "Template not found" };
  }

  try {
    const parsedUrl = new URL(url);

    // Basic URL validation
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    // Service-specific validation
    switch (template.service) {
      case "slack":
        if (!url.includes("hooks.slack.com")) {
          return { valid: false, error: "Slack webhook URLs must be from hooks.slack.com" };
        }
        break;
      case "discord":
        if (!url.includes("discord.com/api/webhooks")) {
          return { valid: false, error: "Discord webhook URLs must be from discord.com/api/webhooks" };
        }
        break;
      case "teams":
        if (!url.includes("outlook.office.com/webhook") && !url.includes("outlook.office365.com/webhook")) {
          return { valid: false, error: "Teams webhook URLs must be from outlook.office.com or outlook.office365.com" };
        }
        break;
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

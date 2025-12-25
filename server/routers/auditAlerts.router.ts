/**
 * Audit Alerts Router
 * Manages alert rules and notifications for audit events
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAlertRules,
  getAlertRule,
  getAlertHistory,
  acknowledgeAlert,
  getAlertStats,
  getAlertRuleTemplates,
} from "../services/auditAlerts.service";

export const auditAlertsRouter = router({
  // List all alert rules
  listRules: protectedProcedure.query(async ({ ctx }) => {
    return getAlertRules(ctx.user.id);
  }),

  // Get a specific rule
  getRule: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getAlertRule(input.ruleId, ctx.user.id);
    }),

  // Create a new alert rule
  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        triggerOnActions: z.array(z.string()).min(1),
        triggerOnResourceTypes: z.array(z.string()).optional(),
        triggerOnStatus: z.array(z.string()).optional(),
        thresholdCount: z.number().min(1).max(100).default(1),
        thresholdWindowMinutes: z.number().min(1).max(1440).default(60),
        triggerOnUnknownIp: z.boolean().default(false),
        allowedIps: z.array(z.string()).optional(),
        notifyEmail: z.boolean().default(true),
        notifyWebhook: z.boolean().default(false),
        webhookUrl: z.string().url().optional(),
        webhookSecret: z.string().max(255).optional(),
        cooldownMinutes: z.number().min(1).max(1440).default(15),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createAlertRule({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Update an alert rule
  updateRule: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).nullable().optional(),
        triggerOnActions: z.array(z.string()).min(1).optional(),
        triggerOnResourceTypes: z.array(z.string()).nullable().optional(),
        triggerOnStatus: z.array(z.string()).nullable().optional(),
        thresholdCount: z.number().min(1).max(100).optional(),
        thresholdWindowMinutes: z.number().min(1).max(1440).optional(),
        triggerOnUnknownIp: z.boolean().optional(),
        allowedIps: z.array(z.string()).nullable().optional(),
        notifyEmail: z.boolean().optional(),
        notifyWebhook: z.boolean().optional(),
        webhookUrl: z.string().url().nullable().optional(),
        webhookSecret: z.string().max(255).nullable().optional(),
        isActive: z.boolean().optional(),
        cooldownMinutes: z.number().min(1).max(1440).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ruleId, ...updates } = input;
      return updateAlertRule(ruleId, ctx.user.id, updates);
    }),

  // Delete an alert rule
  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteAlertRule(input.ruleId, ctx.user.id);
    }),

  // Get alert history
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        ruleId: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        acknowledged: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getAlertHistory(ctx.user.id, input);
    }),

  // Acknowledge an alert
  acknowledge: protectedProcedure
    .input(
      z.object({
        alertId: z.string(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return acknowledgeAlert(input.alertId, ctx.user.id, input.note);
    }),

  // Get alert statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return getAlertStats(ctx.user.id);
  }),

  // Get predefined alert rule templates
  getTemplates: protectedProcedure.query(async () => {
    return getAlertRuleTemplates();
  }),

  // Create rule from template
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        name: z.string().min(1).max(255).optional(),
        notifyEmail: z.boolean().default(true),
        notifyWebhook: z.boolean().default(false),
        webhookUrl: z.string().url().optional(),
        webhookSecret: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const templates = getAlertRuleTemplates();
      const template = templates.find((t) => t.id === input.templateId);

      if (!template) {
        throw new Error("Template not found");
      }

      return createAlertRule({
        userId: ctx.user.id,
        name: input.name || template.name,
        description: template.description,
        triggerOnActions: template.config.triggerOnActions || [],
        triggerOnResourceTypes: template.config.triggerOnResourceTypes || undefined,
        triggerOnStatus: template.config.triggerOnStatus || undefined,
        thresholdCount: template.config.thresholdCount,
        thresholdWindowMinutes: template.config.thresholdWindowMinutes,
        triggerOnUnknownIp: template.config.triggerOnUnknownIp,
        allowedIps: template.config.allowedIps || undefined,
        notifyEmail: input.notifyEmail,
        notifyWebhook: input.notifyWebhook,
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        cooldownMinutes: template.config.cooldownMinutes,
      });
    }),
});

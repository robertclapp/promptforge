import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recordLoginActivity,
  getLoginHistory,
  getUserKnownDevices,
  getUserKnownLocations,
  removeKnownDevice,
  removeKnownLocation,
  updateNotificationSettings,
  getLoginStats,
} from "../services/loginActivity.service";
import { getDb } from "../db";
import { loginNotificationSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const loginActivityRouter = router({
  /**
   * Get login history for the current user
   */
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getLoginHistory(ctx.user.id, input?.limit || 50);
    }),

  /**
   * Get known devices for the current user
   */
  getKnownDevices: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserKnownDevices(ctx.user.id);
    }),

  /**
   * Get known locations for the current user
   */
  getKnownLocations: protectedProcedure
    .query(async ({ ctx }) => {
      return getUserKnownLocations(ctx.user.id);
    }),

  /**
   * Remove a known device
   */
  removeDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return removeKnownDevice(ctx.user.id, input.deviceId);
    }),

  /**
   * Remove a known location
   */
  removeLocation: protectedProcedure
    .input(z.object({
      locationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return removeKnownLocation(ctx.user.id, input.locationId);
    }),

  /**
   * Get notification settings
   */
  getNotificationSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const [settings] = await db
        .select()
        .from(loginNotificationSettings)
        .where(eq(loginNotificationSettings.userId, ctx.user.id))
        .limit(1);

      return settings || {
        notifyNewDevice: true,
        notifyNewLocation: true,
        notifyFailedLogin: true,
        notifySuspiciousActivity: true,
        emailNotifications: true,
        failedLoginThreshold: 3,
      };
    }),

  /**
   * Update notification settings
   */
  updateNotificationSettings: protectedProcedure
    .input(z.object({
      notifyNewDevice: z.boolean().optional(),
      notifyNewLocation: z.boolean().optional(),
      notifyFailedLogin: z.boolean().optional(),
      notifySuspiciousActivity: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      failedLoginThreshold: z.number().min(1).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateNotificationSettings(ctx.user.id, input);
      return { success: true };
    }),

  /**
   * Get login statistics
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      return getLoginStats(ctx.user.id);
    }),

  /**
   * Record a login activity (internal use)
   */
  recordActivity: protectedProcedure
    .input(z.object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      countryCode: z.string().optional(),
      loginStatus: z.enum(["success", "failed", "blocked"]).optional(),
      failureReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return recordLoginActivity(ctx.user.id, input);
    }),
});

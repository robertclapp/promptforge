import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as twoFactorService from "../services/twoFactor.service";
import { logResourceOperation } from "../services/audit.service";
import { TRPCError } from "@trpc/server";

export const twoFactorRouter = router({
  /**
   * Get 2FA status for current user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return twoFactorService.get2FAStatus(ctx.user.id);
  }),

  /**
   * Generate a new TOTP secret and QR code
   */
  generateSecret: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await twoFactorService.generateSecret(ctx.user.id);
    
    // Don't log the secret, just the action
    await logResourceOperation({
      userId: ctx.user.id,
      userName: ctx.user.name || undefined,
      userEmail: ctx.user.email || undefined,
      organizationId: ctx.activeTeamId || undefined,
      eventType: "settings_changed",
      resourceType: "2fa",
      resourceId: ctx.user.id,
      resourceName: "Two-Factor Authentication",
      status: "success",
      details: { action: "secret_generated" },
    });

    return {
      qrCodeUrl: result.qrCodeUrl,
      manualEntryKey: result.manualEntryKey,
    };
  }),

  /**
   * Verify TOTP code and enable 2FA
   */
  verifyAndEnable: protectedProcedure
    .input(z.object({
      code: z.string().length(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await twoFactorService.verifyAndEnable(ctx.user.id, input.code);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: result.success ? "settings_changed" : "login_failed",
        resourceType: "2fa",
        resourceId: ctx.user.id,
        resourceName: "Two-Factor Authentication",
        status: result.success ? "success" : "failure",
        details: { 
          action: "enable_2fa",
          success: result.success,
        },
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to enable 2FA",
        });
      }

      return {
        success: true,
        backupCodes: result.backupCodes,
      };
    }),

  /**
   * Verify a TOTP code (for login or sensitive operations)
   */
  verify: protectedProcedure
    .input(z.object({
      code: z.string().min(6).max(16), // Allow backup codes too
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await twoFactorService.verifyCode(ctx.user.id, input.code);

      if (!result.success) {
        await logResourceOperation({
          userId: ctx.user.id,
          userName: ctx.user.name || undefined,
          userEmail: ctx.user.email || undefined,
          organizationId: ctx.activeTeamId || undefined,
          eventType: "login_failed",
          resourceType: "2fa",
          resourceId: ctx.user.id,
          resourceName: "Two-Factor Authentication",
          status: "failure",
          details: { action: "verify_code" },
        });

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.error || "Invalid verification code",
        });
      }

      return { success: true };
    }),

  /**
   * Disable 2FA
   */
  disable: protectedProcedure
    .input(z.object({
      code: z.string().min(6).max(16),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await twoFactorService.disable2FA(ctx.user.id, input.code);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: "settings_changed",
        resourceType: "2fa",
        resourceId: ctx.user.id,
        resourceName: "Two-Factor Authentication",
        status: result.success ? "success" : "failure",
        details: { action: "disable_2fa" },
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to disable 2FA",
        });
      }

      return { success: true };
    }),

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: protectedProcedure
    .input(z.object({
      code: z.string().min(6).max(16),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await twoFactorService.regenerateBackupCodes(ctx.user.id, input.code);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: "settings_changed",
        resourceType: "2fa",
        resourceId: ctx.user.id,
        resourceName: "Two-Factor Authentication",
        status: result.success ? "success" : "failure",
        details: { action: "regenerate_backup_codes" },
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to regenerate backup codes",
        });
      }

      return {
        success: true,
        backupCodes: result.backupCodes,
      };
    }),

  /**
   * Get trusted devices
   */
  getTrustedDevices: protectedProcedure.query(async ({ ctx }) => {
    return twoFactorService.getTrustedDevices(ctx.user.id);
  }),

  /**
   * Remove a trusted device
   */
  removeTrustedDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await twoFactorService.removeTrustedDevice(ctx.user.id, input.deviceId);

      await logResourceOperation({
        userId: ctx.user.id,
        userName: ctx.user.name || undefined,
        userEmail: ctx.user.email || undefined,
        organizationId: ctx.activeTeamId || undefined,
        eventType: "settings_changed",
        resourceType: "trusted_device",
        resourceId: input.deviceId,
        resourceName: "Trusted Device",
        status: "success",
        details: { action: "remove_device" },
      });

      return { success: true };
    }),

  /**
   * Remove all trusted devices
   */
  removeAllTrustedDevices: protectedProcedure.mutation(async ({ ctx }) => {
    await twoFactorService.removeAllTrustedDevices(ctx.user.id);

    await logResourceOperation({
      userId: ctx.user.id,
      userName: ctx.user.name || undefined,
      userEmail: ctx.user.email || undefined,
      organizationId: ctx.activeTeamId || undefined,
      eventType: "settings_changed",
      resourceType: "trusted_device",
      resourceId: ctx.user.id,
      resourceName: "All Trusted Devices",
      status: "success",
      details: { action: "remove_all_devices" },
    });

    return { success: true };
  }),
});

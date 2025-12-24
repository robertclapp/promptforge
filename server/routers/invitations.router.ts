import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createInvitation,
  getOrganizationInvitations,
  revokeInvitation,
  validateInvitation,
  acceptInvitation,
  sendInvitationEmail,
} from "../services/invitation.service";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Invitations Router
 * Handles team invitation creation, validation, and acceptance
 */
export const invitationsRouter = router({
  /**
   * Create and send a team invitation
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email(),
        role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has permission to invite (must be owner or admin)
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      // TODO: Check if user is owner/admin of the organization

      // Create invitation
      const invitation = await createInvitation({
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.id,
      });

      // Send invitation email
      await sendInvitationEmail({
        email: input.email,
        token: invitation.token,
        organizationName: org.name,
        inviterName: ctx.user.name || ctx.user.email || "Someone",
        role: input.role,
      });

      return {
        success: true,
        invitationId: invitation.id,
      };
    }),

  /**
   * List invitations for an organization
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const invitations = await getOrganizationInvitations(input.organizationId);
      return invitations;
    }),

  /**
   * Revoke an invitation
   */
  revoke: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ input }) => {
      await revokeInvitation(input.invitationId);
      return { success: true };
    }),

  /**
   * Validate an invitation token (public endpoint)
   */
  validate: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const validation = await validateInvitation(input.token);
      return validation;
    }),

  /**
   * Accept an invitation
   */
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await acceptInvitation({
        token: input.token,
        userId: ctx.user.id,
      });

      return result;
    }),
});

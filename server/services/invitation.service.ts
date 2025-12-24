import { getDb } from "../db";
import { teamInvitations, organizationMemberships } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { notifyOwner } from "../_core/notification";
import { sendInvitationEmail as sendEmail } from "../_core/email";

/**
 * Team Invitation Service
 * Handles creation, validation, and acceptance of team invitations
 */

export interface CreateInvitationParams {
  organizationId: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  invitedBy: string;
}

export interface AcceptInvitationParams {
  token: string;
  userId: string;
}

/**
 * Generate a secure random token for invitation
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new team invitation
 */
export async function createInvitation(params: CreateInvitationParams) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const invitationId = `inv_${Date.now()}_${randomBytes(8).toString("hex")}`;

  await db.insert(teamInvitations).values({
    id: invitationId,
    organizationId: params.organizationId,
    email: params.email,
    token,
    role: params.role,
    invitedBy: params.invitedBy,
    status: "pending",
    expiresAt,
  });

  return {
    id: invitationId,
    token,
    expiresAt,
  };
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [invitation] = await db
    .select()
    .from(teamInvitations)
    .where(eq(teamInvitations.token, token))
    .limit(1);

  return invitation || null;
}

/**
 * Validate invitation token
 */
export async function validateInvitation(token: string): Promise<{
  valid: boolean;
  invitation?: typeof teamInvitations.$inferSelect;
  error?: string;
}> {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: "Invitation not found" };
  }

  if (invitation.status !== "pending") {
    return { valid: false, error: `Invitation is ${invitation.status}` };
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    // Mark as expired
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .update(teamInvitations)
      .set({ status: "expired" })
      .where(eq(teamInvitations.id, invitation.id));

    return { valid: false, error: "Invitation has expired" };
  }

  return { valid: true, invitation };
}

/**
 * Accept an invitation and add user to team
 */
export async function acceptInvitation(params: AcceptInvitationParams) {
  const validation = await validateInvitation(params.token);

  if (!validation.valid || !validation.invitation) {
    throw new Error(validation.error || "Invalid invitation");
  }

  const invitation = validation.invitation;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user is already a member
  const [existingMembership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, params.userId),
        eq(organizationMemberships.organizationId, invitation.organizationId)
      )
    )
    .limit(1);

  if (existingMembership) {
    throw new Error("User is already a member of this team");
  }

  // Create membership
  const membershipId = `mem_${Date.now()}_${randomBytes(8).toString("hex")}`;
  await db.insert(organizationMemberships).values({
    id: membershipId,
    userId: params.userId,
    organizationId: invitation.organizationId,
    role: invitation.role,
    isActive: true,
  });

  // Mark invitation as accepted
  await db
    .update(teamInvitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(teamInvitations.id, invitation.id));

  // Notify owner
  await notifyOwner({
    title: "New Team Member",
    content: `${invitation.email} has joined your team with ${invitation.role} role.`,
  });

  return {
    success: true,
    membershipId,
    organizationId: invitation.organizationId,
  };
}

/**
 * List invitations for an organization
 */
export async function getOrganizationInvitations(organizationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const invitations = await db
    .select()
    .from(teamInvitations)
    .where(eq(teamInvitations.organizationId, organizationId))
    .orderBy(teamInvitations.createdAt);

  return invitations;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(teamInvitations)
    .set({ status: "revoked" })
    .where(eq(teamInvitations.id, invitationId));

  return { success: true };
}

/**
 * Send invitation email using SendGrid
 */
export async function sendInvitationEmail(params: {
  email: string;
  token: string;
  organizationName: string;
  inviterName: string;
  role: string;
}) {
  const success = await sendEmail(
    params.email,
    params.organizationName,
    params.inviterName,
    params.token,
    params.role
  );

  const inviteUrl = `${process.env.VITE_APP_URL || "http://localhost:3000"}/accept-invitation?token=${params.token}`;

  return {
    success,
    inviteUrl,
  };
}

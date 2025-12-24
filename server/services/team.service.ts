import { getDb } from "../db";
import { organizations, organizationMemberships, type Organization, type OrganizationMembership } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

/**
 * Create a new team (organization)
 */
export async function createTeam(
  name: string,
  slug: string,
  ownerId: string,
  description?: string
): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const teamId = `team_${nanoid()}`;

  // Create organization
  await db.insert(organizations).values({
    id: teamId,
    name,
    slug,
    description: description || null,
    ownerId,
    subscriptionTier: "free",
    isActive: true,
  });

  // Add owner as member
  await db.insert(organizationMemberships).values({
    id: `mem_${nanoid()}`,
    userId: ownerId,
    organizationId: teamId,
    role: "owner",
    isActive: true,
  });

  const [team] = await db.select().from(organizations).where(eq(organizations.id, teamId));
  return team;
}

/**
 * Get all teams for a user
 */
export async function getUserTeams(userId: string): Promise<Array<Organization & { role: string }>> {
  const db = await getDb();
  if (!db) return [];

  const memberships = await db
    .select({
      team: organizations,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.isActive, true),
        eq(organizations.isActive, true)
      )
    );

  return memberships.map((m: any) => ({ ...m.team, role: m.role }));
}

/**
 * Get team by ID (with permission check)
 */
export async function getTeam(teamId: string, userId: string): Promise<Organization | null> {
  const db = await getDb();
  if (!db) return null;

  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.isActive, true)
      )
    );

  if (!membership) {
    return null;
  }

  const [team] = await db.select().from(organizations).where(eq(organizations.id, teamId));
  return team || null;
}

/**
 * Update team
 */
export async function updateTeam(
  teamId: string,
  userId: string,
  updates: { name?: string; description?: string; slug?: string }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Check if user has admin or owner role
  const hasPermission = await checkPermission(teamId, userId, ["owner", "admin"]);
  if (!hasPermission) {
    return false;
  }

  await db.update(organizations).set(updates).where(eq(organizations.id, teamId));
  return true;
}

/**
 * Delete team (soft delete)
 */
export async function deleteTeam(teamId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Only owner can delete
  const hasPermission = await checkPermission(teamId, userId, ["owner"]);
  if (!hasPermission) {
    return false;
  }

  await db.update(organizations).set({ isActive: false }).where(eq(organizations.id, teamId));
  return true;
}

/**
 * Add member to team
 */
export async function addTeamMember(
  teamId: string,
  inviterId: string,
  inviteeUserId: string,
  role: "admin" | "member" | "viewer" = "member"
): Promise<OrganizationMembership | null> {
  const db = await getDb();
  if (!db) return null;

  // Check if inviter has permission (owner or admin)
  const hasPermission = await checkPermission(teamId, inviterId, ["owner", "admin"]);
  if (!hasPermission) {
    return null;
  }

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, inviteeUserId)
      )
    );

  if (existing) {
    // Reactivate if inactive
    if (!existing.isActive) {
      await db
        .update(organizationMemberships)
        .set({ isActive: true, role })
        .where(eq(organizationMemberships.id, existing.id));
      return { ...existing, isActive: true, role };
    }
    return existing;
  }

  // Add new member
  const membershipId = `mem_${nanoid()}`;
  await db.insert(organizationMemberships).values({
    id: membershipId,
    userId: inviteeUserId,
    organizationId: teamId,
    role,
    isActive: true,
  });

  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(eq(organizationMemberships.id, membershipId));
  return membership;
}

/**
 * Remove member from team
 */
export async function removeTeamMember(
  teamId: string,
  removerId: string,
  memberUserId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Check if remover has permission (owner or admin)
  const hasPermission = await checkPermission(teamId, removerId, ["owner", "admin"]);
  if (!hasPermission) {
    return false;
  }

  // Cannot remove owner
  const [member] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, memberUserId)
      )
    );

  if (member?.role === "owner") {
    return false;
  }

  await db
    .update(organizationMemberships)
    .set({ isActive: false })
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, memberUserId)
      )
    );

  return true;
}

/**
 * Update member role
 */
export async function updateMemberRole(
  teamId: string,
  updaterId: string,
  memberUserId: string,
  newRole: "admin" | "member" | "viewer"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Only owner can change roles
  const hasPermission = await checkPermission(teamId, updaterId, ["owner"]);
  if (!hasPermission) {
    return false;
  }

  await db
    .update(organizationMemberships)
    .set({ role: newRole })
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, memberUserId)
      )
    );

  return true;
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string, userId: string): Promise<OrganizationMembership[]> {
  const db = await getDb();
  if (!db) return [];

  // Check if user is a member
  const hasAccess = await checkPermission(teamId, userId, ["owner", "admin", "member", "viewer"]);
  if (!hasAccess) {
    return [];
  }

  return await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.isActive, true)
      )
    );
}

/**
 * Check if user has permission (helper)
 */
export async function checkPermission(
  teamId: string,
  userId: string,
  allowedRoles: Array<"owner" | "admin" | "member" | "viewer">
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, teamId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.isActive, true)
      )
    );

  if (!membership) {
    return false;
  }

  return allowedRoles.includes(membership.role as any);
}

/**
 * Get user's current active team (from context or default)
 */
export async function getUserActiveTeam(userId: string): Promise<string | null> {
  // For now, return the first team the user is a member of
  // In production, this would be stored in user preferences or session
  const teams = await getUserTeams(userId);
  return teams.length > 0 ? teams[0].id : null;
}

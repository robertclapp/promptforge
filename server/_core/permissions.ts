import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { organizationMemberships, organizations, workspacePermissionOverrides } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { logPermissionDenied } from "../services/audit.service";

/**
 * User roles in order of privilege (lowest to highest)
 */
export type UserRole = "viewer" | "member" | "admin" | "owner";

/**
 * Permission levels for different operations
 */
export const PERMISSIONS = {
  // Read permissions
  VIEW_PROMPTS: ["viewer", "member", "admin", "owner"],
  VIEW_EVALUATIONS: ["viewer", "member", "admin", "owner"],
  VIEW_ANALYTICS: ["viewer", "member", "admin", "owner"],
  VIEW_BUDGETS: ["viewer", "member", "admin", "owner"],
  
  // Write permissions
  CREATE_PROMPTS: ["member", "admin", "owner"],
  EDIT_PROMPTS: ["member", "admin", "owner"],
  DELETE_PROMPTS: ["admin", "owner"],
  
  CREATE_EVALUATIONS: ["member", "admin", "owner"],
  RUN_EVALUATIONS: ["member", "admin", "owner"],
  DELETE_EVALUATIONS: ["admin", "owner"],
  
  CREATE_AI_PROVIDERS: ["member", "admin", "owner"],
  EDIT_AI_PROVIDERS: ["member", "admin", "owner"],
  DELETE_AI_PROVIDERS: ["admin", "owner"],
  
  CREATE_BUDGETS: ["admin", "owner"],
  EDIT_BUDGETS: ["admin", "owner"],
  DELETE_BUDGETS: ["admin", "owner"],
  
  CREATE_CONTEXT_PACKAGES: ["member", "admin", "owner"],
  EDIT_CONTEXT_PACKAGES: ["member", "admin", "owner"],
  DELETE_CONTEXT_PACKAGES: ["admin", "owner"],
  
  CREATE_TEST_SUITES: ["member", "admin", "owner"],
  RUN_TEST_SUITES: ["member", "admin", "owner"],
  DELETE_TEST_SUITES: ["admin", "owner"],
  
  CREATE_OPTIMIZATIONS: ["member", "admin", "owner"],
  
  PUBLISH_TEMPLATES: ["member", "admin", "owner"],
  UNPUBLISH_TEMPLATES: ["member", "admin", "owner"],
  
  // Team management
  INVITE_MEMBERS: ["admin", "owner"],
  REMOVE_MEMBERS: ["admin", "owner"],
  CHANGE_MEMBER_ROLES: ["owner"],
  
  // Billing
  MANAGE_BILLING: ["owner"],
  VIEW_BILLING: ["admin", "owner"],
  
  // API Keys
  CREATE_API_KEYS: ["admin", "owner"],
  DELETE_API_KEYS: ["admin", "owner"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Get user's role in a workspace
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<UserRole | null> {
  const db = await getDb();
  if (!db) return null;

  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.isActive, true)
      )
    )
    .limit(1);

  return membership?.role as UserRole || null;
}

/**
 * Get organization name by ID
 */
async function getOrganizationName(organizationId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org?.name || null;
}

/**
 * Get permission override for a specific role and permission in a workspace
 */
async function getPermissionOverride(
  organizationId: string,
  role: "viewer" | "member" | "admin",
  permission: string
): Promise<boolean | null> {
  const db = await getDb();
  if (!db) return null;

  const [override] = await db
    .select()
    .from(workspacePermissionOverrides)
    .where(
      and(
        eq(workspacePermissionOverrides.organizationId, organizationId),
        eq(workspacePermissionOverrides.role, role),
        eq(workspacePermissionOverrides.permission, permission)
      )
    )
    .limit(1);

  return override ? override.granted : null;
}

/**
 * Check if user has a specific permission
 * Now considers workspace-level permission overrides
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRole(userId, organizationId);
  if (!role) return false;

  // Owner always has all permissions (cannot be overridden)
  if (role === "owner") {
    return true;
  }

  // Check for workspace-level override
  const override = await getPermissionOverride(
    organizationId,
    role as "viewer" | "member" | "admin",
    permission
  );

  if (override !== null) {
    return override;
  }

  // Use default permission
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Context for permission checks (optional metadata for audit logging)
 */
export interface PermissionContext {
  userName?: string;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Require a specific permission or throw an error
 * Automatically logs permission denied events to audit log
 */
export async function requirePermission(
  userId: string,
  organizationId: string | null | undefined,
  permission: Permission,
  context?: PermissionContext
): Promise<void> {
  if (!organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No workspace selected",
    });
  }

  const allowed = await hasPermission(userId, organizationId, permission);
  
  if (!allowed) {
    const role = await getUserRole(userId, organizationId);
    const orgName = await getOrganizationName(organizationId);
    
    // Log permission denied event to audit log
    try {
      await logPermissionDenied({
        userId,
        userName: context?.userName,
        userEmail: context?.userEmail,
        userRole: role || undefined,
        organizationId,
        organizationName: orgName || undefined,
        requiredPermission: permission,
        resourceType: context?.resourceType,
        resourceId: context?.resourceId,
        resourceName: context?.resourceName,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error("Failed to log permission denied event:", error);
    }
    
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to perform this action. Required permission: ${permission}. Your role: ${role || "none"}`,
    });
  }
}

/**
 * Check if user is at least a specific role
 */
export function isAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = ["viewer", "member", "admin", "owner"];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

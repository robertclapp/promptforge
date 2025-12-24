import { getDb } from "../db";
import { 
  workspacePermissionOverrides, 
  type InsertWorkspacePermissionOverride,
  type WorkspacePermissionOverride 
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { PERMISSIONS, type Permission, type UserRole } from "../_core/permissions";

/**
 * Get all permission overrides for a workspace
 */
export async function getWorkspacePermissionOverrides(
  organizationId: string
): Promise<WorkspacePermissionOverride[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(workspacePermissionOverrides)
    .where(eq(workspacePermissionOverrides.organizationId, organizationId));
}

/**
 * Get permission overrides for a specific role in a workspace
 */
export async function getRolePermissionOverrides(
  organizationId: string,
  role: "viewer" | "member" | "admin"
): Promise<WorkspacePermissionOverride[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(workspacePermissionOverrides)
    .where(
      and(
        eq(workspacePermissionOverrides.organizationId, organizationId),
        eq(workspacePermissionOverrides.role, role)
      )
    );
}

/**
 * Check if a permission is overridden for a role in a workspace
 */
export async function getPermissionOverride(
  organizationId: string,
  role: "viewer" | "member" | "admin",
  permission: string
): Promise<boolean | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
 * Set a permission override for a role in a workspace
 */
export async function setPermissionOverride(
  organizationId: string,
  role: "viewer" | "member" | "admin",
  permission: string,
  granted: boolean,
  userId: string
): Promise<WorkspacePermissionOverride> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if override already exists
  const [existing] = await db
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

  if (existing) {
    // Update existing override
    await db
      .update(workspacePermissionOverrides)
      .set({
        granted,
        updatedBy: userId,
      })
      .where(eq(workspacePermissionOverrides.id, existing.id));

    return { ...existing, granted, updatedBy: userId };
  } else {
    // Create new override
    const id = uuidv4();
    const newOverride: InsertWorkspacePermissionOverride = {
      id,
      organizationId,
      role,
      permission,
      granted,
      createdBy: userId,
    };

    await db.insert(workspacePermissionOverrides).values(newOverride);

    return {
      ...newOverride,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as WorkspacePermissionOverride;
  }
}

/**
 * Remove a permission override
 */
export async function removePermissionOverride(
  organizationId: string,
  role: "viewer" | "member" | "admin",
  permission: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(workspacePermissionOverrides)
    .where(
      and(
        eq(workspacePermissionOverrides.organizationId, organizationId),
        eq(workspacePermissionOverrides.role, role),
        eq(workspacePermissionOverrides.permission, permission)
      )
    );

  return true;
}

/**
 * Remove all permission overrides for a workspace
 */
export async function clearWorkspacePermissionOverrides(
  organizationId: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(workspacePermissionOverrides)
    .where(eq(workspacePermissionOverrides.organizationId, organizationId));
}

/**
 * Get effective permissions for a role in a workspace
 * Combines default permissions with workspace overrides
 */
export async function getEffectivePermissions(
  organizationId: string,
  role: UserRole
): Promise<Record<Permission, boolean>> {
  const overrides = await getWorkspacePermissionOverrides(organizationId);
  
  // Build override map for this role
  const overrideMap = new Map<string, boolean>();
  overrides
    .filter((o) => o.role === role)
    .forEach((o) => overrideMap.set(o.permission, o.granted));

  // Calculate effective permissions
  const effectivePermissions: Record<string, boolean> = {};
  
  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    // Check if there's an override
    if (overrideMap.has(permission)) {
      effectivePermissions[permission] = overrideMap.get(permission)!;
    } else {
      // Use default permission
      effectivePermissions[permission] = (allowedRoles as readonly string[]).includes(role);
    }
  }

  return effectivePermissions as Record<Permission, boolean>;
}

/**
 * Check if a user has a permission considering workspace overrides
 */
export async function hasPermissionWithOverrides(
  organizationId: string,
  role: UserRole,
  permission: Permission
): Promise<boolean> {
  // Owner always has all permissions (cannot be overridden)
  if (role === "owner") {
    return true;
  }

  // Check for override
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
 * Get all available permissions with their default roles
 */
export function getAllPermissions(): Array<{
  permission: Permission;
  defaultRoles: readonly string[];
  category: string;
  description: string;
}> {
  return [
    // Read permissions
    { permission: "VIEW_PROMPTS", defaultRoles: PERMISSIONS.VIEW_PROMPTS, category: "Read", description: "View prompts" },
    { permission: "VIEW_EVALUATIONS", defaultRoles: PERMISSIONS.VIEW_EVALUATIONS, category: "Read", description: "View evaluations" },
    { permission: "VIEW_ANALYTICS", defaultRoles: PERMISSIONS.VIEW_ANALYTICS, category: "Read", description: "View analytics" },
    { permission: "VIEW_BUDGETS", defaultRoles: PERMISSIONS.VIEW_BUDGETS, category: "Read", description: "View budgets" },
    
    // Prompt permissions
    { permission: "CREATE_PROMPTS", defaultRoles: PERMISSIONS.CREATE_PROMPTS, category: "Prompts", description: "Create prompts" },
    { permission: "EDIT_PROMPTS", defaultRoles: PERMISSIONS.EDIT_PROMPTS, category: "Prompts", description: "Edit prompts" },
    { permission: "DELETE_PROMPTS", defaultRoles: PERMISSIONS.DELETE_PROMPTS, category: "Prompts", description: "Delete prompts" },
    
    // Evaluation permissions
    { permission: "CREATE_EVALUATIONS", defaultRoles: PERMISSIONS.CREATE_EVALUATIONS, category: "Evaluations", description: "Create evaluations" },
    { permission: "RUN_EVALUATIONS", defaultRoles: PERMISSIONS.RUN_EVALUATIONS, category: "Evaluations", description: "Run evaluations" },
    { permission: "DELETE_EVALUATIONS", defaultRoles: PERMISSIONS.DELETE_EVALUATIONS, category: "Evaluations", description: "Delete evaluations" },
    
    // AI Provider permissions
    { permission: "CREATE_AI_PROVIDERS", defaultRoles: PERMISSIONS.CREATE_AI_PROVIDERS, category: "AI Providers", description: "Create AI providers" },
    { permission: "EDIT_AI_PROVIDERS", defaultRoles: PERMISSIONS.EDIT_AI_PROVIDERS, category: "AI Providers", description: "Edit AI providers" },
    { permission: "DELETE_AI_PROVIDERS", defaultRoles: PERMISSIONS.DELETE_AI_PROVIDERS, category: "AI Providers", description: "Delete AI providers" },
    
    // Budget permissions
    { permission: "CREATE_BUDGETS", defaultRoles: PERMISSIONS.CREATE_BUDGETS, category: "Budgets", description: "Create budgets" },
    { permission: "EDIT_BUDGETS", defaultRoles: PERMISSIONS.EDIT_BUDGETS, category: "Budgets", description: "Edit budgets" },
    { permission: "DELETE_BUDGETS", defaultRoles: PERMISSIONS.DELETE_BUDGETS, category: "Budgets", description: "Delete budgets" },
    
    // Context Package permissions
    { permission: "CREATE_CONTEXT_PACKAGES", defaultRoles: PERMISSIONS.CREATE_CONTEXT_PACKAGES, category: "Context Packages", description: "Create context packages" },
    { permission: "EDIT_CONTEXT_PACKAGES", defaultRoles: PERMISSIONS.EDIT_CONTEXT_PACKAGES, category: "Context Packages", description: "Edit context packages" },
    { permission: "DELETE_CONTEXT_PACKAGES", defaultRoles: PERMISSIONS.DELETE_CONTEXT_PACKAGES, category: "Context Packages", description: "Delete context packages" },
    
    // Test Suite permissions
    { permission: "CREATE_TEST_SUITES", defaultRoles: PERMISSIONS.CREATE_TEST_SUITES, category: "Test Suites", description: "Create test suites" },
    { permission: "RUN_TEST_SUITES", defaultRoles: PERMISSIONS.RUN_TEST_SUITES, category: "Test Suites", description: "Run test suites" },
    { permission: "DELETE_TEST_SUITES", defaultRoles: PERMISSIONS.DELETE_TEST_SUITES, category: "Test Suites", description: "Delete test suites" },
    
    // Optimization permissions
    { permission: "CREATE_OPTIMIZATIONS", defaultRoles: PERMISSIONS.CREATE_OPTIMIZATIONS, category: "Optimizations", description: "Create optimizations" },
    
    // Template permissions
    { permission: "PUBLISH_TEMPLATES", defaultRoles: PERMISSIONS.PUBLISH_TEMPLATES, category: "Templates", description: "Publish templates" },
    { permission: "UNPUBLISH_TEMPLATES", defaultRoles: PERMISSIONS.UNPUBLISH_TEMPLATES, category: "Templates", description: "Unpublish templates" },
    
    // Team management
    { permission: "INVITE_MEMBERS", defaultRoles: PERMISSIONS.INVITE_MEMBERS, category: "Team", description: "Invite members" },
    { permission: "REMOVE_MEMBERS", defaultRoles: PERMISSIONS.REMOVE_MEMBERS, category: "Team", description: "Remove members" },
    { permission: "CHANGE_MEMBER_ROLES", defaultRoles: PERMISSIONS.CHANGE_MEMBER_ROLES, category: "Team", description: "Change member roles" },
    
    // Billing
    { permission: "MANAGE_BILLING", defaultRoles: PERMISSIONS.MANAGE_BILLING, category: "Billing", description: "Manage billing" },
    { permission: "VIEW_BILLING", defaultRoles: PERMISSIONS.VIEW_BILLING, category: "Billing", description: "View billing" },
    
    // API Keys
    { permission: "CREATE_API_KEYS", defaultRoles: PERMISSIONS.CREATE_API_KEYS, category: "API Keys", description: "Create API keys" },
    { permission: "DELETE_API_KEYS", defaultRoles: PERMISSIONS.DELETE_API_KEYS, category: "API Keys", description: "Delete API keys" },
  ];
}

/**
 * Validate that a permission override is allowed
 * Some permissions cannot be granted to lower roles for security
 */
export function isOverrideAllowed(
  role: "viewer" | "member" | "admin",
  permission: Permission,
  granted: boolean
): { allowed: boolean; reason?: string } {
  // Owners cannot have their permissions overridden
  // This function is only for viewer, member, admin
  
  // Cannot grant billing management to non-owners
  if (permission === "MANAGE_BILLING" && granted && role !== "admin") {
    return { allowed: false, reason: "Billing management can only be granted to admins" };
  }
  
  // Cannot grant role change permission to non-owners
  if (permission === "CHANGE_MEMBER_ROLES" && granted) {
    return { allowed: false, reason: "Role change permission is reserved for owners only" };
  }
  
  // Cannot deny view permissions from admins
  if (permission.startsWith("VIEW_") && !granted && role === "admin") {
    return { allowed: false, reason: "Cannot deny view permissions from admins" };
  }
  
  return { allowed: true };
}
